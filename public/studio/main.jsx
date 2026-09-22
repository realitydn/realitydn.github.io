/* ============================================================
   REALITY POSTER STUDIO — bundle entry
   ------------------------------------------------------------
   esbuild follows these imports into ONE script, studio.bundle.js
   (tools/studio-bundle.cjs: built by scripts/build-studios.mjs for
   deploy, bundled per request by tools/serve-studio.cjs locally).
   The modules import what they use from each other; this file only
   fixes the order they run in — the order index.html used to list
   them as separate <script>s — and ends with the app mounting.
   ============================================================ */
import './studio-store.js';
import './cloud-client.js';
import './studio-data.jsx';
import './studio-element.jsx';
import './studio-canvas.jsx';
import './studio-app.jsx';

import { shadowModel, TEMPLATES, TEMPLATE_GROUPS } from './studio-data.jsx';
import { getSample } from './studio-element.jsx';

/* The one shadow model (element family → dx/dy/blur/colour), which the
   element renderer and the Inspector both draw from, stays reachable as
   window.shadowModel. */
window.shadowModel = shadowModel;

/* Test hooks — the studio test suite (scripts/test-studios) reaches these
   by name: the exports suite draws the stand-in photos in a fixed order
   (getSample) and walks the starter library. They were window globals when
   the files were classic scripts; kept as exactly those names. */
Object.assign(window, { getSample, TEMPLATES, TEMPLATE_GROUPS });
