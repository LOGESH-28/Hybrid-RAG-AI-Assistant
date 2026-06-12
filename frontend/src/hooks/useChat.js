import { useState, useCallback, useRef } from 'react'
import { nanoid } from 'nanoid'
import useChatStore from '../store/chatStore'
import { streamChat, uploadFile } from '../services/api'

export function useChat() {
  const { activeId, newChat, addMessage, updateLastAI, getActive, settings } = useChatStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(false)

  const sendMessage = useCallback(async (text, images = []) => {
    setError(null)
    let convId = activeId
    if (!convId) {
      convId = await newChat(text.slice(0, 30) || 'New Chat')
    }

    // If images present, upload them first
    let imageUrls = []
    if (images.length > 0) {
      for (const img of images) {
        try {
          const res = await uploadFile(img.file, convId)
          if (res && res.url) {
            imageUrls.push(res.url)
          } else {
            imageUrls.push(img.preview)
          }
        } catch (e) {
          console.error("Image upload failed:", e)
          imageUrls.push(img.preview)
        }
      }
    }

    // Add user message
    addMessage(convId, {
      id: nanoid(), 
      role: 'user', 
      content: text,
      images: imageUrls, 
      timestamp: new Date().toISOString(),
    })

    // Add empty AI placeholder
    addMessage(convId, {
      id: nanoid(), 
      role: 'assistant', 
      content: '', 
      streaming: true,
      timestamp: new Date().toISOString(),
    })

    setLoading(true)
    abortRef.current = false

    let question = text
    if (imageUrls.length > 0) {
      const imgMarkdown = imageUrls.map(url => `![image](${url})`).join('\n')
      question = `${imgMarkdown}\n${text || 'Please analyze this image.'}`
    }

    await streamChat({
      question,
      sessionId: convId,
      temperature: settings.temperature,
      model: settings.model,
      onChunk: (full) => {
        if (!abortRef.current) updateLastAI(convId, full, false)
      },
      onDone: (full) => {
        updateLastAI(convId, full, true)
        setLoading(false)
      },
      onError: (msg) => {
        updateLastAI(convId, `⚠️ Error: ${msg}`, true)
        setError(msg)
        setLoading(false)
      },
    })
  }, [activeId, newChat, addMessage, updateLastAI, settings])

  const stop = useCallback(() => { 
    abortRef.current = true
    setLoading(false) 
  }, [])

  return { loading, error, sendMessage, stop, conversation: getActive() }
}
