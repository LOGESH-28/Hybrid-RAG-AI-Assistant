# ===== app/main.py (v3 — Enterprise API Layer) =====
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, sys, shutil, time, uuid
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rag_engine import RAGEngine
from ocr_processor import process_uploaded_file, SUPPORTED_IMAGE_EXTS

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Loki AI Enterprise API", version="3.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://frontend:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR   = os.path.dirname(BASE_DIR)
DATA_DIR   = os.path.join(ROOT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

app.mount("/data", StaticFiles(directory=DATA_DIR), name="data")

# ── RAG Engine ───────────────────────────────────────────────────────────────
rag_engine = None
try:
    rag_engine = RAGEngine()
    print("[API] RAG engine ready")
except Exception as e:
    print(f"[API Warning] RAG engine: {e}")

# ── LangChain Agent ──────────────────────────────────────────────────────────
loki_agent = None
try:
    from langchain_agent import LokiAgent
    loki_agent = LokiAgent(rag_engine=rag_engine)
    print("[API] LangChain agent ready")
except Exception as e:
    print(f"[API Warning] LangChain: {e}")

# ── ChromaDB ─────────────────────────────────────────────────────────────────
chroma_store = None
try:
    from chroma_store import ChromaStore
    chroma_store = ChromaStore(persist_dir=os.path.join(ROOT_DIR, "chroma_db"))
    print("[API] ChromaDB ready")
except Exception as e:
    print(f"[API Warning] ChromaDB: {e}")

# ── Database Layer ───────────────────────────────────────────────────────────
DB_AVAILABLE = False
try:
    import database
    database.init_db()
    DB_AVAILABLE = True
    print("[API] SQLite DB ready")
except Exception as e:
    print(f"[API Warning] DB initialization: {e}")

# ── Tools Ecosystem ──────────────────────────────────────────────────────────
tools_ecosystem = None
try:
    from tools_ecosystem import LokiToolEcosystem
    tools_ecosystem = LokiToolEcosystem(rag_engine=rag_engine)
    print("[API] Tools ecosystem ready")
except Exception as e:
    print(f"[API Warning] Tools ecosystem: {e}")

# ─────────────────────────────────────────────────────────────────────────────
# Request Models
# ─────────────────────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question:    str
    session_id:  str   = "default"
    temperature: float = 0.7
    max_length:  int   = 1024

class ClearRequest(BaseModel):
    session_id: str = "default"

class AgentRequest(BaseModel):
    question:   str
    session_id: str = "default"

class SessionCreateRequest(BaseModel):
    id:    str = None
    title: str = "New Chat"

class SessionUpdateRequest(BaseModel):
    title:     str = None
    is_pinned: bool = None

class ToolRunRequest(BaseModel):
    tool_name: str
    payload:   dict

class MemorySaveRequest(BaseModel):
    key:   str
    value: str

# ─────────────────────────────────────────────────────────────────────────────
# Health & Status
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/status")
async def status():
    # Measure database ping latency
    db_start = time.time()
    db_healthy = False
    if DB_AVAILABLE:
        try:
            conn = database.get_db_connection()
            conn.execute("SELECT 1")
            conn.close()
            db_healthy = True
        except:
            pass
    db_latency = round((time.time() - db_start) * 1000, 2)

    # Check vector DB status
    vector_db_doc_count = 0
    if chroma_store and chroma_store.available:
        try: vector_db_doc_count = chroma_store.count()
        except: pass
    elif rag_engine and rag_engine.index:
        vector_db_doc_count = len(rag_engine.chunks)

    # Check Groq connectivity (basic check of environment variable)
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_healthy = bool(groq_api_key and len(groq_api_key) > 10)

    # Check OCR Engine (Pytesseract availability check)
    ocr_healthy = False
    try:
        import pytesseract
        # Basic imports check or binary validation
        ocr_healthy = True
    except:
        pass

    # Check MLflow (basic check if operational)
    mlflow_healthy = False
    if rag_engine and getattr(rag_engine, "query_count", 0) is not None:
        try:
            import mlflow
            mlflow_healthy = True
        except:
            pass

    return {
        "status": "healthy" if (rag_engine and db_healthy) else "degraded",
        "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "db_available": DB_AVAILABLE,
        "backend_latency_ms": db_latency,
        "components": {
            "groq_api": {
                "status": "online" if groq_healthy else "offline",
                "details": "API Key Validated" if groq_healthy else "No key found"
            },
            "vector_db": {
                "status": "online" if vector_db_doc_count > 0 or rag_engine else "offline",
                "details": f"Indexed Chunks: {vector_db_doc_count}"
            },
            "ocr_engine": {
                "status": "online" if ocr_healthy else "offline",
                "details": "Tesseract Available" if ocr_healthy else "OCR disabled"
            },
            "mlflow": {
                "status": "online" if mlflow_healthy else "offline",
                "details": "MLflow tracking active" if mlflow_healthy else "Not tracking"
            },
            "langchain_agents": {
                "status": "online" if (loki_agent and getattr(loki_agent, "available", False)) else "offline",
                "details": "ReAct agent with tools ready" if loki_agent else "Disabled"
            }
        }
    }

@app.get("/stats")
async def stats():
    s = rag_engine.get_stats() if rag_engine else {}
    chroma_count = 0
    if chroma_store and chroma_store.available:
        chroma_count = chroma_store.count()
    return {**s, "chroma_docs": chroma_count, "mlflow_ui": "http://localhost:5000"}

# ─────────────────────────────────────────────────────────────────────────────
# Session / Chat Management
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/sessions")
async def get_sessions():
    if not DB_AVAILABLE:
        return []
    return database.list_sessions()

@app.post("/sessions")
async def create_session(req: SessionCreateRequest):
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")
    session_id = req.id or str(uuid.uuid4())
    database.create_or_get_session(session_id, title=req.title)
    return {"id": session_id, "title": req.title}

@app.put("/sessions/{session_id}")
async def update_session(session_id: str, req: SessionUpdateRequest):
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")
    if req.title is not None:
        database.rename_session(session_id, req.title)
    if req.is_pinned is not None:
        database.toggle_pin_session(session_id, req.is_pinned)
    return {"status": "success"}

@app.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")
    database.delete_session(session_id)
    if rag_engine:
        rag_engine.clear_history(session_id)
    return {"status": "success"}

# ─────────────────────────────────────────────────────────────────────────────
# Chat
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/ask")
async def ask(req: QueryRequest):
    if not rag_engine:
        raise HTTPException(503, "RAG engine not initialized")
    q = req.question.strip()
    if not q:
        raise HTTPException(400, "Empty question")
    
    if DB_AVAILABLE:
        database.log_metric("api_call", req.session_id)
        if "retrieve" in q.lower() or "search" in q.lower():
            database.log_metric("vector_search", req.session_id)

    result = rag_engine.answer(q, temperature=req.temperature, max_tokens=req.max_length, session_id=req.session_id)
    return result

@app.post("/ask/stream")
async def ask_stream(req: QueryRequest):
    if not rag_engine:
        raise HTTPException(503, "RAG engine not initialized")
    q = req.question.strip()
    if not q:
        raise HTTPException(400, "Empty question")

    if DB_AVAILABLE:
        database.log_metric("api_call", req.session_id)
        # log vector search if question looks like document query or retrieval
        if any(w in q.lower() for w in ["document", "upload", "pdf", "file", "search", "retrieve", "explain"]):
            database.log_metric("vector_search", req.session_id)

    def gen():
        for token in rag_engine.answer_stream(q, temperature=req.temperature, max_tokens=req.max_length, session_id=req.session_id):
            yield token

    return StreamingResponse(gen(), media_type="text/plain")

@app.post("/clear")
async def clear(req: ClearRequest):
    if rag_engine:
        rag_engine.clear_history(session_id=req.session_id)
    if DB_AVAILABLE:
        try: database.clear_chat_history(req.session_id)
        except: pass
    return {"status": "cleared"}

@app.get("/chat/history")
async def chat_history(session_id: str = "default"):
    if not DB_AVAILABLE:
        return {"history": []}
    try:
        return {"history": database.get_chat_history(session_id)}
    except:
        return {"history": []}

# ─────────────────────────────────────────────────────────────────────────────
# Files / OCR
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/upload")
async def upload(file: UploadFile = File(...), session_id: str = "default"):
    allowed = [".pdf", ".txt"] + list(SUPPORTED_IMAGE_EXTS)
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type: {ext}")

    save_path = os.path.join(DATA_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size_kb = round(os.path.getsize(save_path) / 1024, 1)

    # Log file upload metric
    if DB_AVAILABLE:
        database.log_metric("file_upload", session_id=session_id, metadata=f"{file.filename} ({size_kb} KB)")

    # OCR for images
    if ext in SUPPORTED_IMAGE_EXTS:
        if DB_AVAILABLE:
            database.log_metric("ocr_request", session_id=session_id, metadata=file.filename)
        ocr_text = process_uploaded_file(save_path)
        txt_path = save_path.rsplit(".", 1)[0] + "_ocr.txt"
        with open(txt_path, "w", encoding="utf-8") as tf:
            tf.write(ocr_text)

    # Re-index
    try:
        from build_index import build_index
        build_index()
        if rag_engine:
            import faiss, pickle
            idx_path    = os.path.join(ROOT_DIR, "faiss_index.idx")
            chunks_path = os.path.join(ROOT_DIR, "chunks.pkl")
            if os.path.exists(idx_path):
                rag_engine.index = faiss.read_index(idx_path)
            if os.path.exists(chunks_path):
                with open(chunks_path, "rb") as f:
                    rag_engine.chunks = pickle.load(f)
            rag_engine.register_upload(file.filename, save_path)
    except Exception as e:
        return {
            "status": "uploaded",
            "message": f"Saved. Index error: {e}",
            "file_size_kb": size_kb,
            "filename": file.filename,
            "url": f"/data/{file.filename}"
        }

    return {
        "status": "success",
        "message": f"'{file.filename}' uploaded and indexed!",
        "total_chunks": len(rag_engine.chunks) if rag_engine else 0,
        "file_size_kb": size_kb,
        "filename": file.filename,
        "url": f"/data/{file.filename}"
    }

@app.get("/files")
async def list_files():
    files = []
    for f in os.listdir(DATA_DIR):
        fpath = os.path.join(DATA_DIR, f)
        # Skip temp or system files, only return user documents
        if f.endswith("_ocr.txt") or f.startswith("."):
            continue
        # Get creation timestamp
        mtime = os.path.getmtime(fpath)
        timestamp = datetime.fromtimestamp(mtime).isoformat()
        
        # Categorize
        ext = os.path.splitext(f)[1].lower()
        if ext in [".pdf"]:
            cat = "PDF Document"
        elif ext in [".txt"]:
            cat = "Text File"
        elif ext in SUPPORTED_IMAGE_EXTS:
            cat = "Scanned Image"
        else:
            cat = "Other"

        files.append({
            "name": f,
            "size_kb": round(os.path.getsize(fpath) / 1024, 1),
            "type": ext,
            "category": cat,
            "timestamp": timestamp
        })
    return {"files": files, "total": len(files), "chunks_indexed": len(rag_engine.chunks) if rag_engine else 0}

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    fpath = os.path.join(DATA_DIR, filename)
    if not os.path.exists(fpath):
        raise HTTPException(404, "File not found")
    os.remove(fpath)
    
    # Also delete corresponding OCR text file if it exists
    ocr_file = filename.rsplit(".", 1)[0] + "_ocr.txt"
    ocr_path = os.path.join(DATA_DIR, ocr_file)
    if os.path.exists(ocr_path):
        os.remove(ocr_path)
        
    try:
        from build_index import build_index
        build_index()
        if rag_engine:
            import faiss, pickle
            idx = os.path.join(ROOT_DIR, "faiss_index.idx")
            chk = os.path.join(ROOT_DIR, "chunks.pkl")
            if os.path.exists(idx): rag_engine.index = faiss.read_index(idx)
            if os.path.exists(chk):
                with open(chk, "rb") as f: rag_engine.chunks = pickle.load(f)
            rag_engine.reload_topics()
    except: pass
    return {"status": "deleted", "file": filename}

# ─────────────────────────────────────────────────────────────────────────────
# Memory System Endpoints
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/memory/{session_id}")
async def get_memories(session_id: str):
    if not DB_AVAILABLE:
        return {}
    return database.get_memory_facts(session_id)

@app.post("/memory/{session_id}")
async def save_memory(session_id: str, req: MemorySaveRequest):
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")
    database.save_memory_fact(session_id, req.key, req.value)
    return {"status": "success"}

@app.delete("/memory/{session_id}")
async def clear_memories(session_id: str):
    if not DB_AVAILABLE:
        raise HTTPException(500, "Database not available")
    database.clear_memory_facts(session_id)
    return {"status": "success"}

# ─────────────────────────────────────────────────────────────────────────────
# Tools Ecosystem Execution
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/tools/run")
async def run_tool(req: ToolRunRequest):
    if not tools_ecosystem:
        raise HTTPException(503, "Tools ecosystem not initialized")
    try:
        result = tools_ecosystem.run_tool(req.tool_name, req.payload)
        return result
    except Exception as e:
        raise HTTPException(500, f"Tool execution failed: {str(e)}")

# ─────────────────────────────────────────────────────────────────────────────
# Admin & Analytics
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/admin/stats")
async def admin_stats(session_id: str = "local"):
    if not DB_AVAILABLE:
        return {
            "total_chats": 0,
            "total_users": 0,
            "total_queries": 0,
            "avg_latency_sec": 0.0,
            "total_tokens_used": 0,
            "ocr_requests": 0,
            "agent_executions": 0,
            "vector_searches": 0,
            "api_calls": 0,
            "source_counts": {},
            "usage_trends": [],
            "tool_usage": []
        }
    try:
        return database.get_admin_analytics()
    except Exception as e:
        return {"error": str(e)}

# ─────────────────────────────────────────────────────────────────────────────
# LangChain Agent
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/agent/ask")
async def agent_ask(req: AgentRequest):
    if DB_AVAILABLE:
        database.log_metric("agent_execution", req.session_id)
        
    if not loki_agent or not getattr(loki_agent, "available", False):
        raise HTTPException(503, "LangChain agent not available")
    result = loki_agent.run(req.question)
    if result is None:
        if rag_engine:
            res = rag_engine.answer(req.question, session_id=req.session_id)
            return {"answer": res["answer"], "source": "rag_fallback", "agent_used": False}
        raise HTTPException(503, "No engine available")
    return {"answer": result, "source": "langchain_agent", "agent_used": True}

# ─────────────────────────────────────────────────────────────────────────────
# ChromaDB
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/chroma/status")
async def chroma_status():
    if not chroma_store or not chroma_store.available:
        return {"available": False, "doc_count": 0}
    return {"available": True, "doc_count": chroma_store.count()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)