/* ============================================================
   REALITY PRINT STUDIO — bundle entry
   ------------------------------------------------------------
   esbuild follows these imports into ONE script, print.bundle.js
   (tools/studio-bundle.cjs: built by scripts/build-studios.mjs for
   deploy, bundled per request by tools/serve-print.cjs locally).
   The modules import what they use from each other; this file only
   fixes the order they run in — the order index.html used to list
   them as separate <script>s — and ends with the app mounting.

   Globals, on purpose (index.html loads them BEFORE the bundle; the
   modules read them as globals, never import them):
     React, ReactDOM, PDFLib, fontkit — the self-hosted builds in
       vendor/ (the QR encoder is no longer one of them: it is bundled,
       from ../studio-shared/vendor/qrcode.cjs via ../studio-shared/qr.js);
     window.RisoPress, window.RISO — ../studio-shared/riso-press.js
       and riso-engine.js (the SAME two files Poster Studio loads).
       riso-press.js is vendored verbatim into the REALITY app (its
       sync:riso script) and must stay a standalone UMD file.

   Globals this bundle SETS, kept permanently:
     window.RUI — the shared control kit (../studio-shared/studio-ui.jsx),
                  which sets it for both Studios
     test hooks — below
   ============================================================ */
import './print-store.js';
import '../studio-shared/print-icons.js';
import '../studio-shared/studio-ui.jsx';
import './print-paper.js';
import './print-layout.js';
import './print-data.jsx';
import './print-templates.js';
import './print-preflight.js';
import './print-element.jsx';
import './print-canvas.jsx';
import './print-pdf.js';
import './print-export.jsx';
import './print-imposition.js';
import './app.jsx';            // + its hooks (use-*.js) and panels (topbar, library, inspector*, …)

import { makeElement } from './print-data.jsx';
import { TEMPLATES, TEMPLATE_GROUPS, buildTemplate } from './print-templates.js';
import { ImageControls, IMG_TREATS, IMG_TREAT_PRESETS } from './image-controls.jsx';

/* Test hooks — the studio test suite (scripts/test-studios) reaches these
   by name: the exports suite reads the starter library and builds each
   template to learn what its QR codes should say; the smoke suite renders
   the photo inspector for every treatment. They were window globals when
   the files were classic scripts; kept as exactly those names. */
Object.assign(window, {
  makeElement, TEMPLATES, TEMPLATE_GROUPS, buildTemplate,
  ImageControls, IMG_TREATS, IMG_TREAT_PRESETS,
});
