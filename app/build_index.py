# ===== build_index.py — Phase 2: Smart Semantic Chunking with Metadata =====
"""
Advanced document indexing:
- Chunks stored as dicts: {text, source, page, chunk_idx, char_start}
- Sentence-aware splitting with configurable overlap
- Page-aware chunking for PDFs
- Deduplication
- Metadata-rich for citation tracking
"""
import os, re, pickle, hashlib
import numpy as np
from dotenv import load_dotenv
load_dotenv()

# ── HuggingFace Cache ─────────────────────────────────────────────────────────
if os.path.exists("/.dockerenv"):
    os.environ["HF_HOME"] = "/app/hf_cache"
elif os.path.exists("D:\\hf_cache"):
    os.environ["HF_HOME"] = "D:\\hf_cache"
else:
    os.environ["HF_HOME"] = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "hf_cache")
os.environ["SENTENCE_TRANSFORMERS_HOME"] = os.environ["HF_HOME"]

from sentence_transformers import SentenceTransformer
import faiss
from PyPDF2 import PdfReader

# ── Project paths ─────────────────────────────────────────────────────────────
_file_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(_file_dir) if os.path.basename(_file_dir) == "app" else _file_dir
DATA_DIR     = os.path.join(PROJECT_ROOT, "data")

CHUNK_MAX_WORDS = 150   # target max words per chunk
CHUNK_OVERLAP   = 30    # word overlap between consecutive chunks


# ─────────────────────────────────────────────────────────────────────────────
# Sentence-Aware Chunking
# ─────────────────────────────────────────────────────────────────────────────
def _tokenize_sentences(text: str) -> list[str]:
    """Split text into sentences, preserving structure."""
    # Split on sentence boundaries, keeping the delimiter
    parts = re.split(r'(?<=[.!?])\s+|\n{2,}', text.strip())
    return [p.strip() for p in parts if p.strip()]


def split_text_smart(text: str, source: str, page: int = 0,
                     max_words: int = CHUNK_MAX_WORDS, overlap: int = CHUNK_OVERLAP) -> list[dict]:
    """
    Sentence-aware chunking with sliding window overlap.
    Returns list of chunk dicts with full metadata.
    """
    sentences = _tokenize_sentences(text)
    chunks = []
    chunk_idx = 0
    i = 0

    while i < len(sentences):
        window, word_count = [], 0
        j = i
        while j < len(sentences) and word_count < max_words:
            window.append(sentences[j])
            word_count += len(sentences[j].split())
            j += 1

        chunk_text = " ".join(window).strip()
        if len(chunk_text) > 30:  # skip tiny fragments
            chunks.append({
                "text":       chunk_text,
                "source":     source,
                "page":       page,
                "chunk_idx":  chunk_idx,
                "hash":       hashlib.md5(chunk_text.encode()).hexdigest()[:8],
            })
            chunk_idx += 1

        # Overlap: step back `overlap` words worth of sentences
        overlap_words = 0
        back = j - 1
        while back > i and overlap_words < overlap:
            overlap_words += len(sentences[back].split())
            back -= 1
        i = max(i + 1, back + 1)

    return chunks


# ─────────────────────────────────────────────────────────────────────────────
# Document Loaders
# ─────────────────────────────────────────────────────────────────────────────
def load_pdf(filepath: str, filename: str) -> list[dict]:
    """Load PDF with page-aware chunking. Falls back to full text on error."""
    chunks = []
    try:
        reader = PdfReader(filepath)
        for page_num, page in enumerate(reader.pages, start=1):
            page_text = page.extract_text() or ""
            if page_text.strip():
                page_chunks = split_text_smart(page_text, source=filename, page=page_num)
                chunks.extend(page_chunks)
    except Exception as e:
        print(f"  ⚠️ PDF read error ({filename}): {e}")
    return chunks


def load_txt(filepath: str, filename: str) -> list[dict]:
    """Load plain text file, split into chunks."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()
        return split_text_smart(text, source=filename, page=0)
    except Exception as e:
        print(f"  ⚠️ TXT read error ({filename}): {e}")
        return []


def load_documents(data_dir: str = DATA_DIR) -> list[dict]:
    """
    Load all PDFs, TXT, and OCR-derived txt files from /data.
    Returns list of chunk dicts.
    """
    os.makedirs(data_dir, exist_ok=True)
    all_chunks: list[dict] = []
    seen_hashes: set[str] = set()

    for filename in sorted(os.listdir(data_dir)):
        filepath = os.path.join(data_dir, filename)
        ext = os.path.splitext(filename)[1].lower()

        if ext == ".pdf":
            print(f"  📄 PDF: {filename}")
            file_chunks = load_pdf(filepath, filename)
        elif ext == ".txt":
            print(f"  📝 TXT: {filename}")
            file_chunks = load_txt(filepath, filename)
        else:
            continue

        # Deduplication by content hash
        unique = []
        for c in file_chunks:
            if c["hash"] not in seen_hashes:
                seen_hashes.add(c["hash"])
                unique.append(c)

        all_chunks.extend(unique)
        print(f"     → {len(unique)} unique chunks")

    return all_chunks


# ─────────────────────────────────────────────────────────────────────────────
# Build FAISS Index
# ─────────────────────────────────────────────────────────────────────────────
def build_index(data_dir: str = DATA_DIR) -> bool:
    print("🔹 Phase 2 Smart Indexer — loading documents...")
    chunks = load_documents(data_dir)

    if not chunks:
        print("⚠️ No documents found in /data.")
        return False

    print(f"✅ {len(chunks)} unique chunks loaded")
    print("🔹 Embedding with SentenceTransformer...")

    try:
        embedder = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
    except Exception:
        embedder = SentenceTransformer("all-MiniLM-L6-v2")

    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts, convert_to_numpy=True,
                                  show_progress_bar=True, batch_size=32)

    print("🔹 Building FAISS IndexFlatIP (cosine)...")
    # Normalize for cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1, norms)
    embeddings_norm = (embeddings / norms).astype("float32")

    index = faiss.IndexFlatIP(embeddings_norm.shape[1])
    index.add(embeddings_norm)

    # Save
    faiss.write_index(index, os.path.join(PROJECT_ROOT, "faiss_index.idx"))
    with open(os.path.join(PROJECT_ROOT, "chunks.pkl"), "wb") as f:
        pickle.dump(chunks, f)

    print(f"✅ Index built: {index.ntotal} vectors, {len(chunks)} chunks")
    print(f"   Sources: {sorted(set(c['source'] for c in chunks))}")
    return True


if __name__ == "__main__":
    build_index()
