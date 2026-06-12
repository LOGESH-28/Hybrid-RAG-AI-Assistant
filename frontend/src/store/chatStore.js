import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import { getSessions, createSession, updateSession, deleteSession, getStatus, getMemories, clearMemories } from '../services/api'

const useChatStore = create(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      settings: {
        theme: 'dark',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        voiceEnabled: true,
        voiceSpeed: 1.0,
        ocrLanguage: 'eng',
        memoryEnabled: true
      },

      // --- Settings ---
      updateSettings: (fields) => set(s => ({ settings: { ...s.settings, ...fields } })),

      // --- Sync with Backend ---
      loadSessions: async () => {
        try {
          const sessions = await getSessions()
          // map server sessions to store format
          const formatted = sessions.map(s => ({
            id: s.id,
            title: s.title || 'New Chat',
            isPinned: s.is_pinned === 1,
            messages: [], // messages will be fetched on demand
            createdAt: s.created_at || new Date().toISOString()
          }))
          
          set({ conversations: formatted })
          
          // Set active if none is active
          if (formatted.length > 0 && !get().activeId) {
            get().setActive(formatted[0].id)
          }
        } catch (e) {
          console.error("Failed to load sessions from server:", e)
        }
      },

      newChat: async (title = 'New Chat') => {
        const id = nanoid()
        const newConv = { id, title, isPinned: false, messages: [], createdAt: new Date().toISOString() }
        
        // Optimistic UI update
        set(s => ({
          conversations: [newConv, ...s.conversations],
          activeId: id,
        }))

        try {
          await createSession(id, title)
        } catch (e) {
          console.error("Failed to create session on server:", e)
        }
        return id
      },

      setActive: async (id) => {
        set({ activeId: id })
        if (!id) return

        // Load conversation history from server
        try {
          const res = await fetch(`/chat/history?session_id=${id}`)
          if (res.ok) {
            const data = await res.json()
            const history = data.history || []
            // map database message structure to local message structure
            const formattedMessages = history.map((m, idx) => ({
              id: `${id}-${idx}`,
              role: m.role,
              content: m.content,
              sourceType: m.source_type,
              latencySec: m.latency_sec,
              tokensUsed: m.tokens_used,
              timestamp: m.timestamp
            }))

            set(s => ({
              conversations: s.conversations.map(c =>
                c.id === id ? { ...c, messages: formattedMessages } : c
              )
            }))
          }
        } catch (e) {
          console.error("Failed to load chat history:", e)
        }
      },

      renameConv: async (id, newTitle) => {
        set(s => ({
          conversations: s.conversations.map(c =>
            c.id === id ? { ...c, title: newTitle } : c
          )
        }))
        try {
          await updateSession(id, { title: newTitle })
        } catch (e) {
          console.error("Failed to rename session on server:", e)
        }
      },

      togglePinConv: async (id) => {
        let isPinned = false
        set(s => ({
          conversations: s.conversations.map(c => {
            if (c.id === id) {
              isPinned = !c.isPinned
              return { ...c, isPinned }
            }
            return c
          }).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1
            if (!a.isPinned && b.isPinned) return 1
            return new Date(b.createdAt) - new Date(a.createdAt)
          })
        }))
        try {
          await updateSession(id, { is_pinned: isPinned })
        } catch (e) {
          console.error("Failed to pin session on server:", e)
        }
      },

      deleteConv: async (id) => {
        set(s => {
          const convs = s.conversations.filter(c => c.id !== id)
          return {
            conversations: convs,
            activeId: s.activeId === id ? (convs[0]?.id ?? null) : s.activeId,
          }
        })
        try {
          await deleteSession(id)
        } catch (e) {
          console.error("Failed to delete session on server:", e)
        }
      },

      addMessage: (convId, msg) =>
        set(s => ({
          conversations: s.conversations.map(c => {
            if (c.id !== convId) return c
            
            const messages = [...c.messages, msg]
            const autoTitle = c.messages.length === 0 && msg.role === 'user'
              ? msg.content.slice(0, 30).replace(/\n/g, ' ') || 'New Chat'
              : c.title

            if (autoTitle !== c.title) {
              // Trigger rename on server asynchronously
              updateSession(convId, { title: autoTitle }).catch(err => console.error(err))
            }

            return {
              ...c,
              messages,
              title: autoTitle
            }
          }),
        })),

      updateLastAI: (convId, content, done = false) =>
        set(s => ({
          conversations: s.conversations.map(c => {
            if (c.id !== convId) return c
            const msgs = [...c.messages]
            const last = msgs[msgs.length - 1]
            if (last?.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content, streaming: !done }
            }
            return { ...c, messages: msgs }
          }),
        })),

      clearMessages: (convId) =>
        set(s => ({
          conversations: s.conversations.map(c =>
            c.id === convId ? { ...c, messages: [] } : c
          ),
        })),

      getActive: () => {
        const { conversations, activeId } = get()
        return conversations.find(c => c.id === activeId) ?? null
      },
    }),
    { 
      name: 'loki-chat-v3', 
      version: 1,
      partialize: (state) => ({ settings: state.settings }) // only persist settings in localstorage, sessions will load from DB
    }
  )
)

export default useChatStore
