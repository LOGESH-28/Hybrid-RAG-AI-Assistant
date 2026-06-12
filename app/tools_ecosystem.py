import os
import time
from groq import Groq
import httpx

class LokiToolEcosystem:
    def __init__(self, rag_engine=None):
        self.rag_engine = rag_engine
        api_key = os.getenv("GROQ_API_KEY")
        try:
            self.client = Groq(api_key=api_key, http_client=httpx.Client())
        except Exception:
            self.client = Groq(api_key=api_key)
        self.model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

    def run_tool(self, tool_name: str, payload: dict) -> dict:
        start_time = time.time()
        tool_lower = tool_name.lower().replace(" ", "_")
        
        # Log metric for agent execution
        try:
            from database import log_metric
            log_metric("agent_execution", metadata=tool_name)
        except:
            pass

        if tool_lower == "pdf_analyzer":
            result = self._analyze_pdf(payload)
        elif tool_lower == "ocr_reader":
            result = self._read_ocr(payload)
        elif tool_lower == "resume_analyzer":
            result = self._analyze_resume(payload)
        elif tool_lower == "research_assistant":
            result = self._research_assistant(payload)
        elif tool_lower == "web_search_agent":
            result = self._web_search_agent(payload)
        elif tool_lower == "code_assistant":
            result = self._code_assistant(payload)
        elif tool_lower == "summarizer":
            result = self._summarize(payload)
        elif tool_lower == "presentation_generator":
            result = self._presentation_generator(payload)
        else:
            return {"error": f"Tool '{tool_name}' not found."}

        latency = round(time.time() - start_time, 2)
        return {
            "tool": tool_name,
            "status": "success",
            "result": result,
            "latency_sec": latency
        }

    # --- Tool Implementations ---

    def _analyze_pdf(self, payload: dict) -> str:
        filename = payload.get("filename")
        user_prompt = payload.get("prompt", "Analyze the key points of this document.")
        
        if not filename:
            return "Error: No filename provided."
        
        # If rag_engine is available, fetch preview or chunks
        if self.rag_engine:
            # Retrieve relevant text chunks for this filename
            relevant_chunks = [c for c in self.rag_engine.chunks if isinstance(c, dict) and c.get("source") == filename]
            if not relevant_chunks:
                # Fallback to preview content
                content = self.rag_engine.uploaded_contents.get(filename, "")
            else:
                content = "\n\n".join(c["text"] for c in relevant_chunks[:10])
        else:
            content = ""

        if not content:
            return f"Error: Document '{filename}' is empty or not indexed."

        prompt = f"""You are an Expert PDF Analyzer. Analyze the document contents below and answer the user's prompt.
        
        Document Name: {filename}
        Document Text Snippet:
        ---
        {content[:6000]}
        ---
        
        User Prompt: {user_prompt}
        
        Provide a comprehensive, professional response using structure, bullet points, and key takeaways."""
        
        return self._groq_call(prompt)

    def _read_ocr(self, payload: dict) -> str:
        filename = payload.get("filename")
        if not filename:
            return "Error: No filename provided for OCR analysis."
            
        # Try to find corresponding OCR text.
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data")
        ocr_file = filename.rsplit(".", 1)[0] + "_ocr.txt"
        ocr_path = os.path.join(data_dir, ocr_file)
        
        # Fallback to normal text file
        if not os.path.exists(ocr_path):
            ocr_path = os.path.join(data_dir, filename)

        if not os.path.exists(ocr_path):
            return f"Error: Text source for '{filename}' not found."

        try:
            with open(ocr_path, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except Exception as e:
            return f"Error reading file: {e}"

        prompt = f"""You are a structural OCR OCR Reader and Document Information Extractor.
        Please read the raw OCR text below, clean up formatting artifacts, structure it logically, and extract:
        1. Document Type (e.g., Receipt, ID Card, Invoice, Letter, Article)
        2. Key Entities (Names, Dates, Amounts, Tax IDs)
        3. A structured, easy-to-read markdown transcription of the text content.

        Raw OCR text:
        ---
        {raw_text[:4000]}
        ---
        """
        return self._groq_call(prompt)

    def _analyze_resume(self, payload: dict) -> str:
        filename = payload.get("filename")
        job_description = payload.get("job_description", "General review for strong software engineering capabilities.")
        
        if not filename:
            return "Error: No resume file selected."

        if self.rag_engine:
            relevant_chunks = [c for c in self.rag_engine.chunks if isinstance(c, dict) and c.get("source") == filename]
            content = "\n\n".join(c["text"] for c in relevant_chunks[:10]) if relevant_chunks else self.rag_engine.uploaded_contents.get(filename, "")
        else:
            content = ""

        if not content:
            return f"Error: Could not retrieve text content from '{filename}'."

        prompt = f"""You are a professional HR recruiter and resume parsing AI.
        Analyze the resume content below against the provided Job Description.

        Target Job Description:
        {job_description}

        Resume Text:
        ---
        {content[:6000]}
        ---

        Provide:
        1. **Match Score**: (out of 100) with a brief justification.
        2. **Key Strengths**: Highlight where the candidate excels.
        3. **Identified Gaps**: Skills or experience missing relative to the job description.
        4. **Actionable Suggestions**: Clear advice on how to improve the resume or prepare for the interview.
        """
        return self._groq_call(prompt)

    def _research_assistant(self, payload: dict) -> str:
        topic = payload.get("topic")
        if not topic:
            return "Error: Please specify a topic to research."

        # Search the web if retriever is available
        web_context = ""
        if self.rag_engine and self.rag_engine.web_retriever:
            web_context = self.rag_engine.retrieve_web(topic) or ""

        prompt = f"""You are a Research Assistant. Compile a detailed research briefing report on the topic: "{topic}".
        
        We found the following current information on the web:
        ---
        {web_context[:6000] if web_context else "No web results. Please use your internal knowledge."}
        ---

        Please structure your report as follows:
        1. **Executive Summary**
        2. **Detailed Findings & Analysis**
        3. **Key Implications / Future Outlook**
        4. **References / Cited Sources** (Use inline citations where appropriate)
        
        Make the report highly comprehensive, factual, and written in a formal academic or business tone."""
        return self._groq_call(prompt)

    def _web_search_agent(self, payload: dict) -> str:
        query = payload.get("query")
        if not query:
            return "Error: Please provide a search query."

        web_context = ""
        if self.rag_engine and self.rag_engine.web_retriever:
            web_context = self.rag_engine.retrieve_web(query) or ""

        prompt = f"""You are a Web Search Agent. Answer the user's query using the retrieved search results.
        
        Query: {query}
        
        Search Results:
        ---
        {web_context[:5000]}
        ---
        
        Provide a concise, direct answer based strictly on the search results, citing links or websites when mentioned."""
        return self._groq_call(prompt)

    def _code_assistant(self, payload: dict) -> str:
        problem = payload.get("problem")
        language = payload.get("language", "Python")
        
        if not problem:
            return "Error: Please specify the programming task or code snippet to review."

        prompt = f"""You are an Expert Software Architect and Code Assistant.
        Provide a clean, well-commented, and production-grade solution or review for the following task.
        
        Language: {language}
        Task/Problem:
        ---
        {problem}
        ---
        
        Format your response with:
        1. **Implementation**: High-quality code block with appropriate comments.
        2. **Explanation**: Break down how the code works and the design decisions.
        3. **Complexity Analysis**: Time and space complexity.
        4. **Best Practices**: Edge cases considered and security recommendations."""
        return self._groq_call(prompt)

    def _summarize(self, payload: dict) -> str:
        text = payload.get("text")
        filename = payload.get("filename")
        
        if not text and filename and self.rag_engine:
            relevant_chunks = [c for c in self.rag_engine.chunks if isinstance(c, dict) and c.get("source") == filename]
            text = "\n\n".join(c["text"] for c in relevant_chunks[:12]) if relevant_chunks else self.rag_engine.uploaded_contents.get(filename, "")

        if not text:
            return "Error: No text content provided to summarize."

        prompt = f"""You are a Text Summarization specialist. Create a structured summary of the text below.
        
        Source Text:
        ---
        {text[:8000]}
        ---
        
        Your response must include:
        1. **TL;DR**: A single-sentence summary of the core message.
        2. **Key Takeaways**: Bullet points detailing the most critical information.
        3. **Concept Mind Map**: A simple markdown outline representing the logical flows or themes."""
        return self._groq_call(prompt)

    def _presentation_generator(self, payload: dict) -> str:
        topic = payload.get("topic")
        target_audience = payload.get("audience", "General Professional")
        num_slides = min(payload.get("num_slides", 5), 10)
        
        if not topic:
            return "Error: Please specify a topic for the presentation outline."

        prompt = f"""You are a Presentation Outline Designer and Professional Slide Writer.
        Generate a complete slide-by-slide presentation outline on: "{topic}"
        Target Audience: {target_audience}
        Number of Slides: {num_slides}
        
        For each slide (Slide 1 to Slide {num_slides}), provide:
        - **Slide Title**
        - **Visual Design Concept**: Advice on icons, layout, or color palette for this slide.
        - **Key Bullet Points**: Clear, punchy textual content for the slide.
        - **Speaker Notes**: Detailed guidance on what the presenter should say.
        
        Format the entire response in clean, beautiful Markdown structure."""
        return self._groq_call(prompt)

    # --- Groq Caller Helper ---
    def _groq_call(self, prompt: str) -> str:
        try:
            resp = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=2048,
                stream=False
            )
            return resp.choices[0].message.content or "No response from AI."
        except Exception as e:
            return f"Error querying LLM: {e}"
