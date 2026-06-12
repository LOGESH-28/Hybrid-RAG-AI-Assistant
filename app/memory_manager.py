# ===== memory_manager.py — Phase 2: Session Memory & Context Management =====
"""
Conversational memory with:
- Sliding window (last N turns)
- Auto-summarization when context grows too long
- Per-session storage
- File context tracking
"""
import time
from collections import defaultdict


class MemoryManager:
    """
    Manages multi-session conversational memory.
    Each session stores a list of {role, content, timestamp} messages.
    Automatically summarizes when conversation exceeds max_turns.
    """

    def __init__(self, max_turns: int = 12, summary_threshold: int = 20):
        self.sessions: dict[str, list[dict]] = defaultdict(list)
        self.session_files: dict[str, list[str]] = defaultdict(list)  # uploaded files per session
        self.session_summaries: dict[str, str] = {}  # compressed summaries
        self.max_turns = max_turns
        self.summary_threshold = summary_threshold

    # ── Message Management ──────────────────────────────────────────────────
    def add(self, session_id: str, role: str, content: str):
        """Add a message to session history."""
        self.sessions[session_id].append({
            "role":      role,
            "content":   content,
            "timestamp": time.time(),
        })

    def add_file(self, session_id: str, filename: str):
        """Track an uploaded file for a session."""
        if filename not in self.session_files[session_id]:
            self.session_files[session_id].append(filename)

    def get_files(self, session_id: str) -> list[str]:
        """Get files uploaded in this session."""
        return self.session_files.get(session_id, [])

    def get_history(self, session_id: str, max_turns: int = None) -> list[dict]:
        """Return recent messages as {role, content} list for LLM injection."""
        n = max_turns or self.max_turns
        msgs = self.sessions.get(session_id, [])
        recent = msgs[-n * 2:]  # n turns = n*2 messages (user+assistant)
        return [{"role": m["role"], "content": m["content"]} for m in recent]

    def get_summary(self, session_id: str) -> str:
        """Get any existing conversation summary."""
        return self.session_summaries.get(session_id, "")

    def should_summarize(self, session_id: str) -> bool:
        """Check if the conversation is long enough to need summarization."""
        return len(self.sessions.get(session_id, [])) >= self.summary_threshold

    def compress(self, session_id: str, groq_client, model: str) -> str:
        """
        Summarize older messages into a compact context string.
        Keeps only the last 4 turns after summarization.
        """
        msgs = self.sessions.get(session_id, [])
        if len(msgs) < self.summary_threshold:
            return ""

        # Keep last 4 messages fresh; summarize the rest
        to_summarize = msgs[:-4]
        keep_fresh   = msgs[-4:]

        conversation_text = "\n".join(
            f"{m['role'].upper()}: {m['content'][:200]}" for m in to_summarize
        )

        try:
            resp = groq_client.chat.completions.create(
                model=model,
                messages=[{
                    "role":    "user",
                    "content": f"Summarize this conversation in 3-5 sentences, capturing key facts and context:\n\n{conversation_text}"
                }],
                temperature=0.3,
                max_tokens=300,
                stream=False,
            )
            summary = resp.choices[0].message.content.strip()
        except Exception as e:
            summary = f"[Earlier conversation about: {', '.join(set(m['content'][:30] for m in to_summarize[:3]))}]"

        self.session_summaries[session_id] = summary
        self.sessions[session_id] = keep_fresh  # reset to fresh tail
        print(f"🧠 Memory compressed: {len(to_summarize)} msgs → summary")
        return summary

    def build_system_context(self, session_id: str) -> str:
        """
        Build a context block to inject into system prompt.
        Includes summary + tracked files.
        """
        parts = []
        summary = self.get_summary(session_id)
        files   = self.get_files(session_id)

        if summary:
            parts.append(f"[Earlier conversation summary]\n{summary}")
        if files:
            parts.append(f"[Files uploaded this session]\n" + "\n".join(f"• {f}" for f in files))

        return "\n\n".join(parts)

    def clear(self, session_id: str):
        """Clear all memory for a session."""
        self.sessions.pop(session_id, None)
        self.session_files.pop(session_id, None)
        self.session_summaries.pop(session_id, None)

    def stats(self) -> dict:
        """Return memory statistics."""
        return {
            "active_sessions": len(self.sessions),
            "total_messages":  sum(len(v) for v in self.sessions.values()),
        }


# Global singleton
_memory = MemoryManager()

def get_memory() -> MemoryManager:
    return _memory
