<div align="center">

# 🤖 Loki AI — Hybrid RAG AI Assistant

**Enterprise-grade AI assistant powered by Hybrid Retrieval-Augmented Generation**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![LangChain](https://img.shields.io/badge/LangChain-Agent-1C3C3C?logo=langchain&logoColor=white)](https://langchain.com)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.3_70B-F55036?logo=groq&logoColor=white)](https://groq.com)
[![MLflow](https://img.shields.io/badge/MLflow-Tracking-0194E2?logo=mlflow&logoColor=white)](https://mlflow.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

*Combines local document retrieval (FAISS + ChromaDB + BM25) with live web search (DuckDuckGo) and a LangChain ReAct agent — all behind a streaming FastAPI backend and a polished React UI.*

</div>

---

## ✨ Features

| Category | Capabilities |
|----------|-------------|
| 🔍 **Hybrid Retrieval** | FAISS dense search + BM25 sparse search + ChromaDB persistent store with score-based fusion |
| 🤖 **LLM** | Groq-hosted **LLaMA 3.3 70B** with streaming token output |
| 🧠 **LangChain Agent** | ReAct agent with Web Search, Document Search, and Calculator tools |
| 📄 **Document Ingestion** | PDF, TXT, and scanned images (OCR via Tesseract + OpenCV) |
| 🌐 **Web Fallback** | DuckDuckGo search when local context is insufficient |
| 💬 **Multi-Session Chat** | Persistent chat history per session via SQLite |
| 📊 **Analytics Dashboard** | Real-time MLflow experiment tracking + React Recharts UI |
| 🗂️ **File Manager** | Upload, browse, and delete indexed documents from the UI |
| 🔒 **Memory System** | Per-session key/value memory facts stored in SQLite |
| 🐳 **Docker Ready** | Full `docker-compose.yml` for backend, frontend, and MLflow |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  Landing Page · Chat · File Manager · Analytics Dashboard    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP / SSE Streaming
┌───────────────────────────▼─────────────────────────────────┐
│              FastAPI Backend  (app/main.py)                  │
│                                                              │
│  ┌─────────────────┐   ┌──────────────────────────────────┐ │
│  │  RAG Engine     │   │    LangChain ReAct Agent         │ │
│  │  rag_engine.py  │   │    langchain_agent.py            │ │
│  │                 │   │                                  │ │
│  │  ┌───────────┐  │   │  Tools:                          │ │
│  │  │ FAISS     │  │   │  · Web Search (DuckDuckGo)       │ │
│  │  │ ChromaDB  │  │   │  · Document Search (RAG)         │ │
│  │  │ BM25      │  │   │  · Calculator (eval)             │ │
│  │  └───────────┘  │   └──────────────────────────────────┘ │
│  └─────────────────┘                                         │
│                                                              │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────┐  │
│  │ SQLite   │  │ OCR Engine  │  │  MLflow  │  │  Groq   │  │
│  │ database │  │ (Tesseract) │  │ Tracking │  │  API    │  │
│  └──────────┘  └─────────────┘  └──────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
Hybrid-RAG-AI-Assistant/
├── app/
│   ├── main.py              # FastAPI application & all API routes
│   ├── rag_engine.py        # Hybrid RAG: FAISS + BM25 + ChromaDB + Groq streaming
│   ├── langchain_agent.py   # ReAct agent (Web Search · Doc Search · Calculator)
│   ├── build_index.py       # Document ingestion & FAISS index builder
│   ├── chroma_store.py      # ChromaDB vector store wrapper
│   ├── database.py          # SQLite: sessions, chat history, memory, analytics
│   ├── memory_manager.py    # Per-session memory facts
│   ├── ocr_processor.py     # Tesseract OCR for scanned images
│   ├── tools_ecosystem.py   # Modular tool runner
│   └── web_retriever.py     # DuckDuckGo web search fallback
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Hero landing page
│   │   │   └── ChatPage.jsx         # Main chat interface
│   │   ├── components/
│   │   │   ├── ChatArea.jsx         # Message rendering & streaming
│   │   │   ├── Sidebar.jsx          # Session management
│   │   │   ├── InputBar.jsx         # Message input + file upload
│   │   │   ├── FileManager.jsx      # Document manager panel
│   │   │   ├── AnalyticsDashboard.jsx # MLflow metrics + charts
│   │   │   ├── SettingsPanel.jsx    # LLM parameter controls
│   │   │   ├── ToolsEcosystem.jsx   # Tool panel UI
│   │   │   └── MessageBubble.jsx    # Individual message component
│   │   ├── hooks/
│   │   │   ├── useChat.js           # Chat state & API calls
│   │   │   └── useVoice.js          # Voice input hook
│   │   ├── store/
│   │   │   └── chatStore.js         # Zustand global state
│   │   └── services/
│   │       └── api.js               # Axios API client
│   ├── Dockerfile
│   └── package.json
├── templates/                        # Legacy HTML/CSS/JS UI (static fallback)
├── .env.example                      # Environment variable template
├── .gitignore
├── .dockerignore
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- [Groq API Key](https://console.groq.com) *(free tier available)*
- Tesseract OCR *(optional — for image/scanned PDF support)*

### 1. Clone the Repository

```bash
git clone https://github.com/LOGESH-28/Hybrid-RAG-AI-Assistant.git
cd Hybrid-RAG-AI-Assistant
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
MLFLOW_TRACKING_URI=sqlite:///mlflow.db
HF_HOME=/app/hf_cache
```

### 3a. Run with Docker Compose *(Recommended)*

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| React Frontend | http://localhost:3000 |
| FastAPI Backend | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| MLflow Tracking UI | http://localhost:5000 |

### 3b. Run Locally (Manual)

**Backend:**

```bash
# Create & activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Build the vector index (after placing documents in data/)
python app/build_index.py

# Start the API server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 📖 Usage

### Uploading Documents

1. Click the **📎 Upload** button in the chat input bar or open the **File Manager** panel.
2. Supported formats: `.pdf`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff`
3. Documents are automatically chunked, embedded, and indexed into FAISS + ChromaDB.

### Asking Questions

- **Local Knowledge**: Ask about anything in your uploaded documents — the hybrid retriever fuses dense (FAISS) and sparse (BM25) results.
- **Web Search Fallback**: If no sufficient local context is found, Loki automatically searches the web via DuckDuckGo.
- **LangChain Agent Mode**: Toggle Agent Mode in Settings to enable the ReAct agent with tool-use reasoning.

### Session Management

- Create multiple named chat sessions from the **Sidebar**.
- Each session has independent chat history and memory facts.
- Pin important sessions to keep them at the top.

### Analytics Dashboard

- Open the **Analytics** tab to view real-time metrics tracked via MLflow:
  - Total queries, API calls, file uploads, OCR requests
  - Agent execution counts, vector search hits
  - Usage trends over time

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/status` | Health check with component status |
| `GET` | `/stats` | RAG engine & ChromaDB statistics |
| `POST` | `/ask` | One-shot RAG query |
| `POST` | `/ask/stream` | Streaming token response (SSE) |
| `POST` | `/agent/ask` | LangChain ReAct agent query |
| `POST` | `/upload` | Upload & index a document |
| `GET` | `/files` | List all indexed files |
| `DELETE` | `/files/{filename}` | Delete a file and re-index |
| `GET` | `/sessions` | List all chat sessions |
| `POST` | `/sessions` | Create a new chat session |
| `PUT` | `/sessions/{id}` | Rename or pin a session |
| `DELETE` | `/sessions/{id}` | Delete a session |
| `GET` | `/chat/history` | Retrieve chat history for a session |
| `POST` | `/clear` | Clear chat history for a session |
| `GET` | `/memory/{session_id}` | Get memory facts |
| `POST` | `/memory/{session_id}` | Save a memory fact |
| `POST` | `/tools/run` | Execute a tool from the ecosystem |
| `GET` | `/admin/stats` | Full analytics for the dashboard |
| `GET` | `/chroma/status` | ChromaDB availability & doc count |
| `GET` | `/docs` | Interactive Swagger UI |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **LLM** | Groq API — LLaMA 3.3 70B Versatile |
| **Embeddings** | SentenceTransformers (`all-MiniLM-L6-v2`) |
| **Vector DB** | FAISS (dense) + ChromaDB (persistent) |
| **Sparse Search** | BM25 (`rank-bm25`) |
| **Agent Framework** | LangChain ReAct + ConversationBufferMemory |
| **Web Search** | DuckDuckGo Search API |
| **OCR** | Tesseract + OpenCV |
| **Backend** | FastAPI + Uvicorn + Pydantic v2 |
| **Database** | SQLite (chat history, sessions, analytics) |
| **Experiment Tracking** | MLflow (SQLite backend) |
| **Frontend** | React 18 + Vite + Zustand + Recharts |
| **Containerisation** | Docker + Docker Compose |

---

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ Yes | — | Your Groq API key ([get one](https://console.groq.com)) |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Groq model to use |
| `MLFLOW_TRACKING_URI` | No | `sqlite:///mlflow.db` | MLflow tracking backend URI |
| `HF_HOME` | No | `/app/hf_cache` | HuggingFace cache directory |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Logesh S**

[![GitHub](https://img.shields.io/badge/GitHub-LOGESH--28-181717?logo=github)](https://github.com/LOGESH-28)

---

<div align="center">
  <sub>Built with ❤️ using FastAPI · LangChain · Groq · React</sub>
</div>