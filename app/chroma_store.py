# ===== chroma_store.py =====
"""
ChromaDB Vector Store for Loki AI
Provides persistent, semantic vector search as an alternative to FAISS.
Stores documents with metadata (source file, page, chunk index).
"""
import os

try:
    import chromadb
    from chromadb.config import Settings
    CHROMA_AVAILABLE = True
    print("✅ ChromaDB available")
except ImportError:
    CHROMA_AVAILABLE = False
    print("⚠️  ChromaDB not installed — ChromaDB store disabled")


class ChromaStore:
    """
    Persistent ChromaDB-backed vector store.
    Embedding is handled externally (sentence-transformers) to keep
    consistency with the FAISS pipeline.
    """

    def __init__(self, persist_dir: str = "/app/chroma_db"):
        self.available = CHROMA_AVAILABLE
        if not self.available:
            return

        os.makedirs(persist_dir, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=persist_dir,
            settings=Settings(anonymized_telemetry=False)
        )
        self.collection = self.client.get_or_create_collection(
            name="loki_docs",
            metadata={"hnsw:space": "cosine"}
        )
        print(f"✅ ChromaDB initialized | Collection: loki_docs | Docs: {self.collection.count()}")

    def add_documents(self, chunks: list[str], embeddings: list, metadata: list[dict] = None):
        """
        Add text chunks with pre-computed embeddings to ChromaDB.

        Args:
            chunks: List of text strings
            embeddings: List of embedding vectors (numpy arrays or lists)
            metadata: Optional list of dicts with source info per chunk
        """
        if not self.available:
            return

        if metadata is None:
            metadata = [{"source": "unknown", "chunk_index": i} for i in range(len(chunks))]

        ids = [f"chunk_{i}_{hash(c) % 999999}" for i, c in enumerate(chunks)]

        # Convert numpy arrays to lists for ChromaDB
        emb_lists = [e.tolist() if hasattr(e, "tolist") else e for e in embeddings]

        self.collection.upsert(
            ids=ids,
            documents=chunks,
            embeddings=emb_lists,
            metadatas=metadata
        )
        print(f"✅ ChromaDB: Upserted {len(chunks)} chunks | Total: {self.collection.count()}")

    def query(self, query_embedding: list, top_k: int = 5) -> list[str]:
        """
        Retrieve top-k relevant chunks for a given query embedding.

        Returns:
            List of matching document text strings
        """
        if not self.available or self.collection.count() == 0:
            return []

        emb = query_embedding.tolist() if hasattr(query_embedding, "tolist") else query_embedding

        results = self.collection.query(
            query_embeddings=[emb],
            n_results=min(top_k, self.collection.count()),
            include=["documents", "distances", "metadatas"]
        )

        docs = results.get("documents", [[]])[0]
        return docs

    def delete_by_source(self, source_filename: str):
        """Remove all chunks that originated from a specific file."""
        if not self.available:
            return
        try:
            results = self.collection.get(where={"source": source_filename})
            ids_to_delete = results.get("ids", [])
            if ids_to_delete:
                self.collection.delete(ids=ids_to_delete)
                print(f"🗑️ ChromaDB: Removed {len(ids_to_delete)} chunks from '{source_filename}'")
        except Exception as e:
            print(f"⚠️ ChromaDB delete error: {e}")

    def count(self) -> int:
        """Return total document count in the collection."""
        if not self.available:
            return 0
        return self.collection.count()

    def reset(self):
        """Clear the entire ChromaDB collection."""
        if not self.available:
            return
        self.client.delete_collection("loki_docs")
        self.collection = self.client.get_or_create_collection(
            name="loki_docs",
            metadata={"hnsw:space": "cosine"}
        )
        print("🔄 ChromaDB collection reset.")
