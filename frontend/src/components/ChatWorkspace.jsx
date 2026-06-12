import { useState } from 'react'
import ChatArea from './ChatArea'
import InputBar from './InputBar'

export default function ChatWorkspace({ conversation, loading, onSend, onStop }) {
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-surface-950 overflow-hidden h-full">
      {/* Messages area */}
      <ChatArea conversation={conversation} loading={loading} onSend={onSend} />
      
      {/* Fixed bottom input bar */}
      <InputBar onSend={onSend} loading={loading} onStop={onStop} />
    </div>
  )
}
