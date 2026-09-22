/* ============================================================
   REALITY PRINT STUDIO — bundle entry
   ------------------------------------------------------------
   esbuild follows these imports into ONE script, print.bundle.js
   (tools/studio-bundle.cjs: built by scripts/build-studios.mjs for
   deploy, bundled per request by tools/serve-print.cjs locally).
   The modules import what they use from each other; this file only
   fixes the order they run in — the order index.html used to list
   them as separate <script>s — and ends with the app mounting.
   ============================================================ */
import './print-store.js';
import './print-data.jsx';
import './print-element.jsx';
import './print-canvas.jsx';
import './print-export.jsx';
import './print-app.jsx';

import { makeElement, TEMPLATES, TEMPLATE_GROUPS, buildTemplate } from './print-data.jsx';
import { ImageControls, IMG_TREATS, IMG_TREAT_PRESETS } from './print-app.jsx';

/* Test hooks — the studio test suite (scripts/test-studios) reaches these
   by name: the exports suite reads the starter library and builds each
   template to learn what its QR codes should say; the smoke suite renders
   the photo inspector for every treatment. They were window globals when
   the files were classic scripts; kept as exactly those names. */
Object.assign(window, {
  makeElement, TEMPLATES, TEMPLATE_GROUPS, buildTemplate,
  ImageControls, IMG_TREATS, IMG_TREAT_PRESETS,
});
