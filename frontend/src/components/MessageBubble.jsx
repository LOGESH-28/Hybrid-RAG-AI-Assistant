import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, RefreshCw, Volume2, User, Zap, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useVoice } from '../hooks/useVoice'
import clsx from 'clsx'

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="msg-action-btn hover:bg-white/5">
      {copied ? <Check size={12} className="text-brand-emerald" /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const code = String(children).replace(/\n$/, '')
  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-white/5 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-950/80 border-b border-white/5">
        <span className="text-[10px] text-white/40 font-mono uppercase font-bold tracking-wider">{language || 'code'}</span>
        <button
          onClick={() => { 
            navigator.clipboard.writeText(code)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000) 
          }}
          className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white font-semibold transition-colors"
        >
          {copied ? <Check size={11} className="text-brand-emerald" /> : <Copy size={11} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language} 
        style={oneDark}
        customStyle={{ margin: 0, borderRadius: 0, background: '#07070a', fontSize: '0.82rem', padding: '1.2rem' }}
        showLineNumbers={code.split('\n').length > 5}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default function MessageBubble({ message, onRegenerate }) {
  const { speak } = useVoice(() => {})
  const isUser = message.role === 'user'
  const isStreaming = message.streaming

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      className={clsx('flex gap-4 w-full group relative', isUser ? 'justify-end' : 'justify-start')}
    >
      {/* AI Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-brand to-brand-violet flex items-center justify-center border border-white/5 mt-0.5 shadow-md shadow-brand/10">
          <Zap size={14} className="text-white fill-white/10" />
        </div>
      )}

      <div className={clsx('flex flex-col gap-2', isUser ? 'items-end max-w-[80%]' : 'items-start flex-1 min-w-0')}>
        {/* Images (user uploads) */}
        {message.images?.length > 0 && (
          <div className="flex flex-wrap gap-2.5 justify-end">
            {message.images.map((src, i) => (
              <div key={i} className="relative rounded-2xl overflow-hidden border border-white/10 group shadow-lg">
                <img src={src} alt="upload" className="max-h-56 max-w-sm rounded-2xl object-cover hover:scale-102 transition-transform duration-300" />
              </div>
            ))}
          </div>
        )}

        {/* Bubble */}
        {isUser ? (
          <div className="msg-user leading-relaxed font-sans font-medium text-[13.5px]">
            {message.content}
          </div>
        ) : (
          <div className={clsx('msg-ai prose-dark max-w-full leading-relaxed text-[13.5px]', isStreaming && !message.content && 'streaming-cursor')}>
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const lang = /language-(\w+)/.exec(className || '')?.[1]
                    return !inline && lang
                      ? <CodeBlock language={lang}>{children}</CodeBlock>
                      : <code className="bg-white/5 text-brand-light px-1.5 py-0.5 rounded-md text-[0.85em] font-mono border border-white/5">{children}</code>
                  },
                  p: ({ children }) => <p className="text-white/80 leading-7 my-2.5 font-medium">{children}</p>,
                  h1: ({ children }) => <h1 className="text-white font-display text-xl font-bold mt-5 mb-2.5">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-white font-display text-lg font-bold mt-4.5 mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-white font-display text-md font-bold mt-4 mb-1.5">{children}</h3>,
                  ul: ({ children }) => <ul className="text-white/70 my-3 pl-6 list-disc space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="text-white/70 my-3 pl-6 list-decimal space-y-1">{children}</ol>,
                  blockquote: ({ children }) => <blockquote className="border-l-3 border-brand/50 pl-4 my-4 text-white/50 italic font-medium">{children}</blockquote>,
                  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-brand-light underline underline-offset-4 hover:text-brand font-semibold transition-colors">{children}</a>,
                  table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-white/5 bg-surface-900/30"><table className="border-collapse w-full text-xs text-left">{children}</table></div>,
                  th: ({ children }) => <th className="border-b border-white/10 px-4 py-3 bg-white/[0.03] text-white/80 font-bold uppercase tracking-wider text-[10px]">{children}</th>,
                  td: ({ children }) => <td className="border-b border-white/5 px-4 py-3 text-white/60 font-medium">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center gap-2 text-white/40 py-2">
                <Sparkles size={14} className="text-brand animate-spin" />
                <span className="text-xs font-semibold animate-pulse-slow">Loki is writing...</span>
              </div>
            )}
            {isStreaming && message.content && <span className="streaming-cursor" />}
          </div>
        )}

        {/* Actions (AI only, after streaming completes) */}
        {!isUser && !isStreaming && message.content && (
          <div className="flex items-center gap-1.5 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <CopyBtn text={message.content} />
            <button 
              onClick={() => speak(message.content)} 
              className="msg-action-btn hover:bg-white/5"
              title="Speak Out Loud"
            >
              <Volume2 size={12} /> <span>Speak</span>
            </button>
            {onRegenerate && (
              <button 
                onClick={onRegenerate} 
                className="msg-action-btn hover:bg-white/5"
                title="Regenerate Response"
              >
                <RefreshCw size={11} /> <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-violet to-brand-pink flex items-center justify-center border border-white/5 mt-0.5 shadow-md">
          <User size={13} className="text-white" />
        </div>
      )}
    </motion.div>
  )
}
