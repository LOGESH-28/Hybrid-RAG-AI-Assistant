# ===== langchain_agent.py =====
"""
LangChain Agent Workflows for Loki AI
Provides tool-equipped agents that can:
  - Search the web (DuckDuckGo)
  - Query local FAISS/ChromaDB knowledge base
  - Do math calculations
  - Summarize long documents step-by-step
"""
import os

try:
    from langchain_community.tools import DuckDuckGoSearchRun
    from langchain.agents import initialize_agent, AgentType, Tool
    from langchain.memory import ConversationBufferMemory
    LANGCHAIN_AVAILABLE = True
    print("✅ LangChain available")
except ImportError:
    try:
        # Fallback for older langchain versions
        from langchain.tools import DuckDuckGoSearchRun
        from langchain.agents import initialize_agent, AgentType, Tool
        from langchain.memory import ConversationBufferMemory
        LANGCHAIN_AVAILABLE = True
        print("✅ LangChain available (legacy import)")
    except ImportError:
        LANGCHAIN_AVAILABLE = False
        print("⚠️  LangChain not installed — agent workflows disabled")


# ===== Groq-backed LangChain LLM wrapper =====
if LANGCHAIN_AVAILABLE:
    from langchain.llms.base import LLM
    from typing import Optional, List, Any

    class GroqLLM(LLM):
        """Minimal LangChain-compatible wrapper around Groq API."""

        model_name: str = "llama-3.3-70b-versatile"
        groq_api_key: str = ""
        temperature: float = 0.5
        max_tokens: int = 1024

        class Config:
            arbitrary_types_allowed = True

        @property
        def _llm_type(self) -> str:
            return "groq"

        def _call(self, prompt: str, stop: Optional[List[str]] = None, **kwargs) -> str:
            try:
                import httpx
                from groq import Groq
                client = Groq(api_key=self.groq_api_key, http_client=httpx.Client())
            except Exception:
                from groq import Groq
                client = Groq(api_key=self.groq_api_key)

            response = client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                stream=False
            )
            return response.choices[0].message.content or ""

        @property
        def _identifying_params(self):
            return {"model_name": self.model_name}


# ===== LangChain Agent Factory =====
class LokiAgent:
    """
    Creates a conversational LangChain ReAct agent with:
      - Web Search (DuckDuckGo)
      - RAG local KB query
      - Math evaluation
    """

    def __init__(self, rag_engine=None):
        self.available = LANGCHAIN_AVAILABLE
        self.agent = None
        self.memory = None

        if not self.available:
            return

        api_key = os.getenv("GROQ_API_KEY", "")
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

        llm = GroqLLM(
            groq_api_key=api_key,
            model_name=model,
            temperature=0.4,
            max_tokens=1024
        )

        tools = []

        # Tool 1: Web Search
        try:
            search = DuckDuckGoSearchRun()
            tools.append(Tool(
                name="Web Search",
                func=search.run,
                description="Search the web for current information, news, facts, or anything not in local documents."
            ))
        except Exception as e:
            print(f"⚠️ Web search tool init failed: {e}")

        # Tool 2: Local Document RAG
        if rag_engine is not None:
            def local_rag_query(query: str) -> str:
                context, sources = rag_engine.retrieve_local(query, top_k=5)
                if context:
                    return f"From local documents:\n{context}"
                return "No relevant information found in local documents."

            tools.append(Tool(
                name="Document Search",
                func=local_rag_query,
                description="Search uploaded documents and local knowledge base for specific information."
            ))

        # Tool 3: Math
        def safe_math(expression: str) -> str:
            try:
                result = eval(expression, {"__builtins__": {}}, {})
                return str(result)
            except Exception as e:
                return f"Math error: {e}"

        tools.append(Tool(
            name="Calculator",
            func=safe_math,
            description="Evaluate simple mathematical expressions. Input must be a valid Python math expression."
        ))

        self.memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True
        )

        try:
            self.agent = initialize_agent(
                tools=tools,
                llm=llm,
                agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
                memory=self.memory,
                verbose=False,
                handle_parsing_errors=True,
                max_iterations=4
            )
            print("✅ LangChain agent ready with tools:", [t.name for t in tools])
        except Exception as e:
            print(f"⚠️ LangChain agent init failed: {e}")
            self.agent = None

    def run(self, query: str) -> str:
        """Run a query through the LangChain agent."""
        if not self.available or self.agent is None:
            return None  # Signal caller to fall back to standard RAG
        try:
            result = self.agent.run(query)
            return result
        except Exception as e:
            print(f"⚠️ LangChain agent error: {e}")
            return None

    def clear_memory(self):
        """Reset agent conversation memory."""
        if self.memory:
            self.memory.clear()
