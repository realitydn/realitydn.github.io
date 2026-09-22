/* ============================================================
   REALITY POSTER STUDIO — bundle entry
   ------------------------------------------------------------
   esbuild follows these imports into ONE script, studio.bundle.js
   (tools/studio-bundle.cjs: built by scripts/build-studios.mjs for
   deploy, bundled per request by tools/serve-studio.cjs locally).
   The modules import what they use from each other; this file only
   fixes the order they run in — the order index.html used to list
   them as separate <script>s — and ends with the app mounting.

   Globals, on purpose (index.html loads them BEFORE the bundle; the
   modules read them as globals, never import them):
     React, ReactDOM, htmlToImage, jspdf, JSZip — the self-hosted
       builds in vendor/;
     window.RisoPress, window.RISO — ../studio-shared/riso-press.js
       and riso-engine.js. riso-press.js is vendored verbatim into the
       REALITY app (its sync:riso script) and must stay a standalone
       UMD file; the engine test harness loads the two the same way.

   Globals this bundle SETS, kept permanently:
     window.RStore  — the IndexedDB store (studio-store.js)
     window.RCloud  — the cloud client (../studio-shared/cloud.js, shared
                      with Schedule Studio)
     window.RUI     — the shared control kit (../studio-shared/studio-ui.jsx);
                      the exports suite opens the library folds through it
     window.shadowModel — below
     test hooks     — below
   The modules themselves import all of these; the window names are for
   what lives outside the bundle (the test suite, the console, a second
   copy of the cloud client).
   ============================================================ */
import '../studio-shared/print-icons.js';
import '../studio-shared/studio-ui.jsx';
import './studio-store.js';
import '../studio-shared/cloud.js';
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
