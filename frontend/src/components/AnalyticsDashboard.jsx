import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BarChart2, Activity, Server, Zap, RefreshCw, Cpu, Database, FileText, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { getAdminStats, getStatus } from '../services/api'

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [sData, hData] = await Promise.all([getAdminStats(), getStatus()])
      setStats(sData)
      setHealth(hData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-950">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-brand animate-spin" />
          <p className="text-xs text-white/40 font-semibold animate-pulse-slow">Loading enterprise metrics...</p>
        </div>
      </div>
    )
  }

  // Curated elegant palette
  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899']

  const cardData = [
    { label: 'Total Sessions', value: stats.total_chats ?? 0, desc: 'Active developer contexts', icon: '💬', color: 'border-indigo-500/10 hover:border-indigo-500/30' },
    { label: 'User Nodes', value: stats.total_users ?? 0, desc: 'Registered identifiers', icon: '👤', color: 'border-emerald-500/10 hover:border-emerald-500/30' },
    { label: 'OCR Transcriptions', value: stats.ocr_requests ?? 0, desc: 'Vision entityExtractions', icon: '🖼️', color: 'border-amber-500/10 hover:border-amber-500/30' },
    { label: 'Inference Tokens', value: stats.total_tokens_used ?? 0, desc: 'Accumulated token volume', icon: '🔢', color: 'border-purple-500/10 hover:border-purple-500/30' },
    { label: 'API Call Counts', value: stats.api_calls ?? 0, desc: 'HTTP endpoint executions', icon: '🌐', color: 'border-cyan-500/10 hover:border-cyan-500/30' },
    { label: 'Agent Iterations', value: stats.agent_executions ?? 0, desc: 'LangChain tool routes', icon: '🧠', color: 'border-rose-500/10 hover:border-rose-500/30' },
    { label: 'Vector Queries', value: stats.vector_searches ?? 0, desc: 'FAISS semantic searches', icon: '🔍', color: 'border-violet-500/10 hover:border-violet-500/30' },
    { label: 'Response Latency', value: `${(stats.avg_latency_sec ?? 1.25).toFixed(2)}s`, desc: 'Average LLM inference delay', icon: '⚡', color: 'border-yellow-500/10 hover:border-yellow-500/30' },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-950 text-white p-6 md:p-8 space-y-8 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-display flex items-center gap-2.5">
            <BarChart2 className="text-brand" size={24} /> System Telemetry Dashboard
          </h1>
          <p className="text-xs text-white/40 mt-1 font-medium">Real-time model performance, token volumes, database indexing rate, and microservice latencies.</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-200"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Sync Diagnostics
        </button>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {cardData.map((c, idx) => (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -3 }}
            className={`glass-card border border-white/5 rounded-2xl p-5 flex flex-col justify-between cursor-default relative overflow-hidden group ${c.color}`}
          >
            {/* Subtle card grid effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{c.label}</span>
              <span className="text-base">{c.icon}</span>
            </div>
            
            <div className="mt-1">
              <h3 className="text-2xl font-black font-display text-white tracking-tight leading-none">{c.value}</h3>
              <p className="text-[10px] text-white/30 mt-1.5 font-medium">{c.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Subsystem Health Dashboard */}
      <div className="glass-card border border-white/5 rounded-2xl p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/85 mb-5 flex items-center gap-2">
          <Server size={14} className="text-brand" /> Microservice Status Telemetry
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {health && Object.entries(health.components || {}).map(([key, val]) => {
            const isOnline = val.status === "online"
            return (
              <div key={key} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[9px] text-white/30 uppercase font-bold block mb-1 truncate">{key.replace("_", " ")}</span>
                  <span className="text-xs text-white/80 font-bold block truncate" title={val.details}>{val.details}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-4">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-brand-emerald shadow-glow-emerald' : 'bg-red-500 animate-pulse'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-white/60">{isOnline ? 'Active' : 'Degraded'}</span>
                </div>
              </div>
            )
          })}
          {/* Latency card */}
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-[9px] text-white/30 uppercase font-bold block mb-1">Vector DB Latency</span>
              <span className="text-xs text-brand-emerald font-extrabold block">{health?.backend_latency_ms ?? 2.4} ms</span>
            </div>
            <div className="flex items-center gap-1.5 mt-4">
              <Clock size={12} className="text-brand-emerald" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-brand-emerald">Optimal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Usage Over Time */}
        <div className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-5 flex items-center gap-2">
            <Activity size={14} className="text-brand" /> Operation & Query Velocity
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.usage_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <Tooltip contentStyle={{ background: '#0b0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                <Line type="monotone" dataKey="queries" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', strokeWidth: 1 }} name="User Queries" activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="ocr" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', strokeWidth: 1 }} name="OCR Vision" activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Token Consumption */}
        <div className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-5 flex items-center gap-2">
            <Zap size={14} className="text-cyan-400" /> Token Volume Consumed (Daily)
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.usage_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <Tooltip contentStyle={{ background: '#0b0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="tokens" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorTokens)" name="Tokens" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Tools Usage Breakdown */}
        <div className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-5 flex items-center gap-2">
            <Cpu size={14} className="text-indigo-400" /> Specialized Tool Breakdowns
          </h3>
          <div className="h-64 w-full flex items-center justify-between">
            <div className="flex-1 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.tool_usage}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {stats.tool_usage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0b0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2.5 pr-8 pl-4">
              {stats.tool_usage.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2.5 text-[11px] font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-white/60 truncate max-w-[120px]">{entry.name}</span>
                  <span className="text-white font-bold ml-auto">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* File Upload Trends */}
        <div className="glass-card border border-white/5 rounded-2xl p-5 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/80 mb-5 flex items-center gap-2">
            <FileText size={14} className="text-emerald-400" /> Vector Database Indexings
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.usage_trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} fontFamily="monospace" />
                <Tooltip contentStyle={{ background: '#0b0b0e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '10px' }} />
                <Bar dataKey="uploads" fill="#10b981" radius={[5, 5, 0, 0]} name="Documents Cataloged" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  )
}
