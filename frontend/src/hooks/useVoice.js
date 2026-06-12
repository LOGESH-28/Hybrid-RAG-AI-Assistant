import { useState, useCallback, useRef } from 'react'
import useChatStore from '../store/chatStore'

export function useVoice(onResult) {
  const { settings } = useChatStore()
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const toggle = useCallback(() => {
    if (!supported) return alert('Voice recognition not supported in this browser.')
    if (listening) { recRef.current?.stop(); return }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onstart = () => setListening(true)
    rec.onend   = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      onResult(transcript)
    }
    recRef.current = rec
    rec.start()
  }, [listening, supported, onResult])

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    if (!settings.voiceEnabled) return
    
    window.speechSynthesis.cancel()
    // Strip markdown formatting symbols for clean audio read-out
    const cleanText = text
      .replace(/[*_`#\-]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links but keep text
      
    const utt = new SpeechSynthesisUtterance(cleanText)
    
    // Set custom speaking rate
    utt.rate = settings.voiceSpeed || 1.0
    
    const voices = window.speechSynthesis.getVoices()
    const voice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ?? voices[0]
    if (voice) utt.voice = voice
    
    window.speechSynthesis.speak(utt)
  }, [settings.voiceEnabled, settings.voiceSpeed])

  return { listening, supported, toggle, speak }
}
