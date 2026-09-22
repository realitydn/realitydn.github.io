/* ============================================================
   REALITY SCHEDULE STUDIO — bundle entry
   ------------------------------------------------------------
   esbuild follows these imports into ONE script, schedule.bundle.js
   (tools/studio-bundle.cjs: built by scripts/build-studios.mjs for
   deploy, bundled per request by tools/serve-schedule.cjs locally).
   The modules import what they use from each other; this file only
   fixes the order they run in — the order index.html used to list
   them as separate <script>s — and ends with the app mounting.

   Globals, on purpose (loaded by index.html BEFORE the bundle, read
   here as globals, never imported): React, ReactDOM, htmlToImage,
   jspdf, JSZip — the self-hosted builds in vendor/.

   Globals this bundle SETS, kept permanently:
     window.RCloud — the cloud client (cloud-client.js). One object per
                     page, shared with anything else on it (the guard in
                     cloud-client.js keeps an earlier copy if there is one).
   ============================================================ */
import './cloud-client.js';
import './schedule-data.jsx';
import './schedule-render.jsx';
import './schedule-app.jsx';
