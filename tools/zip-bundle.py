# Re-zips the design-system bundle with forward-slash entry names (spec
# compliant + cross-platform). PowerShell's Compress-Archive / .NET
# CreateFromDirectory on .NET Framework 4.x write backslashes, which break
# extraction on macOS/Linux — so we build the archive explicitly here.

import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design-system-year2")  # contains design_handoff_reality_system/
OUT = os.path.join(ROOT, "REALITY Design System Year 2.1.zip")

count = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for dirpath, dirs, files in os.walk(SRC):
        for f in sorted(files):
            full = os.path.join(dirpath, f)
            arc = os.path.relpath(full, SRC).replace(os.sep, "/")
            z.write(full, arc)
            count += 1

# verify
with zipfile.ZipFile(OUT) as z:
    names = z.namelist()
    backslash = [n for n in names if "\\" in n]
    print(f"wrote {count} files -> {os.path.basename(OUT)}")
    print(f"entries: {len(names)}  backslash entries: {len(backslash)}")
    for must in [
        "design_handoff_reality_system/REVISION.md",
        "design_handoff_reality_system/assets/wordmark/reality-wordmark.svg",
        "design_handoff_reality_system/assets/qr/reality-qr-ink-on-white.png",
        "design_handoff_reality_system/design/studio-data.jsx",
        "design_handoff_reality_system/design/REALITY Poster Studio.html",
    ]:
        print(("  OK  " if must in names else " MISS ") + must)
