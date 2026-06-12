# ===== rag_engine.py — Phase 2: Hybrid RAG + Citations + Smart Context =====
import os, time, pickle
import numpy as np
import faiss
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

try:
    import mlflow
    MLFLOW_AVAILABLE = True
except ImportError:
    MLFLOW_AVAILABLE = False

try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    print("[Warning] rank_bm25 not installed - keyword search disabled")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _chunk_text(c) -> str:
    """Safely extract text from chunk (handles both str and dict formats)."""
    return c["text"] if isinstance(c, dict) else str(c)

def _chunk_meta(c) -> dict:
    """Extract metadata from a chunk dict (or empty dict for legacy str chunks)."""
    if isinstance(c, dict):
        return {"source": c.get("source", "unknown"), "page": c.get("page", 0)}
    return {"source": "legacy", "page": 0}

def _format_citation(meta: dict) -> str:
    src  = meta.get("source", "")
    page = meta.get("page", 0)
    if src and page:
        return f"{src} (p.{page})"
    return src or "unknown"


# ─────────────────────────────────────────────────────────────────────────────
# RAG Engine
# ─────────────────────────────────────────────────────────────────────────────
class RAGEngine:

    def __init__(self, index_path=None, chunks_path=None):
        print("[RAG] Loki RAG Engine v2 - Hybrid Search + Citations")

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.index_path  = index_path  or os.getenv("FAISS_INDEX_PATH",  os.path.join(base_dir, "faiss_index.idx"))
        self.chunks_path = chunks_path or os.getenv("CHUNKS_PATH",        os.path.join(base_dir, "chunks.pkl"))
        self.data_dir    = os.path.join(base_dir, "data")

        # ── MLflow ─────────────────────────────────────────────────────────
        if MLFLOW_AVAILABLE:
            try:
                uri = os.getenv("MLFLOW_TRACKING_URI", f"sqlite:///{os.path.join(base_dir, 'mlflow.db')}")
                mlflow.set_tracking_uri(uri)
                mlflow.set_experiment("Loki_RAG_v2")
                print("[RAG] MLflow ready")
            except Exception as e:
                print(f"[Warning] MLflow: {e}")

        self.query_count = 0
        self.total_tokens = 0

        # ── Groq client ────────────────────────────────────────────────────
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not set")
        try:
            import httpx
            from groq import Groq
            self.client = Groq(api_key=api_key, http_client=httpx.Client())
        except TypeError:
            from groq import Groq
            self.client = Groq(api_key=api_key)

        self.model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        print(f"[RAG] Groq | {self.model_name}")

        # ── Embedder ───────────────────────────────────────────────────────
        local_model_path = os.path.join(os.environ.get("HF_HOME", ""), "sentence-transformers_all-MiniLM-L6-v2")
        if os.path.exists(local_model_path):
            try:
                self.embedder = SentenceTransformer(local_model_path)
                print("[RAG] Embedder loaded (local path)")
            except Exception as e:
                print(f"[Warning] Local path load failed: {e}")
                self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
                print("[RAG] Embedder loaded (hub fallback)")
        else:
            try:
                self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
                print("[RAG] Embedder loaded (hub)")
            except Exception as e:
                print(f"[RAG] Embedder load failed: {e}")
                raise e

        # ── FAISS ─────────────────────────────────────────────────────────
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
            print(f"[RAG] FAISS: {self.index.ntotal} vectors")
        else:
            self.index = None
            print("[Warning] FAISS index not found")

        # ── Chunks ─────────────────────────────────────────────────────────
        if os.path.exists(self.chunks_path):
            with open(self.chunks_path, "rb") as f:
                self.chunks = pickle.load(f)
            print(f"[RAG] {len(self.chunks)} chunks loaded")
        else:
            self.chunks = []

        # ── BM25 ──────────────────────────────────────────────────────────
        self._build_bm25()

        # ── File memory ────────────────────────────────────────────────────
        self.uploaded_files:    list[str] = []
        self.uploaded_contents: dict[str, str] = {}
        self._load_existing_files()
        self.doc_topics = self._extract_topics()

        # ── Memory Manager ─────────────────────────────────────────────────
        try:
            from memory_manager import get_memory
            self.memory = get_memory()
            print("[RAG] Memory manager ready")
        except Exception as e:
            self.memory = None
            print(f"[Warning] Memory manager: {e}")

        # ── Web Retriever ──────────────────────────────────────────────────
        try:
            try:
                from .web_retriever import WebRetriever
            except ImportError:
                from web_retriever import WebRetriever
            self.web_retriever = WebRetriever()
            print("[RAG] Web retriever ready")
        except Exception as e:
            self.web_retriever = None
            print(f"[Warning] Web retriever: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _build_bm25(self):
        """Build BM25 index from current chunks."""
        self.bm25 = None
        if not BM25_AVAILABLE or not self.chunks:
            return
        try:
            tokenized = [_chunk_text(c).lower().split() for c in self.chunks]
            self.bm25 = BM25Okapi(tokenized)
            print(f"[RAG] BM25 index: {len(self.chunks)} docs")
        except Exception as e:
            print(f"[Warning] BM25 build: {e}")

    def _load_existing_files(self):
        if not os.path.exists(self.data_dir):
            return
        for fn in os.listdir(self.data_dir):
            if fn not in self.uploaded_files:
                self.uploaded_files.append(fn)
                fpath = os.path.join(self.data_dir, fn)
                self.uploaded_contents[fn] = self._extract_preview(fpath)
        print(f"[RAG] {len(self.uploaded_files)} existing files loaded")

    def _extract_preview(self, filepath: str) -> str:
        try:
            if filepath.endswith(".pdf"):
                from PyPDF2 import PdfReader
                reader = PdfReader(filepath)
                return (reader.pages[0].extract_text() or "")[:400].strip()
            elif filepath.endswith(".txt"):
                with open(filepath, "r", encoding="utf-8") as f:
                    return f.read()[:400].strip()
        except Exception:
            pass
        return ""

    def _extract_topics(self) -> list[str]:
        import re
        from collections import Counter
        topics = []
        if os.path.exists(self.data_dir):
            for fn in os.listdir(self.data_dir):
                name = os.path.splitext(fn)[0].lower()
                topics.extend([w for w in re.split(r'[\s_\-]+', name) if len(w) > 3])
        if self.chunks:
            sample = " ".join(_chunk_text(c) for c in self.chunks[:5])[:800].lower()
            words  = re.findall(r'\b[a-z]{4,15}\b', sample)
            common = [w for w, cnt in Counter(words).most_common(15) if cnt > 1]
            topics.extend(common)
        return list(set(topics))

    def register_upload(self, filename: str, filepath: str):
        if filename not in self.uploaded_files:
            self.uploaded_files.append(filename)
        self.uploaded_contents[filename] = self._extract_preview(filepath)
        self.doc_topics = self._extract_topics()
        if self.memory:
            pass  # session tracking done in main.py
        print(f"📄 Registered: {filename}")

    def reload_topics(self):
        self.doc_topics = self._extract_topics()

    # ─────────────────────────────────────────────────────────────────────────
    # Memory helpers
    # ─────────────────────────────────────────────────────────────────────────
    def _check_memory(self, question: str) -> str | None:
        q = question.lower().strip()
        triggers = ["what did i upload", "my files", "uploaded files", "what files",
                    "which files", "what documents", "show files"]
        if any(t in q for t in triggers):
            if self.uploaded_files:
                return "You have uploaded:\n" + "\n".join(f"• {f}" for f in self.uploaded_files)
            return "No files uploaded yet in this session."

        for trig in ["what is in", "preview", "content of", "show me"]:
            if trig in q:
                for fn in self.uploaded_files:
                    if any(w in q for w in fn.lower().split(".")):
                        preview = self.uploaded_contents.get(fn, "")
                        if preview:
                            return f"Preview of '{fn}':\n\n{preview}..."
        return None

    # ─────────────────────────────────────────────────────────────────────────
    # Hybrid Retrieval — FAISS + BM25 (Reciprocal Rank Fusion)
    # ─────────────────────────────────────────────────────────────────────────
    def retrieve_local(self, query: str, top_k: int = 8):
        """
        Hybrid retrieval:
        1. FAISS cosine semantic search
        2. BM25 keyword search
        3. Reciprocal Rank Fusion (RRF) for score combination
        Returns (context_str, ranked_chunk_dicts_with_meta)
        """
        if not self.index or not self.chunks:
            return None, []

        # ── FAISS semantic search ─────────────────────────────────────────
        q_emb = self.embedder.encode([query], convert_to_numpy=True).astype("float32")
        # Normalize for cosine similarity
        q_emb = q_emb / (np.linalg.norm(q_emb, keepdims=True) + 1e-9)

        n_search = min(top_k * 3, len(self.chunks))
        scores_faiss, idxs_faiss = self.index.search(q_emb, n_search)
        faiss_ranks: dict[int, int] = {}
        for rank, (score, idx) in enumerate(zip(scores_faiss[0], idxs_faiss[0])):
            if idx >= 0 and score > 0.15:   # cosine threshold
                faiss_ranks[int(idx)] = rank

        # ── BM25 keyword search ───────────────────────────────────────────
        bm25_ranks: dict[int, int] = {}
        if self.bm25 is not None:
            try:
                q_tokens = query.lower().split()
                bm25_scores = self.bm25.get_scores(q_tokens)
                top_bm25 = np.argsort(bm25_scores)[::-1][:n_search]
                for rank, idx in enumerate(top_bm25):
                    if bm25_scores[idx] > 0.1:
                        bm25_ranks[int(idx)] = rank
            except Exception:
                pass

        # ── RRF fusion ────────────────────────────────────────────────────
        k_rrf = 60
        all_idxs = set(faiss_ranks) | set(bm25_ranks)
        rrf_scores: dict[int, float] = {}
        for idx in all_idxs:
            score = 0.0
            if idx in faiss_ranks:
                score += 0.7 / (k_rrf + faiss_ranks[idx] + 1)   # semantic weight 70%
            if idx in bm25_ranks:
                score += 0.3 / (k_rrf + bm25_ranks[idx] + 1)    # keyword weight 30%
            rrf_scores[idx] = score

        ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]

        if not ranked:
            return None, []

        results = []
        for idx, score in ranked:
            if idx < len(self.chunks):
                chunk = self.chunks[idx]
                meta  = _chunk_meta(chunk)
                results.append({
                    "text":   _chunk_text(chunk),
                    "score":  round(score, 5),
                    "source": meta["source"],
                    "page":   meta["page"],
                })

        print(f"[RAG] Hybrid: {len(faiss_ranks)} FAISS + {len(bm25_ranks)} BM25 -> {len(results)} fused")

        if not results:
            return None, []

        # Build context with citations
        context_parts = []
        for r in results:
            citation = f"[{r['source']}, p.{r['page']}]" if r["page"] else f"[{r['source']}]"
            context_parts.append(f"{citation}\n{r['text']}")

        return "\n\n---\n\n".join(context_parts), results

    # ── Web Retrieval ─────────────────────────────────────────────────────────
    def retrieve_web(self, query: str) -> str | None:
        if not self.web_retriever:
            return None
        try:
            result = self.web_retriever.search_and_summarize(query, num_results=4)
            return result.strip() if result else None
        except Exception as e:
            print(f"[Warning] Web: {e}")
            return None

    # ─────────────────────────────────────────────────────────────────────────
    # Source type routing
    # ─────────────────────────────────────────────────────────────────────────
    def _is_realtime(self, q: str) -> bool:
        kws = ["today", "current", "latest news", "right now", "live", "stock price",
               "weather today", "breaking", "trending", "2024", "2025", "2026",
               "weather", "news", "recent", "president", "price of", "election",
               "stock", "versus", "vs", "announcement", "release", "what is happening",
               "what happened", "who is"]
        return any(k in q.lower() for k in kws)

    def _is_personal_doc(self, q: str) -> bool:
        kws = ["logesh", "resume", "rotaract", "ijaike", "my document", "uploaded",
               "summarize", "summary", "this document", "which document"]
        return any(k in q.lower() for k in kws)

    # ─────────────────────────────────────────────────────────────────────────
    # System Prompt Builder (with citations)
    # ─────────────────────────────────────────────────────────────────────────
    def _build_prompt(self, question: str, context: str | None,
                      source_type: str, session_id: str) -> tuple[str, str]:
        """Returns (system_prompt, user_message)."""

        # Memory context
        mem_context = ""
        if self.memory:
            mem_context = self.memory.build_system_context(session_id)

        files_ctx = ""
        if self.uploaded_files:
            files_ctx = "Files available: " + ", ".join(self.uploaded_files)

        # Fetch last OCR text from database if present
        last_ocr = ""
        last_ocr_filename = ""
        try:
            try:
                from app import database
            except ImportError:
                import database
            facts = database.get_memory_facts(session_id)
            last_ocr = facts.get("last_ocr_text", "")
            last_ocr_filename = facts.get("last_ocr_filename", "")
        except Exception as ex:
            print(f"[WARNING] Failed to load OCR facts: {ex}")

        ocr_ctx = ""
        if last_ocr:
            ocr_ctx = f"\n\nACTIVE UPLOADED IMAGE CONTENT (OCR from '{last_ocr_filename}'):\n{last_ocr}\nUse this content to answer any questions related to the uploaded image."

        base_identity = """You are Loki AI — a premium, intelligent AI assistant.
You are helpful, accurate, and concise. You support chat, document Q&A, OCR, and web search."""

        if context and source_type == "local":
            system = f"""{base_identity}

{files_ctx}
{mem_context}{ocr_ctx}

DOCUMENT CONTEXT (with source citations):
{context}

INSTRUCTIONS:
- For questions answered by the document context above, answer accurately using ONLY that context.
- Always cite your source inline: e.g. "According to Resume.pdf (p.2)..."
- End your response with a "📚 Sources:" section listing all sources cited.
- For general knowledge questions (greetings, math, science), answer from your own knowledge.
- Never fabricate facts about personal documents."""

            user_msg = f"Question: {question}\nAnswer:"

        elif source_type == "web":
            system = f"""{base_identity}

{mem_context}{ocr_ctx}

WEB SEARCH RESULTS:
{context}

INSTRUCTIONS:
- Answer using the web results above.
- Cite sources where possible.
- Be concise and factual."""
            user_msg = f"Question: {question}\nAnswer:"

        else:
            system = f"""{base_identity}

{files_ctx}
{mem_context}{ocr_ctx}

Answer from your general knowledge. If the question is about documents, remind the user to upload them."""
            user_msg = question

        return system, user_msg

    # ─────────────────────────────────────────────────────────────────────────
    # Streaming Response
    # ─────────────────────────────────────────────────────────────────────────
    def answer_stream(self, question: str, temperature: float = 0.7,
                      max_tokens: int = 1024, session_id: str = "default"):
        start_time = time.time()
        self.query_count += 1

        # Extract uploaded image filename from markdown if present
        import re
        img_match = re.search(r'!\[.*?\]\(/data/(.*?)\)', question)
        if img_match:
            img_filename = img_match.group(1)
            # Find its OCR file in DATA_DIR
            ocr_filename = img_filename.rsplit(".", 1)[0] + "_ocr.txt"
            ocr_path = os.path.join(self.data_dir, ocr_filename)
            if os.path.exists(ocr_path):
                try:
                    with open(ocr_path, "r", encoding="utf-8") as f:
                        ocr_text = f.read()
                    try:
                        import database
                        database.save_memory_fact(session_id, "last_ocr_text", ocr_text)
                        database.save_memory_fact(session_id, "last_ocr_filename", img_filename)
                        print(f"[RAG] Saved OCR text of {img_filename} to session memory")
                    except Exception as ex:
                        print(f"[Warning] Failed to save OCR memory fact: {ex}")
                except Exception as e:
                    print(f"[Warning] Failed to read OCR for matching image: {e}")

        # 1. Memory check
        mem_answer = self._check_memory(question)
        if mem_answer:
            if self.memory:
                self.memory.add(session_id, "user", question)
                self.memory.add(session_id, "assistant", mem_answer)
            yield mem_answer
            return

        # 2. Auto-compress memory if long
        if self.memory and self.memory.should_summarize(session_id):
            self.memory.compress(session_id, self.client, self.model_name)

        # 3. Source routing
        context, sources, source_type = None, [], "general"

        if self._is_realtime(question):
            web = self.retrieve_web(question)
            if web:
                context, source_type = web, "web"
        else:
            context, sources = self.retrieve_local(question, top_k=8)
            if context:
                source_type = "local"
            elif not self._is_personal_doc(question):
                web = self.retrieve_web(question)
                if web:
                    context, source_type = web, "web"

        # 4. Build messages
        system_prompt, user_message = self._build_prompt(question, context, source_type, session_id)

        # Inject conversation history
        history = []
        if self.memory:
            self.memory.add(session_id, "user", question)
            history = self.memory.get_history(session_id, max_turns=6)
            history = history[:-1]  # exclude the message we just added

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(history)
        messages.append({"role": "user", "content": user_message})

        # 5. Stream from Groq
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                top_p=0.9,
                stream=True,
            )

            full_response = []
            for chunk in response:
                token = chunk.choices[0].delta.content
                if token:
                    full_response.append(token)
                    yield token

            answer_text = "".join(full_response)
            latency = round(time.time() - start_time, 2)

            # Save to memory
            if self.memory:
                self.memory.add(session_id, "assistant", answer_text)

            # Save to SQLite
            try:
                from database import save_message
                save_message(session_id, "user", question, source_type)
                save_message(session_id, "assistant", answer_text, source_type, latency_sec=latency)
            except Exception:
                pass

            # MLflow
            if MLFLOW_AVAILABLE:
                try:
                    with mlflow.start_run(run_name=f"stream_{self.query_count}"):
                        mlflow.log_param("model", self.model_name)
                        mlflow.log_param("source_type", source_type)
                        mlflow.log_param("query_preview", question[:80])
                        mlflow.log_metric("latency_sec", latency)
                        mlflow.log_metric("sources_found", len(sources))
                        mlflow.log_metric("hybrid_bm25_enabled", int(BM25_AVAILABLE))
                except Exception:
                    pass

            print(f"[Info] {latency}s | {source_type} | {len(sources)} chunks")

        except Exception as e:
            err = f"[Error] Generation error: {str(e)}"
            if self.memory:
                self.memory.add(session_id, "assistant", err)
            yield err

    # ─────────────────────────────────────────────────────────────────────────
    # Non-streaming response
    # ─────────────────────────────────────────────────────────────────────────
    def answer(self, question: str, temperature: float = 0.7,
               max_tokens: int = 1024, session_id: str = "default") -> dict:
        tokens = list(self.answer_stream(question, temperature, max_tokens, session_id))
        full = "".join(tokens)
        return {"answer": full, "session_id": session_id}

    # ─────────────────────────────────────────────────────────────────────────
    # Reload index (after new upload)
    # ─────────────────────────────────────────────────────────────────────────
    def reload_index(self):
        """Reload FAISS index and chunks from disk, rebuild BM25."""
        try:
            if os.path.exists(self.index_path):
                self.index = faiss.read_index(self.index_path)
            if os.path.exists(self.chunks_path):
                with open(self.chunks_path, "rb") as f:
                    self.chunks = pickle.load(f)
            self._build_bm25()
            self.reload_topics()
            print(f"[RAG] Index reloaded: {len(self.chunks)} chunks")
        except Exception as e:
            print(f"[Warning] Index reload: {e}")

    def clear_history(self, session_id: str = "default"):
        if self.memory:
            self.memory.clear(session_id)
        print(f"[RAG] Memory cleared: {session_id}")

    def get_stats(self) -> dict:
        mem_stats = self.memory.stats() if self.memory else {}
        return {
            "total_queries":   self.query_count,
            "total_tokens":    self.total_tokens,
            "chunks_indexed":  len(self.chunks),
            "model":           self.model_name,
            "uploaded_files":  self.uploaded_files,
            "doc_topics":      self.doc_topics,
            "bm25_enabled":    BM25_AVAILABLE and self.bm25 is not None,
            "hybrid_search":   BM25_AVAILABLE,
            **mem_stats,
        }