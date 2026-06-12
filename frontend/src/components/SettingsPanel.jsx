import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Eye, Sliders, Volume2, Globe, Brain, Trash2, Save, RefreshCw, Moon, Sun, Search, Database } from 'lucide-react'
import useChatStore from '../store/chatStore'
import { getMemories, clearMemories, saveMemory } from '../services/api'

export default function SettingsPanel() {
  const { settings, updateSettings, activeId } = useChatStore()
  const [memories, setMemories] = useState({})
  const [loadingMemories, setLoadingMemories] = useState(false)
  const [newMemoryKey, setNewMemoryKey] = useState('')
  const [newMemoryVal, setNewMemoryVal] = useState('')
  const [memorySearch, setMemorySearch] = useState('')

  const fetchMemories = async () => {
    if (!activeId) return
    setLoadingMemories(true)
    try {
      const data = await getMemories(activeId)
      setMemories(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMemories(false)
    }
  }

  useEffect(() => {
    fetchMemories()
  }, [activeId])

  const handleClearMemories = async () => {
    if (!activeId) return
    if (!confirm('Are you sure you want to delete all long-term memory elements for this session? This action cannot be undone.')) return
    try {
      await clearMemories(activeId)
      setMemories({})
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddMemory = async () => {
    if (!activeId || !newMemoryKey.trim() || !newMemoryVal.trim()) return
    try {
      await saveMemory(activeId, newMemoryKey.trim(), newMemoryVal.trim())
      setNewMemoryKey('')
      setNewMemoryVal('')
      fetchMemories()
    } catch (e) {
      console.error(e)
    }
  }

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark'
    updateSettings({ theme: nextTheme })
    if (nextTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }

  const handleSpeedChange = (e) => {
    updateSettings({ voiceSpeed: parseFloat(e.target.value) })
  }

  const filteredMemories = Object.entries(memories).filter(([key, val]) => 
    key.toLowerCase().includes(memorySearch.toLowerCase()) || 
    val.toLowerCase().includes(memorySearch.toLowerCase())
  )

  return (
    <div className="flex-1 overflow-y-auto bg-surface-950 text-white p-6 md:p-8 space-y-8 select-none">
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display flex items-center gap-2.5">
          <Settings className="text-brand" size={24} /> System Properties & Settings
        </h1>
        <p className="text-xs text-white/40 mt-1 font-medium font-sans">Configure Groq LLM inference parameters, customize voice dictations, and index long-term conversational memory.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: UI/LLM Config */}
        <div className="space-y-6">
          {/* General UI Settings */}
          <div className="glass-card border border-white/5 rounded-2xl p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2 border-b border-white/5 pb-3">
              <Sliders size={14} className="text-brand" /> UI & Inference Settings
            </h3>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold block text-white/80">Application Theme</label>
                <span className="text-[10px] text-white/35 font-medium">Toggle between Light and Dark interface modes.</span>
              </div>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 text-xs font-bold text-white/90"
              >
                {settings.theme === 'dark' ? <Moon size={13} className="text-brand" /> : <Sun size={13} className="text-yellow-400" />}
                <span className="capitalize">{settings.theme} Mode</span>
              </button>
            </div>

            {/* Model Selector */}
            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold block text-white/80">Groq Engine Model</label>
                <span className="text-[10px] text-white/35 font-medium">Choose which remote model operates Loki workspace query logic.</span>
              </div>
              <select
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value })}
                className="w-full bg-surface-900 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
              >
                <option value="llama-3.3-70b-versatile">LLaMA 3.3 70B (Versatile, Highly Recommended)</option>
                <option value="llama-3.1-8b-instant">LLaMA 3.1 8B (Instant, Ultra Fast)</option>
                <option value="mixtral-8x7b-32768">Mixtral 8x7B (Deep reasoning, Mix of Experts)</option>
                <option value="gemma2-9b-it">Gemma 2 9B (Google open weights)</option>
              </select>
            </div>

            {/* Temperature Slider */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold block text-white/80">Inference Temperature: {settings.temperature}</label>
                  <span className="text-[10px] text-white/35 font-medium">Lower values produce factual texts, higher values generate creative copy.</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-brand"
                />
              </div>
            </div>
          </div>

          {/* Voice/Audio Settings */}
          <div className="glass-card border border-white/5 rounded-2xl p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2 border-b border-white/5 pb-3">
              <Volume2 size={14} className="text-brand-cyan" /> Speech Synthesis Configurations
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold block text-white/80">Voice Outputs</label>
                <span className="text-[10px] text-white/35 font-medium">Allows the assistant to read answers back with Speech Synthesis.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => updateSettings({ voiceEnabled: e.target.checked })}
                className="w-4.5 h-4.5 rounded border-white/10 bg-surface-900 checked:bg-brand checked:border-brand focus:ring-brand accent-brand cursor-pointer"
              />
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-bold block text-white/80">Reading Velocity Rate: {settings.voiceSpeed}x</label>
                  <span className="text-[10px] text-white/35 font-medium">Adjust pronunciation speech generation rate.</span>
                </div>
              </div>
              <input
                type="range" 
                min="0.5" 
                max="2" 
                step="0.1"
                value={settings.voiceSpeed}
                onChange={handleSpeedChange}
                className="w-full h-1 bg-surface-800 rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          </div>

          {/* OCR Engine parameters */}
          <div className="glass-card border border-white/5 rounded-2xl p-5 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-2 border-b border-white/5 pb-3">
              <Globe size={14} className="text-brand-violet" /> OCR Language Parameters
            </h3>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-bold block text-white/80">Primary Recognition Language</label>
                <span className="text-[10px] text-white/35 font-medium">Specify target dictionary language for pytesseract image conversions.</span>
              </div>
              <select
                value={settings.ocrLanguage}
                onChange={(e) => updateSettings({ ocrLanguage: e.target.value })}
                className="w-full bg-surface-900 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-brand/40 font-medium"
              >
                <option value="eng">English (eng)</option>
                <option value="spa">Spanish (spa)</option>
                <option value="fra">French (fra)</option>
                <option value="deu">German (deu)</option>
                <option value="tam">Tamil (tam)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: AI Memory System */}
        <div className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white/85 flex items-center gap-2">
              <Brain size={14} className="text-brand-pink" /> Persistent Memory Engine
            </h3>
            {activeId && (
              <button
                onClick={fetchMemories}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition"
                title="Refresh Memory Index"
              >
                <RefreshCw size={12} className={loadingMemories ? 'animate-spin' : ''} />
              </button>
            )}
          </div>

          <p className="text-[11px] text-white/45 leading-relaxed font-medium">
            Loki automatically extracts key parameters, facts, and user preferences from active conversations. They are saved in a SQLite database and formatted inside agent prompt vectors.
          </p>

          {/* Memory Search */}
          {activeId && Object.keys(memories).length > 0 && (
            <div className="flex items-center gap-2 bg-surface-900 border border-white/5 rounded-xl px-3 py-1.5 flex-shrink-0">
              <Search size={12} className="text-white/30 flex-shrink-0" />
              <input
                type="text" 
                placeholder="Search database key/values..."
                value={memorySearch} 
                onChange={(e) => setMemorySearch(e.target.value)}
                className="bg-transparent text-[11px] text-white w-full outline-none placeholder-white/20"
              />
            </div>
          )}

          {/* Memory listings */}
          <div className="flex-1 min-h-[220px] bg-black/30 border border-white/5 rounded-xl p-3.5 overflow-y-auto space-y-2 font-sans">
            {!activeId ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <Database size={20} className="text-white/20 mb-2" />
                <p className="text-[11px] text-white/30 font-medium">Select an active chat session to review associated SQLite memory parameters.</p>
              </div>
            ) : loadingMemories ? (
              <div className="h-full flex items-center justify-center text-center">
                <RefreshCw size={18} className="text-brand animate-spin" />
              </div>
            ) : filteredMemories.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <p className="text-[11px] text-white/20 font-medium">No memory parameters recorded matching filter queries.</p>
              </div>
            ) : (
              filteredMemories.map(([key, val]) => (
                <div key={key} className="flex flex-col gap-1 bg-white/[0.01] border border-white/5 rounded-xl p-3 relative group">
                  <span className="text-[9px] uppercase font-bold text-brand tracking-wider">{key}</span>
                  <span className="text-xs text-white/80 font-medium leading-normal select-text">{val}</span>
                </div>
              ))
            )}
          </div>

          {/* Add custom facts override */}
          {activeId && (
            <div className="pt-4 border-t border-white/5 space-y-3 flex-shrink-0">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-wide">Add Custom Memory Override</span>
              
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text" 
                  placeholder="Key (e.g. USER_ROLE)"
                  value={newMemoryKey} 
                  onChange={(e) => setNewMemoryKey(e.target.value)}
                  className="bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-semibold"
                />
                <input
                  type="text" 
                  placeholder="Value (e.g. Software Lead)"
                  value={newMemoryVal} 
                  onChange={(e) => setNewMemoryVal(e.target.value)}
                  className="bg-surface-900 border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand/40 placeholder-white/20 font-semibold"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddMemory}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-light text-white rounded-xl py-2 text-xs font-bold transition shadow-glow-indigo"
                >
                  <Save size={12} /> Save Override
                </button>
                
                <button
                  onClick={handleClearMemories}
                  className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 hover:text-red-400 text-white/60 rounded-xl px-3.5 py-2 text-xs font-bold transition"
                  title="Purge memories"
                >
                  <Trash2 size={12} /> Purge Memory
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
