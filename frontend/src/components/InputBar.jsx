import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Paperclip, Square, X, Image as ImageIcon, FileText } from 'lucide-react'
import { useVoice } from '../hooks/useVoice'
import clsx from 'clsx'

const ACCEPT = { 
  'application/pdf': ['.pdf'], 
  'text/plain': ['.txt'],
  'image/png': ['.png'], 
  'image/jpeg': ['.jpg','.jpeg'],
  'image/webp': ['.webp'], 
  'image/bmp': ['.bmp'] 
}

export default function InputBar({ onSend, loading, onStop }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState([])   // [{file, preview}]
  const textareaRef = useRef(null)

  const onVoiceResult = useCallback(t => {
    setText(prev => (prev + ' ' + t).trim())
    textareaRef.current?.focus()
  }, [])
  const { listening, toggle: toggleVoice } = useVoice(onVoiceResult)

  const submit = () => {
    const msg = text.trim()
    if (!msg && images.length === 0) return
    onSend(msg, images)
    setText('')
    setImages([])
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault()
      submit() 
    }
  }

  const onDrop = useCallback(files => {
    const imgs = files
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, preview: URL.createObjectURL(f) }))
    const docs = files.filter(f => !f.type.startsWith('image/'))
    setImages(prev => [...prev, ...imgs])
    // non-image files: send as first message context
    if (docs.length) {
      setText(prev => prev + (prev ? '\n' : '') + docs.map(d => `[File Context: ${d.name}]`).join('\n'))
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop, accept: ACCEPT, noClick: true, noKeyboard: true
  })

  const removeImage = (i) => {
    setImages(prev => { 
      URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, j) => j !== i) 
    })
  }

  const canSend = (text.trim() || images.length > 0) && !loading

  return (
    <div className="w-full max-w-chat mx-auto px-4 md:px-6 pb-6 select-none relative z-20">
      {/* Drag overlay */}
      <div {...getRootProps()} className="relative">
        <input {...getInputProps()} />
        <AnimatePresence>
          {isDragActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-brand/10 backdrop-blur-xs border-2 border-dashed border-brand rounded-2xl"
            >
              <div className="w-12 h-12 rounded-xl bg-brand/20 flex items-center justify-center text-brand mb-2 animate-bounce">
                <Paperclip size={20} />
              </div>
              <p className="text-brand font-bold text-xs">Drop files to upload & index</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="input-wrapper bg-surface-900/65 border border-white/5 shadow-2xl relative">
          {/* Image Previews */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-wrap gap-3 px-4 pt-4 pb-2 border-b border-white/[0.03]"
              >
                {images.map((img, i) => (
                  <motion.div
                    key={img.preview}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.85, opacity: 0 }}
                    className="relative group w-18 h-18"
                  >
                    <img src={img.preview} alt="" className="h-full w-full object-cover rounded-xl border border-white/10" />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-surface-950 border border-white/10 rounded-full flex items-center justify-center hover:bg-red-500/80 transition-colors shadow-md"
                    >
                      <X size={10} className="text-white" />
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => {
              setText(e.target.value)
              const el = e.target
              el.style.height = 'auto'
              el.style.height = Math.min(el.scrollHeight, 160) + 'px'
            }}
            onKeyDown={onKey}
            placeholder={listening ? '🎙️ Listening... Speak now.' : 'Message Loki AI or drop files...'}
            rows={1}
            className={clsx(
              'chat-input bg-transparent text-white placeholder-white/20 text-[14px] resize-none outline-none font-sans font-medium',
              listening && 'text-brand placeholder-brand/60'
            )}
          />

          {/* Action bar */}
          <div className="flex items-center justify-between px-3.5 pb-3">
            <div className="flex items-center gap-1.5">
              {/* Attach File */}
              <button 
                onClick={open} 
                className="icon-btn hover:text-white hover:bg-white/5" 
                title="Attach Document or Image"
              >
                <Paperclip size={15} />
              </button>
              
              {/* Voice */}
              <button
                onClick={toggleVoice}
                className={clsx(
                  'icon-btn hover:bg-white/5 transition-colors',
                  listening ? 'text-brand animate-pulse bg-brand/10 hover:bg-brand/20' : 'hover:text-white'
                )}
                title={listening ? 'Stop listening' : 'Voice dictation'}
              >
                {listening ? <MicOff size={15} /> : <Mic size={15} />}
              </button>
            </div>

            {/* Send / Stop */}
            {loading ? (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onStop}
                className="w-8.5 h-8.5 rounded-xl bg-surface-950 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 text-white/50 hover:text-red-400 flex items-center justify-center transition-all duration-200"
                title="Stop generation"
              >
                <Square size={10} fill="currentColor" />
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={submit}
                disabled={!canSend}
                className={clsx(
                  'w-8.5 h-8.5 rounded-xl flex items-center justify-center transition-all duration-300',
                  canSend 
                    ? 'bg-brand hover:bg-brand-light text-white shadow-glow-indigo' 
                    : 'bg-white/[0.02] text-white/15 border border-white/5 cursor-not-allowed'
                )}
                title="Send (Enter)"
              >
                <Send size={12} className={clsx(canSend ? 'stroke-[2]' : '')} />
              </motion.button>
            )}
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] text-white/20 mt-2 font-medium tracking-wide">
        Loki AI can produce inaccurate responses. Verify critical data points.
      </p>
    </div>
  )
}
