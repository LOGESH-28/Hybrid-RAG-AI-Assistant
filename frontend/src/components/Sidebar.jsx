import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, Trash2, ChevronLeft, Zap, Cpu, Database, BarChart2, Settings, Pin, Edit3, Check, Search, Menu, PinOff, Eye } from 'lucide-react'
import useChatStore from '../store/chatStore'
import { formatDistanceToNow } from 'date-fns'

export default function Sidebar({ collapsed, setCollapsed, activeTab, setActiveTab }) {
  const { conversations, activeId, newChat, setActive, deleteConv, renameConv, togglePinConv } = useChatStore()
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [chatSearch, setChatSearch] = useState('')

  const handleNew = async () => {
    const id = await newChat('New Conversation')
    setActive(id)
    setActiveTab('chat')
  }

  const handleSelect = (id) => {
    setActive(id)
    setActiveTab('chat')
  }

  const startRename = (c, e) => {
    e.stopPropagation()
    setEditingId(c.id)
    setEditTitle(c.title)
  }

  const saveRename = (id, e) => {
    e.stopPropagation()
    if (editTitle.trim()) {
      renameConv(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const handlePin = (id, e) => {
    e.stopPropagation()
    togglePinConv(id)
  }

  // Filter conversations based on search
  const filteredConvs = conversations.filter(c => 
    c.title.toLowerCase().includes(chatSearch.toLowerCase())
  )

  const pinnedConvs = filteredConvs.filter(c => c.isPinned)
  const regularConvs = filteredConvs.filter(c => !c.isPinned)

  const navItems = [
    { id: 'chat', label: 'AI Workspace', icon: MessageSquare, desc: 'Chat & prompt assistant' },
    { id: 'tools', label: 'Specialized Console', icon: Cpu, desc: 'Task-specific AI agents' },
    { id: 'files', label: 'File Repository', icon: Database, desc: 'Upload documents & RAG' },
    { id: 'analytics', label: 'System Analytics', icon: BarChart2, desc: 'Real-time telemetry logs' },
    { id: 'settings', label: 'Preferences', icon: Settings, desc: 'Configure parameters' },
  ]

  return (
    <AnimatePresence mode="wait">
      {!collapsed ? (
        <motion.aside
          key="sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          className="sidebar flex flex-col h-full bg-surface-950 border-r border-border/80 flex-shrink-0 z-30 select-none overflow-hidden"
        >
          {/* Header Branding */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('chat')}>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-brand-violet flex items-center justify-center shadow-lg shadow-brand/20">
                <Zap size={14} className="text-white fill-white/20" />
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-tight font-display block">Loki AI</span>
                <span className="text-[9px] text-brand-light font-bold uppercase tracking-wider block">Enterprise Workspace</span>
              </div>
            </div>
            <button 
              onClick={() => setCollapsed(true)} 
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
          </div>

          {/* Quick Stats/Connection Status */}
          <div className="px-4 py-2 border-b border-border/20 bg-white/[0.01] flex items-center justify-between text-[10px] text-white/35">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald animate-pulse" />
              API Server Online
            </span>
            <span className="font-mono text-[9px]">v3.0.0</span>
          </div>

          {/* Primary View Navigation */}
          <div className="px-3 py-4 space-y-1 border-b border-border/30">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    if (item.id === 'chat' && conversations.length > 0 && !activeId) {
                      setActive(conversations[0].id)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all duration-200 border ${
                    isActive 
                      ? 'bg-brand/10 border-brand/20 text-brand shadow-glow-indigo' 
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-brand' : 'opacity-65'} />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{item.label}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* New Chat Button */}
          <div className="px-4 py-3.5 flex-shrink-0">
            <button 
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-brand hover:bg-brand-light text-white text-xs font-semibold shadow-lg shadow-brand/10 hover:shadow-brand/20 transition-all duration-200"
            >
              <Plus size={14} className="stroke-[2.5]" /> Create New Chat
            </button>
          </div>

          {/* Search Chats */}
          <div className="px-4 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 bg-surface-900 border border-white/5 rounded-xl px-3 py-2 transition-all focus-within:border-brand/40">
              <Search size={13} className="text-white/30 flex-shrink-0" />
              <input
                type="text" 
                placeholder="Search history..."
                value={chatSearch} 
                onChange={(e) => setChatSearch(e.target.value)}
                className="bg-transparent text-[11px] text-white w-full outline-none placeholder-white/20"
              />
            </div>
          </div>

          {/* Conversations History List */}
          <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-4">
            
            {/* Pinned Section */}
            {pinnedConvs.length > 0 && (
              <div className="space-y-1">
                <div className="px-3 pt-1 pb-1 flex items-center gap-1.5">
                  <Pin size={10} className="text-brand rotate-45" />
                  <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Pinned Chats</span>
                </div>
                {pinnedConvs.map(c => renderConvItem(c))}
              </div>
            )}

            {/* All Conversations */}
            <div className="space-y-1">
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-wider">Recent Conversations</span>
              </div>

              {filteredConvs.length === 0 && (
                <div className="py-8 text-center text-[10px] text-white/25">
                  No chats match search
                </div>
              )}

              {regularConvs.map(c => renderConvItem(c))}
            </div>
          </div>

          {/* User profile / Footer */}
          <div className="p-4 border-t border-border/60 bg-surface-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-violet to-brand-pink flex items-center justify-center text-[11px] font-bold text-white shadow-md">
                LK
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white/80 truncate">User Session</p>
                <p className="text-[9px] text-white/30 truncate">Active Developer</p>
              </div>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-brand-emerald shadow-glow-emerald" />
          </div>
        </motion.aside>
      ) : (
        <motion.div
          key="collapsed"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }}
          transition={{ duration: 0.15 }}
          className="flex flex-col items-center justify-between py-5 w-16 bg-surface-950 border-r border-border/80 flex-shrink-0 h-full z-30"
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand to-brand-violet flex items-center justify-center shadow-lg shadow-brand/10 cursor-pointer" onClick={() => setCollapsed(false)}>
              <Zap size={15} className="text-white fill-white/10" />
            </div>
            
            <button 
              onClick={handleNew} 
              className="w-9 h-9 flex items-center justify-center bg-brand/10 hover:bg-brand/20 text-brand rounded-xl border border-brand/20 transition-all" 
              title="New Chat"
            >
              <Plus size={16} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Mini Icons Navigation */}
          <div className="flex flex-col items-center gap-3.5 my-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id)
                    if (item.id === 'chat' && conversations.length > 0 && !activeId) {
                      setActive(conversations[0].id)
                    }
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${
                    isActive 
                      ? 'bg-brand/10 border-brand/20 text-brand shadow-glow-indigo' 
                      : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.label}
                >
                  <Icon size={16} />
                </button>
              )
            })}
          </div>

          <button 
            onClick={() => setCollapsed(false)} 
            className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors" 
            title="Expand sidebar"
          >
            <Menu size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )

  function renderConvItem(c) {
    const isSelected = c.id === activeId && activeTab === 'chat'
    const isPinned = c.isPinned
    return (
      <motion.div
        key={c.id}
        initial={{ opacity: 0, y: -2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        onClick={() => handleSelect(c.id)}
        className={`flex items-center justify-between gap-1 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 group cursor-pointer border ${
          isSelected 
            ? 'bg-surface-800 border-white/5 text-white shadow-md' 
            : 'border-transparent text-white/50 hover:bg-white/[0.03] hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isPinned ? (
            <Pin size={11} className="text-brand flex-shrink-0 rotate-45" />
          ) : (
            <MessageSquare size={12} className="opacity-45 flex-shrink-0 text-white" />
          )}
          
          {editingId === c.id ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveRename(c.id, e)
                if (e.key === 'Escape') setEditingId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface-950 border border-brand/40 rounded-lg px-2 py-1 text-xs text-white outline-none w-full font-medium"
              autoFocus
            />
          ) : (
            <div className="min-w-0">
              <p className="truncate font-semibold tracking-tight leading-none text-white/80 group-hover:text-white transition-colors">{c.title}</p>
              <p className="text-[9px] text-white/30 mt-1 font-medium">
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </p>
            </div>
          )}
        </div>

        {/* Action buttons (Rename, Pin, Delete) */}
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5 ml-1">
          {editingId === c.id ? (
            <button
              onClick={(e) => saveRename(c.id, e)}
              className="w-5.5 h-5.5 flex items-center justify-center text-brand hover:bg-white/5 rounded-lg"
              title="Save Title"
            >
              <Check size={12} />
            </button>
          ) : (
            <>
              <button
                onClick={(e) => startRename(c, e)}
                className="w-5.5 h-5.5 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                title="Rename Chat"
              >
                <Edit3 size={11} />
              </button>
              <button
                onClick={(e) => handlePin(c.id, e)}
                className={`w-5.5 h-5.5 flex items-center justify-center rounded-lg transition-colors ${
                  isPinned ? 'text-brand hover:bg-white/5' : 'text-white/30 hover:text-white hover:bg-white/5'
                }`}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                {isPinned ? <PinOff size={11} /> : <Pin size={11} className="rotate-45" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConv(c.id) }}
                className="w-5.5 h-5.5 flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </motion.div>
    )
  }
}
