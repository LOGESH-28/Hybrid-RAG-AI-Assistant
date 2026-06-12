import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, FileText, Globe, Code, FileSearch, HelpCircle, Layout, Sparkles, Send, Copy, Check, RefreshCw, Layers } from 'lucide-react'
import { runTool, listFiles } from '../services/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const tools = [
  { id: 'pdf_analyzer', name: 'PDF Analyzer', icon: FileText, desc: 'Analyze specific paragraphs or query themes in a PDF.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'hover:border-red-500/20' },
  { id: 'ocr_reader', name: 'OCR Vision Reader', icon: Globe, desc: 'Extract raw text, parse structured entities, and clean scanned images.', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/20' },
  { id: 'resume_analyzer', name: 'Resume Scorer', icon: FileSearch, desc: 'Score a CV against target job descriptions and identify missing skills.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'hover:border-cyan-500/20' },
  { id: 'research_assistant', name: 'Research Compiler', icon: HelpCircle, desc: 'Perform multi-stage web search compilation and compile briefings.', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/20' },
  { id: 'web_search_agent', name: 'Web Search Agent', icon: Globe, desc: 'Execute live search queries to answer current, real-time events.', color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'hover:border-teal-500/20' },
  { id: 'code_assistant', name: 'Software Architect', icon: Code, desc: 'Design software structure, write snippets, and analyze runtime complexity.', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/20' },
  { id: 'summarizer', name: 'Text Summarizer', icon: Layers, desc: 'Compress long texts or documents into bullet summaries and mindmaps.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'hover:border-purple-500/20' },
  { id: 'presentation_generator', name: 'Slide outline', icon: Layout, desc: 'Formulate slide-by-slide titles, design ideas, and speaker cues.', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'hover:border-pink-500/20' }
]

export default function ToolsEcosystem() {
  const [selectedTool, setSelectedTool] = useState(tools[0])
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [payload, setPayload] = useState({})
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [logs, setLogs] = useState([])

  const fetchFiles = async () => {
    setLoadingFiles(true)
    try {
      const data = await listFiles()
      setFiles(data.files || [])
      if (data.files?.length > 0) {
        setPayload(prev => ({ ...prev, filename: data.files[0].name }))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  const execute = async () => {
    setRunning(true)
    setOutput('')
    setLogs([])

    // Simulated orchestration logs
    const logSteps = [
      `Initializing ${selectedTool.name} routing protocol...`,
      `Validating input payload metrics...`,
      `Retrieving knowledge models and contextual parameters...`,
      `Calling LLM pipeline wrapper for structured generation...`,
      `Finalizing result schema rendering...`
    ]

    for (let i = 0; i < logSteps.length; i++) {
      setLogs(prev => [...prev, logSteps[i]])
      await new Promise(r => setTimeout(r, 450))
    }

    try {
      const data = await runTool(selectedTool.id, payload)
      setOutput(data.result || 'Execution completed with no return content.')
    } catch (e) {
      setOutput(`⚠️ Execution error: ${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handlePayloadChange = (key, val) => {
    setPayload(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row bg-surface-950 text-white overflow-hidden h-full select-none">
      {/* Left panel: Tool list and inputs */}
      <div className="w-full lg:w-96 border-r border-white/5 bg-surface-950 flex flex-col overflow-y-auto flex-shrink-0 p-6 space-y-6">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-brand flex items-center gap-2 mb-1">
            <Cpu size={14} /> AI Tool Ecosystem
          </h2>
          <p className="text-[10px] text-white/40 font-medium">Select a specialized AI model agent with customized parameters.</p>
        </div>

        {/* Tools Menu */}
        <div className="grid grid-cols-1 gap-2.5">
          {tools.map((t) => {
            const Icon = t.icon
            const isSelected = selectedTool.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setSelectedTool(t); setOutput(''); setLogs([]); setPayload({}) }}
                className={`w-full flex items-start gap-4.5 p-3 rounded-xl border text-left transition-all duration-300 ${
                  isSelected 
                    ? 'border-brand/40 bg-brand/5 shadow-glass-hover' 
                    : `border-white/5 bg-white/[0.005] hover:bg-white/[0.02] ${t.border}`
                }`}
              >
                <div className={`p-2 rounded-xl ${t.bg} ${t.color} flex-shrink-0 mt-0.5 transition-transform group-hover:scale-105`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-white/90 leading-snug">{t.name}</h4>
                  <p className="text-[10px] text-white/35 leading-normal mt-1 font-medium">{t.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Parameters Section */}
        <div className="border-t border-white/5 pt-5 space-y-4">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Configure Parameters</span>

          {/* Dynamic input render based on selected tool */}
          {selectedTool.id === 'pdf_analyzer' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Source Document</label>
                <select
                  value={payload.filename || ''}
                  onChange={(e) => handlePayloadChange('filename', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
                >
                  {files.length === 0 ? (
                    <option value="">No files uploaded</option>
                  ) : (
                    files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Analysis Prompt</label>
                <textarea
                  placeholder="What would you like to analyze or find in the document?"
                  value={payload.prompt || ''}
                  onChange={(e) => handlePayloadChange('prompt', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 resize-none h-20 placeholder-white/20 font-medium"
                />
              </div>
            </div>
          )}

          {selectedTool.id === 'ocr_reader' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Scanned Image File</label>
              <select
                value={payload.filename || ''}
                onChange={(e) => handlePayloadChange('filename', e.target.value)}
                className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
              >
                {files.length === 0 ? (
                  <option value="">No files uploaded</option>
                ) : (
                  files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)
                )}
              </select>
            </div>
          )}

          {selectedTool.id === 'resume_analyzer' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Resume File (.pdf/.txt)</label>
                <select
                  value={payload.filename || ''}
                  onChange={(e) => handlePayloadChange('filename', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
                >
                  {files.length === 0 ? (
                    <option value="">No files uploaded</option>
                  ) : (
                    files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Job Description (JD)</label>
                <textarea
                  placeholder="Paste target job descriptions or skill requirements..."
                  value={payload.job_description || ''}
                  onChange={(e) => handlePayloadChange('job_description', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 resize-none h-24 placeholder-white/20 font-medium"
                />
              </div>
            </div>
          )}

          {selectedTool.id === 'research_assistant' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Research Topic</label>
              <input
                type="text" 
                placeholder="e.g. quantum computing advancements"
                value={payload.topic || ''}
                onChange={(e) => handlePayloadChange('topic', e.target.value)}
                className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-medium"
              />
            </div>
          )}

          {selectedTool.id === 'web_search_agent' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Web Search Query</label>
              <input
                type="text" 
                placeholder="What is the current stock price of..."
                value={payload.query || ''}
                onChange={(e) => handlePayloadChange('query', e.target.value)}
                className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-medium"
              />
            </div>
          )}

          {selectedTool.id === 'code_assistant' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Programming Language</label>
                <select
                  value={payload.language || 'Python'}
                  onChange={(e) => handlePayloadChange('language', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
                >
                  <option value="Python">Python</option>
                  <option value="Javascript">Javascript</option>
                  <option value="Go">Go Lang</option>
                  <option value="Rust">Rust</option>
                  <option value="C++">C++</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Code Task / Review Context</label>
                <textarea
                  placeholder="Describe code requirements or paste buggy snippet..."
                  value={payload.problem || ''}
                  onChange={(e) => handlePayloadChange('problem', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 resize-none h-24 placeholder-white/20 font-medium"
                />
              </div>
            </div>
          )}

          {selectedTool.id === 'summarizer' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Source File (optional)</label>
                <select
                  value={payload.filename || ''}
                  onChange={(e) => handlePayloadChange('filename', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
                >
                  <option value="">Paste raw text instead</option>
                  {files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              {!payload.filename && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Raw Text content</label>
                  <textarea
                    placeholder="Paste text contents here..."
                    value={payload.text || ''}
                    onChange={(e) => handlePayloadChange('text', e.target.value)}
                    className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 resize-none h-24 placeholder-white/20 font-medium"
                  />
                </div>
              )}
            </div>
          )}

          {selectedTool.id === 'presentation_generator' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Presentation Topic</label>
                <input
                  type="text" 
                  placeholder="e.g. AI in Healthcare"
                  value={payload.topic || ''}
                  onChange={(e) => handlePayloadChange('topic', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Audience Group</label>
                <input
                  type="text" 
                  placeholder="e.g. Technical Investors"
                  value={payload.audience || ''}
                  onChange={(e) => handlePayloadChange('audience', e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Number of Slides</label>
                <input
                  type="number" 
                  min="3" 
                  max="10"
                  value={payload.num_slides || 5}
                  onChange={(e) => handlePayloadChange('num_slides', parseInt(e.target.value))}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
                />
              </div>
            </div>
          )}

          <button
            onClick={execute}
            disabled={running}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-light text-white rounded-xl py-3 text-xs font-bold shadow-lg transition-all duration-300 shadow-glow-indigo disabled:bg-white/[0.02] disabled:text-white/10 disabled:border-white/5"
          >
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            <span>{running ? 'Orchestrating Tool Pipeline...' : 'Run Specialized Agent'}</span>
          </button>
        </div>
      </div>

      {/* Right panel: Output terminal */}
      <div className="flex-1 flex flex-col bg-surface-950 overflow-hidden relative">
        <div className="px-6 py-4.5 border-b border-white/5 flex items-center justify-between flex-shrink-0 bg-surface-950/80 backdrop-blur-md z-10">
          <span className="text-xs font-bold text-white/80 uppercase tracking-wider">Result Output Console</span>
          {output && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-[10px] text-white/60 hover:text-white font-bold transition-all"
            >
              {copied ? <Check size={11} className="text-brand-emerald" /> : <Copy size={11} />}
              <span>{copied ? 'Copied' : 'Copy Result'}</span>
            </button>
          )}
        </div>

        {/* Output area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-black/40 font-sans">
          {running ? (
            <div className="h-full flex flex-col justify-center items-center max-w-md mx-auto space-y-4">
              <Sparkles size={28} className="text-brand animate-pulse" />
              <div className="w-full space-y-2 border border-white/5 bg-surface-900/50 rounded-2xl p-5 font-mono text-[10px] text-white/35 max-h-48 overflow-y-auto shadow-inner leading-relaxed">
                {logs.map((log, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    ⚡ [PROG] {log}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : output ? (
            <div className="prose-dark max-w-chat mx-auto select-text leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-brand-light underline underline-offset-4">{children}</a>
              }}>
                {output}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto select-none">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/35 mb-4">
                <Cpu size={18} />
              </div>
              <h4 className="text-xs font-bold text-white/60">System Console Idle</h4>
              <p className="text-[10px] text-white/35 mt-2 leading-relaxed font-medium">
                Configure your input parameters in the left side-panel and invoke the execution engine. Structured agent outputs will print here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
