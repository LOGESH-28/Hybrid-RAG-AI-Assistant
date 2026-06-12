# ===== ocr_processor.py — Phase 2: OpenCV Enhanced OCR =====
"""
Production-grade OCR pipeline with OpenCV preprocessing:
- Grayscale → Denoising → Adaptive Threshold → Dilation → Tesseract
- Confidence scoring
- Multi-format support (PNG/JPG/WEBP/BMP/TIFF/Scanned PDFs)
"""
import os
import numpy as np
from PIL import Image

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

# ── Optional imports ──────────────────────────────────────────────────────────
try:
    import pytesseract
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("[Warning] pytesseract not installed")

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[Warning] opencv not installed - using basic PIL OCR")

try:
    from pdf2image import convert_from_path
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


# ── OpenCV Preprocessing Pipeline ─────────────────────────────────────────────
def preprocess_image_cv2(pil_img: Image.Image) -> Image.Image:
    """
    Multi-step OpenCV preprocessing for best OCR accuracy:
    1. Convert to grayscale
    2. Denoise with fastNlMeansDenoising
    3. Adaptive thresholding (handles uneven lighting)
    4. Morphological dilation (reconnects broken characters)
    """
    if not CV2_AVAILABLE:
        return pil_img.convert("L")  # fallback: just grayscale

    img_array = np.array(pil_img.convert("RGB"))
    # BGR for OpenCV
    bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

    # 1. Grayscale
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    # 2. Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)

    # 3. Adaptive threshold (Gaussian weighted)
    thresh = cv2.adaptiveThreshold(
        denoised, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 31, 8
    )

    # 4. Dilation to fill gaps in thin characters
    kernel = np.ones((1, 1), np.uint8)
    processed = cv2.dilate(thresh, kernel, iterations=1)

    # 5. Scale up small images (helps Tesseract accuracy)
    h, w = processed.shape
    if h < 600 or w < 600:
        scale = max(600 / h, 600 / w, 1.5)
        processed = cv2.resize(processed, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    return Image.fromarray(processed)


def _tesseract_config(mode: int = 6) -> str:
    """Build tesseract config string."""
    return f"--oem 3 --psm {mode} -c tessedit_char_blacklist=|\\<>"


def extract_text_from_image(image_path: str, return_confidence: bool = False):
    """
    Extract text from an image file using OpenCV preprocessing + Tesseract.
    Returns (text, confidence) if return_confidence=True, else text.
    """
    if not OCR_AVAILABLE:
        result = ("[OCR not available]", 0.0) if return_confidence else "[OCR not available]"
        return result

    try:
        pil_img = Image.open(image_path)
        if pil_img.mode not in ("RGB", "L", "RGBA"):
            pil_img = pil_img.convert("RGB")

        processed = preprocess_image_cv2(pil_img)

        # Try PSM 6 first (uniform block), fallback to PSM 3 (auto)
        text = pytesseract.image_to_string(processed, config=_tesseract_config(6))
        confidence = 0.0

        if return_confidence:
            try:
                data = pytesseract.image_to_data(processed, config=_tesseract_config(6),
                                                  output_type=pytesseract.Output.DICT)
                confs = [int(c) for c in data["conf"] if str(c).isdigit() and int(c) >= 0]
                confidence = round(sum(confs) / len(confs) / 100, 3) if confs else 0.0
            except Exception:
                confidence = 0.5 if text.strip() else 0.0

        if not text.strip():
            # Retry with PSM 3 (fully automatic layout)
            text = pytesseract.image_to_string(processed, config=_tesseract_config(3))

        text = text.strip()
        return (text, confidence) if return_confidence else text

    except Exception as e:
        err = f"[OCR Error: {e}]"
        return (err, 0.0) if return_confidence else err


def extract_text_from_scanned_pdf(pdf_path: str) -> str:
    """OCR a full scanned PDF page by page using pdf2image + OpenCV."""
    if not OCR_AVAILABLE:
        return "[OCR not available]"

    texts = []
    if PDF2IMAGE_AVAILABLE:
        try:
            pages = convert_from_path(pdf_path, dpi=200)
            for i, page_img in enumerate(pages):
                processed = preprocess_image_cv2(page_img)
                t = pytesseract.image_to_string(processed, config=_tesseract_config(6))
                if t.strip():
                    texts.append(f"[Page {i + 1}]\n{t.strip()}")
            return "\n\n".join(texts) or "[No text detected in scanned PDF]"
        except Exception as e:
            return f"[Scanned PDF OCR Error: {e}]"

    # Fallback: PyPDF2
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        for i, page in enumerate(reader.pages):
            t = page.extract_text() or ""
            if t.strip():
                texts.append(f"[Page {i + 1}]\n{t.strip()}")
        return "\n\n".join(texts)
    except Exception as e:
        return f"[PDF fallback error: {e}]"


def process_uploaded_file(filepath: str) -> str:
    """
    Universal file processor — routes to appropriate extractor.
    Images → OpenCV OCR
    PDFs   → PyPDF2 text extraction + OCR fallback for scanned pages
    TXT    → direct read
    """
    ext = os.path.splitext(filepath)[1].lower()

    if ext in SUPPORTED_IMAGE_EXTS:
        print(f"[OCR] OCR (OpenCV) -> {os.path.basename(filepath)}")
        text, conf = extract_text_from_image(filepath, return_confidence=True)
        print(f"   Confidence: {conf:.1%} | Chars: {len(text)}")
        return text

    elif ext == ".pdf":
        print(f"[OCR] PDF -> {os.path.basename(filepath)}")
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(filepath)
            full_text = ""
            scanned_pages = []

            for i, page in enumerate(reader.pages):
                t = page.extract_text() or ""
                if len(t.strip()) > 40:
                    full_text += f"\n[Page {i + 1}]\n{t.strip()}"
                else:
                    scanned_pages.append(i + 1)

            if scanned_pages and OCR_AVAILABLE:
                print(f"   [Warning] Pages {scanned_pages} appear scanned -> running OCR")
                ocr_text = extract_text_from_scanned_pdf(filepath)
                if ocr_text and "[OCR" not in ocr_text:
                    full_text += f"\n\n[OCR Extracted Pages]\n{ocr_text}"

            return full_text.strip()
        except Exception as e:
            return f"[PDF Error: {e}]"

    elif ext == ".txt":
        try:
            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                return f.read().strip()
        except Exception as e:
            return f"[TXT Error: {e}]"

    return f"[Unsupported format: {ext}]"
