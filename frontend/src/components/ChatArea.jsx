import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MessageBubble from './MessageBubble'
import { Zap, Sparkles, Database, Globe, HelpCircle, Code } from 'lucide-react'

const promptCards = [
  {
    title: 'Analyze Knowledge Base',
    text: 'Summarize my uploaded documents',
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    title: 'Code Engineering',
    text: 'Help me design a React component using Tailwind CSS',
    icon: Code,
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10'
  },
  {
    title: 'Web Intel Retrieval',
    text: 'Search the web for the latest artificial intelligence news',
    icon: Globe,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10'
  },
  {
    title: 'Conceptual Breakdown',
    text: 'Explain quantum computing in high school terms',
    icon: HelpCircle,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10'
  }
]

export default function ChatArea({ conversation, loading, onSend }) {
  const bottomRef = useRef(null)
  const messages = conversation?.messages ?? []

  useEffect(() => {
    // Avoid animation conflict/stutter (shakiness) by using 'auto' (instant) scroll during active streaming or loading.
    const isStreaming = messages.length > 0 && messages[messages.length - 1].streaming;
    bottomRef.current?.scrollIntoView({
      behavior: (loading || isStreaming) ? 'auto' : 'smooth'
    });
  }, [messages, loading])

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto bg-surface-950/20 select-none">
        <motion.div
          initial={{ opacity: 0, y: 30 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="flex flex-col items-center gap-8 max-w-chat w-full"
        >
          {/* Logo animation / Pulse */}
          <div className="relative">
            <div className="absolute inset-0 bg-brand/10 rounded-3xl blur-2xl animate-pulse-slow pointer-events-none" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand to-brand-violet flex items-center justify-center border border-white/10 shadow-glow-indigo relative z-10">
              <Zap size={28} className="text-white fill-white/15" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-white font-display tracking-tight leading-tight">
              What can we build today?
            </h2>
            <p className="text-white/40 text-xs md:text-sm max-w-md mx-auto leading-relaxed">
              Ask anything, drag and drop documents for semantic search, extract text from images, or activate our real-time search agent.
            </p>
          </div>

          {/* Quick suggestions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-4">
            {promptCards.map((card, i) => {
              const Icon = card.icon
              return (
                <motion.button
                  key={i}
                  whileHover={{ y: -4, borderColor: 'rgba(99, 102, 241, 0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSend(card.text, [])}
                  className="glass-card border border-white/5 rounded-2xl p-5 text-left transition-all duration-300 relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white/90 group-hover:text-white transition-colors">{card.title}</h4>
                      <p className="text-[11px] text-white/45 leading-normal mt-1">{card.text}</p>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto pt-8 pb-32 px-4 md:px-6">
      <div className="max-w-chat mx-auto space-y-8">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRegenerate={
                msg.role === 'assistant' && i === messages.length - 1 && !loading
                  ? () => {
                      const prev = messages[i - 1]
                      if (prev?.role === 'user') onSend(prev.content, [])
                    }
                  : null
              }
            />
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
