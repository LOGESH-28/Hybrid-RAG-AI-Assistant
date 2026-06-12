# Loki AI - Hybrid RAG System

A professional AI assistant that combines local document retrieval (FAISS + SentenceTransformers) with live web search (DuckDuckGo) for hybrid reasoning. Built with FastAPI, HTML/CSS/JS.

## Features
- Local PDF/TXT indexing and retrieval.
- Fallback to web search if local context is insufficient.
- Local LLM (Mistral/Falcon) with OpenAI fallback.
- ChatGPT-like UI with dark mode.

## Setup
1. Install dependencies: `pip install -r requirements.txt`
2. Add API keys to `.env` (for OpenAI fallback).
3. Place documents in `/data`.
4. Build index: `python app/build_index.py`
5. Run: `uvicorn app.main:app --reload`
6. Open `http://localhost:8000` in browser.

## Extensibility
- Add more LLMs or search engines in respective modules.
- Enhance UI with more features (e.g., file upload).