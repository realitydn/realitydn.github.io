const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { processPosters } = require('./process');

const app = express();
const PORT = 4400;

// Paths
const ORIGINALS_DIR = path.join(__dirname, 'originals');
const STATE_FILE = path.join(ORIGINALS_DIR, 'posters.json');
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_EVENTS_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'events');
const EVENTS_CONFIG = path.join(PROJECT_ROOT, 'public', 'events-config.json');

// Ensure directories exist
fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_EVENTS_DIR, { recursive: true });

// Middleware
app.use(express.json());
app.use('/thumbs', express.static(path.join(__dirname, 'thumbs')));

// File upload config
const storage = multer.diskStorage({
  destination: ORIGINALS_DIR,
  filename: (req, file, cb) => {
    // Keep original filename but slugify it
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    cb(null, `${base}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  }
});

// ---- State management ----

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  }
  return { posters: [] };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/** Scan originals dir and sync with saved state */
function syncState() {
  const state = loadState();
  const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif'];

  // Get all image files in originals
  const files = fs.readdirSync(ORIGINALS_DIR)
    .filter(f => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
    .sort();

  // Build a map of existing state entries by filename
  const existing = new Map(state.posters.map(p => [p.file, p]));

  // Collect any new files not already tracked. New posters go to the TOP of the
  // list (most recently added first) so fresh artwork is easy to find and lands
  // at the front of the published carousel. Existing posters keep their order.
  const newEntries = [];
  for (const file of files) {
    if (!existing.has(file)) {
      newEntries.push({
        file,
        alt: '',
        title: '',
        slug: path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-')
      });
    }
  }
  if (newEntries.length) {
    newEntries.sort((a, b) =>
      fs.statSync(path.join(ORIGINALS_DIR, b.file)).mtimeMs -
      fs.statSync(path.join(ORIGINALS_DIR, a.file)).mtimeMs
    );
    state.posters = [...newEntries, ...state.posters];
  }

  // Remove entries whose files no longer exist
  const fileSet = new Set(files);
  state.posters = state.posters.filter(p => fileSet.has(p.file));

  saveState(state);
  return state;
}

// ---- API routes ----

/** List all posters with metadata */
app.get('/api/posters', (req, res) => {
  const state = syncState();
  // Include file sizes for display
  const posters = state.posters.map(p => {
    const filePath = path.join(ORIGINALS_DIR, p.file);
    const stats = fs.statSync(filePath);
    const thumbPath = path.join(__dirname, 'thumbs', `${p.slug}.webp`);
    return {
      ...p,
      size: stats.size,
      hasThumb: fs.existsSync(thumbPath),
      thumbUrl: `/thumbs/${p.slug}.webp`
    };
  });
  res.json({ posters });
});

/** Reorder posters */
app.post('/api/posters/reorder', (req, res) => {
  const { order } = req.body; // array of filenames in new order
  const state = loadState();
  const map = new Map(state.posters.map(p => [p.file, p]));
  state.posters = order.map(f => map.get(f)).filter(Boolean);
  saveState(state);
  res.json({ ok: true });
});

/** Update metadata for a single poster */
app.post('/api/posters/:file/metadata', (req, res) => {
  const { file } = req.params;
  const { alt, title, slug } = req.body;
  const state = loadState();
  const poster = state.posters.find(p => p.file === file);
  if (!poster) return res.status(404).json({ error: 'Poster not found' });
  if (alt !== undefined) poster.alt = alt;
  if (title !== undefined) poster.title = title;
  if (slug !== undefined) poster.slug = slug;
  saveState(state);
  res.json({ ok: true, poster });
});

/** Remove a poster from the list (and optionally delete the file) */
app.delete('/api/posters/:file', (req, res) => {
  const { file } = req.params;
  const deleteFile = req.query.deleteFile === 'true';
  const state = loadState();
  const poster = state.posters.find(p => p.file === file);
  state.posters = state.posters.filter(p => p.file !== file);
  saveState(state);
  // Drop the cached thumbnail too. The thumb is keyed by slug, so a same-name
  // re-add would otherwise reuse this stale file — clearing it keeps delete +
  // re-add fully repopulating, and avoids leaving orphaned thumbs behind.
  if (poster) {
    const thumbPath = path.join(__dirname, 'thumbs', `${poster.slug}.webp`);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  }
  if (deleteFile) {
    const filePath = path.join(ORIGINALS_DIR, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  res.json({ ok: true });
});

/** Upload new poster images */
app.post('/api/posters/upload', (req, res) => {
  const handler = upload.array('posters', 100);
  handler(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    syncState();
    res.json({ ok: true, uploaded: req.files.length });
  });
});

/** Generate thumbnails only (for the UI) */
app.post('/api/generate-thumbs', async (req, res) => {
  try {
    const state = syncState();
    const sharp = require('sharp');
    const thumbDir = path.join(__dirname, 'thumbs');
    fs.mkdirSync(thumbDir, { recursive: true });

    for (const poster of state.posters) {
      const src = path.join(ORIGINALS_DIR, poster.file);
      const dest = path.join(thumbDir, `${poster.slug}.webp`);
      // Rebuild when the thumb is missing OR older than its source. This is what
      // makes re-adding a poster under the same name actually repopulate: the
      // slug (and thumb filename) is unchanged, but the source is newer, so the
      // stale thumb would otherwise be kept forever.
      const stale = !fs.existsSync(dest) ||
        fs.statSync(src).mtimeMs > fs.statSync(dest).mtimeMs;
      if (stale) {
        await sharp(src)
          .resize(300, 375, { fit: 'cover' })
          .webp({ quality: 70 })
          .toFile(dest);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Thumb generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

/** Publish — process all images and write config */
app.post('/api/publish', async (req, res) => {
  try {
    const state = syncState();
    const result = await processPosters({
      posters: state.posters,
      originalsDir: ORIGINALS_DIR,
      outputDir: PUBLIC_EVENTS_DIR,
      configPath: EVENTS_CONFIG
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Publish failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Serve the UI
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`\n  Poster Manager running at http://localhost:${PORT}\n`);
  console.log(`  Drop source images into: ${ORIGINALS_DIR}\n`);
  syncState();
});
