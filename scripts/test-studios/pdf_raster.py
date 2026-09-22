"""Rasterise PDFs and decode their QR codes — the export suite's PDF half.

Reads a JSON job list on stdin:
    [{"pdf": "a.pdf", "png": "a.png", "dpi": 100, "qr": true}, ...]
writes page 1 of each PDF to `png` at `dpi` (PyMuPDF), and when `qr` is set
decodes every QR code on that page with OpenCV — at 300 dpi, so a small
code on an A8 still has enough pixels per module. Prints a JSON list:
    [{"width": w, "height": h, "pages": n, "qrs": ["https://…", …]}, ...]

Needs PyMuPDF (fitz) and opencv-python (cv2); the QR half is skipped with a
note when cv2 is missing.
"""
import json
import sys

import fitz  # PyMuPDF

try:
    import cv2
    import numpy as np
except Exception:  # pragma: no cover - reported back to the caller
    cv2 = None


def decode_qrs(page):
    pix = page.get_pixmap(dpi=300, alpha=False, colorspace=fitz.csRGB)
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    found = []
    detectors = [cv2.QRCodeDetector()]
    if hasattr(cv2, "QRCodeDetectorAruco"):
        detectors.append(cv2.QRCodeDetectorAruco())
    for det in detectors:
        try:
            ok, texts, _pts, _ = det.detectAndDecodeMulti(img)
        except Exception:
            ok, texts = False, []
        if ok:
            found.extend(t for t in texts if t)
        if found:
            break
    if not found:
        # one code on the page: the single-code path is sometimes happier
        for det in detectors:
            try:
                t, _pts, _ = det.detectAndDecode(img)
            except Exception:
                t = ""
            if t:
                found.append(t)
                break
    return sorted(set(found))


def main():
    jobs = json.load(sys.stdin)
    out = []
    for job in jobs:
        doc = fitz.open(job["pdf"])
        page = doc[0]
        pix = page.get_pixmap(dpi=job.get("dpi", 100), alpha=False, colorspace=fitz.csRGB)
        pix.save(job["png"])
        res = {"width": pix.width, "height": pix.height, "pages": doc.page_count}
        if job.get("qr"):
            res["qrs"] = decode_qrs(page) if cv2 is not None else None
        out.append(res)
        doc.close()
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
