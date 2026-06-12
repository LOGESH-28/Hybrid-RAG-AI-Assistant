# ===== Dockerfile (HuggingFace Spaces — Single Container) =====
FROM python:3.11-slim

WORKDIR /app

# ── System dependencies ───────────────────────────────────────────────────────
# libgomp1  → FAISS OpenMP threading
# nodejs    → React frontend build
RUN apt-get update && apt-get install -y \
    gcc g++ libgomp1 \
    tesseract-ocr \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 libffi-dev \
    curl gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# ── HuggingFace cache env ─────────────────────────────────────────────────────
ENV HF_HOME=/app/hf_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/hf_cache
ENV TRANSFORMERS_CACHE=/app/hf_cache
ENV HF_HUB_DISABLE_TELEMETRY=1

# ── Python deps (cached layer) ────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── React frontend build (cached layer) ───────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ── Copy rest of project ──────────────────────────────────────────────────────
COPY . .

# ── Runtime directories ───────────────────────────────────────────────────────
RUN mkdir -p /app/data /app/hf_cache

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]