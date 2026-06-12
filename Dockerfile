# ===== Dockerfile (HuggingFace Spaces optimized) =====
FROM python:3.11-slim

WORKDIR /app

# System dependencies
# libgomp1  → required by faiss-cpu for OpenMP threading
# tesseract → OCR support
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgomp1 \
    tesseract-ocr \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# HuggingFace cache inside container (avoids re-download each restart)
ENV HF_HOME=/app/hf_cache
ENV SENTENCE_TRANSFORMERS_HOME=/app/hf_cache
ENV TRANSFORMERS_CACHE=/app/hf_cache
# Disable HF telemetry
ENV HF_HUB_DISABLE_TELEMETRY=1

# Copy requirements and install (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create runtime directories
RUN mkdir -p /app/data /app/hf_cache

EXPOSE 7860

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]