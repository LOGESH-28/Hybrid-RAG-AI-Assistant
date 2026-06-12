import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Menu, BarChart2, Trash2, Settings, Cpu, Database, MessageSquare, ExternalLink, Zap } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import ChatWorkspace from '../components/ChatWorkspace'
import ToolsEcosystem from '../components/ToolsEcosystem'
import FileManager from '../components/FileManager'
import AnalyticsDashboard from '../components/AnalyticsDashboard'
import SettingsPanel from '../components/SettingsPanel'
import { useChat } from '../hooks/useChat'
import useChatStore from '../store/chatStore'
import { clearHistory } from '../services/api'

export default function ChatPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'tools' | 'files' | 'analytics' | 'settings'
  const { loading, sendMessage, stop, conversation } = useChat()
  const { activeId, clearMessages, loadSessions, settings } = useChatStore()

  // On mount, load conversations from backend database
  useEffect(() => {
    loadSessions()
  }, [])


  const handleClear = async () => {
    if (!activeId) return
    if (!confirm('Are you sure you want to clear current conversation history?')) return
    clearMessages(activeId)
    await clearHistory(activeId)
  }

  // Get active view component
  const renderActiveView = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <ChatWorkspace 
            conversation={conversation} 
            loading={loading} 
            onSend={sendMessage} 
            onStop={stop} 
          />
        )
      case 'tools':
        return <ToolsEcosystem />
      case 'files':
        return <FileManager />
      case 'analytics':
        return <AnalyticsDashboard />
      case 'settings':
        return <SettingsPanel />
      default:
        return <div className="p-8 text-center text-white/40">View not found</div>
    }
  }

  // Get header parameters depending on tab
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'chat':
        return {
          title: conversation?.title ?? 'Loki Workspace',
          showActions: true
        }
      case 'tools':
        return {
          title: 'Specialized AI Tools Console',
          showActions: false
        }
      case 'files':
        return {
          title: 'Knowledge Base Documents',
          showActions: false
        }
      case 'analytics':
        return {
          title: 'System Telemetry Monitor',
          showActions: false
        }
      case 'settings':
        return {
          title: 'System Properties',
          showActions: false
        }
      default:
        return { title: 'Loki AI', showActions: false }
    }
  }

  const headerInfo = getHeaderInfo()

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-950 text-white font-sans">
      {/* Sidebar Navigation */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Panel Content */}
      <div className="flex flex-col flex-1 min-w-0">
        
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-surface-950/70 backdrop-blur-md flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button 
                onClick={() => setSidebarCollapsed(false)} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                title="Expand sidebar"
              >
                <Menu size={16} />
              </button>
            )}
            <div className="text-sm font-bold text-white tracking-tight truncate max-w-[200px] sm:max-w-sm flex items-center gap-2 font-display">
              {activeTab === 'chat' && <MessageSquare size={14} className="text-brand opacity-80" />}
              {activeTab === 'tools' && <Cpu size={14} className="text-brand opacity-80" />}
              {activeTab === 'files' && <Database size={14} className="text-brand opacity-80" />}
              {activeTab === 'analytics' && <BarChart2 size={14} className="text-brand opacity-80" />}
              {activeTab === 'settings' && <Settings size={14} className="text-brand opacity-80" />}
              <span>{headerInfo.title}</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5">
            {headerInfo.showActions && activeId && (
              <button 
                onClick={handleClear} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:text-red-400 hover:bg-red-500/5 text-xs font-bold text-white/40 border border-transparent transition"
              >
                <Trash2 size={13} /> <span>Clear Session</span>
              </button>
            )}
            
            <a 
              href="http://localhost:5000" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl hover:text-white hover:bg-white/5 text-xs font-bold text-white/40 border border-white/5 transition-all duration-200"
            >
              <ExternalLink size={13} /> <span>MLflow Registry</span>
            </a>
          </div>
        </header>

        {/* Dynamic Inner View */}
        <div className="flex-1 min-h-0 relative flex flex-col">
          {renderActiveView()}
        </div>
      </div>
    </div>
  )
}
