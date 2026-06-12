# ===== diagnostic.py - Run this to check RAG accuracy =====
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.rag_engine import RAGEngine

print("=" * 60)
print("[INFO] Loki AI - Diagnostic Test")
print("=" * 60)

rag = RAGEngine()

queries = [
    "What is Artificial Intelligence?",
    "What is Logesh CGPA?",
    "What are Logesh skills?",
    "climate in erode today",
    "What did I upload?",
    "Summarize the document"
]

for q in queries:
    print(f"\n{'='*50}")
    print(f"Query: {q}")
    result = rag.answer(q)
    src = result.get("source_type", "unknown")
    tokens = result.get("tokens_used", 0)
    sources = result.get("sources_found", 0)
    answer = result.get("answer", "")[:150]
    print(f"Source: {src}")
    print(f"Tokens: {tokens} | Chunks used: {sources}")
    print(f"Answer: {answer}...")
    print("="*50)

print("\nDiagnostic complete!")