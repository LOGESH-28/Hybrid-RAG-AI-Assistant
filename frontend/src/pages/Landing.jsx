import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import {
  ArrowRight, Zap, MessageSquare, Database, Cpu,
  BarChart2, Globe, Sparkles, ExternalLink,
  CheckCircle2, Activity, Shield, Lock
} from 'lucide-react'
import useChatStore from '../store/chatStore'

// ─── Typing Hook ──────────────────────────────────────────────────────────────
const PHRASES = [
  'Chat with your documents instantly.',
  'Hybrid FAISS + BM25 vector retrieval.',
  'Real-time token streaming via Groq.',
  'OCR + LangChain + MLflow telemetry.',
]
function useTyping(phrases, speed = 48, pause = 1600) {
  const [text, setText] = useState('')
  const [pi, setPi] = useState(0)
  const [del, setDel] = useState(false)
  useEffect(() => {
    const full = phrases[pi]
    let t
    if (!del && text === full)       t = setTimeout(() => setDel(true), pause)
    else if (del && text === '')     { setDel(false); setPi(p => (p + 1) % phrases.length) }
    else t = setTimeout(() => setText(del ? full.slice(0, text.length - 1) : full.slice(0, text.length + 1)), del ? speed / 2 : speed)
    return () => clearTimeout(t)
  }, [text, del, pi, phrases, speed, pause])
  return text
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const METRICS = [
  { value: '10K+',    label: 'Queries' },
  { value: '99.9%',  label: 'Uptime'  },
  { value: 'OCR+RAG',label: 'Vision'  },
  { value: 'Groq',   label: 'Engine'  },
]
const FEATURES = [
  { icon: MessageSquare, title: 'Streaming Workspace',     desc: 'Token-by-token real-time output via Groq streaming.',        color: '#6366f1', glow: 'rgba(99,102,241,0.3)'  },
  { icon: Database,      title: 'Knowledge Base RAG',      desc: 'Hybrid FAISS + BM25 vector retrieval over your documents.',  color: '#10b981', glow: 'rgba(16,185,129,0.3)'  },
  { icon: Cpu,           title: 'OCR Vision Intelligence', desc: 'Extract structured text from scanned files automatically.',   color: '#f59e0b', glow: 'rgba(245,158,11,0.3)'  },
  { icon: Globe,         title: 'Autonomous Web Search',   desc: 'Smart search triggers when local context is insufficient.',   color: '#06b6d4', glow: 'rgba(6,182,212,0.3)'   },
  { icon: Sparkles,      title: 'LangChain Orchestration', desc: 'Multi-tool reasoning with calculations and live lookup.',     color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)'  },
  { icon: BarChart2,     title: 'MLflow Diagnostics',      desc: 'Trace latencies, params and token costs in real-time.',      color: '#ec4899', glow: 'rgba(236,72,153,0.3)'  },
]
const TRUST = [
  { icon: Shield,       label: 'Enterprise Ready' },
  { icon: Lock,         label: 'Local First'      },
  { icon: Activity,     label: 'Live Telemetry'   },
  { icon: CheckCircle2, label: 'Open Source'      },
]

// ─── Neural Illustration (compact) ───────────────────────────────────────────
function NeuralIllustration() {
  const nodes = [
    { cx: 160, cy: 80,  r: 7,  c: '#6366f1' },
    { cx: 260, cy: 140, r: 11, c: '#8b5cf6' },
    { cx: 110, cy: 195, r: 6,  c: '#06b6d4' },
    { cx: 300, cy: 240, r: 9,  c: '#6366f1' },
    { cx: 175, cy: 290, r: 8,  c: '#ec4899' },
    { cx: 80,  cy: 125, r: 5,  c: '#8b5cf6' },
    { cx: 235, cy: 345, r: 7,  c: '#10b981' },
    { cx: 350, cy: 165, r: 6,  c: '#06b6d4' },
    { cx: 130, cy: 325, r: 5,  c: '#6366f1' },
    { cx: 285, cy: 95,  r: 5,  c: '#ec4899' },
  ]
  const edges = [[0,1],[0,2],[1,3],[1,7],[2,4],[3,4],[4,6],[2,5],[5,0],[6,8],[1,9],[9,7],[3,7],[4,8]]
  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'radial-gradient(ellipse 65% 55% at 55% 45%, rgba(99,102,241,0.10) 0%, transparent 70%)' }} />

      {/* Floating doc cards */}
      {[
        { top: '6%',  left: '3%',  label: 'document.pdf', d: 0   },
        { top: '52%', left: '-1%', label: 'research.txt', d: 0.7 },
        { top: '78%', left: '54%', label: 'analysis.png', d: 1.3 },
      ].map((card, i) => (
        <motion.div key={i}
          className="absolute px-2.5 py-1.5 rounded-lg text-[9px] font-mono font-semibold border"
          style={{ top: card.top, left: card.left, background: 'rgba(99,102,241,0.09)', borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(10px)' }}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3.5 + i, delay: card.d, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-brand animate-pulse" />{card.label}
          </div>
        </motion.div>
      ))}

      <svg viewBox="0 0 400 400" className="w-full max-w-[360px]">
        <defs>
          <radialGradient id="ng"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.13"/><stop offset="100%" stopColor="transparent" stopOpacity="0"/></radialGradient>
          <filter id="gf"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <circle cx="200" cy="200" r="165" fill="url(#ng)"/>
        <circle cx="200" cy="200" r="155" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="1"/>
        <circle cx="200" cy="200" r="105" fill="none" stroke="rgba(139,92,246,0.05)" strokeWidth="1"/>
        {edges.map(([a,b],i) => (
          <motion.line key={i} x1={nodes[a].cx} y1={nodes[a].cy} x2={nodes[b].cx} y2={nodes[b].cy}
            stroke="rgba(99,102,241,0.22)" strokeWidth="1"
            animate={{ opacity: [0.12, 0.45, 0.12] }}
            transition={{ duration: 2.5+(i%3), delay: i*0.15, repeat: Infinity }}
          />
        ))}
        {nodes.map((n,i) => (
          <motion.g key={i} filter="url(#gf)">
            <motion.circle cx={n.cx} cy={n.cy} r={n.r+4} fill={n.c} fillOpacity="0.12"
              animate={{ r:[n.r+4,n.r+8,n.r+4] }} transition={{ duration:2+(i%4)*0.4, delay:i*0.15, repeat:Infinity }}/>
            <circle cx={n.cx} cy={n.cy} r={n.r} fill={n.c} fillOpacity="0.9"/>
          </motion.g>
        ))}
        <motion.circle cx="200" cy="200" r="22" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.5)" strokeWidth="1.5"
          animate={{ r:[22,26,22] }} transition={{ duration:3, repeat:Infinity }}/>
        <text x="200" y="204" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="9" fontWeight="700" fontFamily="Inter,sans-serif">LOKI</text>
      </svg>

      <motion.div className="absolute bottom-3 right-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[9px] font-semibold"
        style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)', color: 'rgba(255,255,255,0.60)', backdropFilter: 'blur(10px)' }}
        animate={{ y:[0,-4,0] }} transition={{ duration:4, repeat:Infinity }}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>All Systems Operational
      </motion.div>
    </div>
  )
}

// ─── Ambient Orb ─────────────────────────────────────────────────────────────
function Orb({ style, animate, transition }) {
  return <motion.div className="absolute rounded-full pointer-events-none" style={{ filter:'blur(70px)', opacity:0.14, ...style }} animate={animate} transition={transition}/>
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const { newChat } = useChatStore()
  const typingText = useTyping(PHRASES)

  const start = async () => { await newChat(); navigate('/chat') }

  const fadeUp = { hidden:{opacity:0,y:20}, show:{opacity:1,y:0,transition:{type:'spring',stiffness:100,damping:22}} }
  const container = { hidden:{}, show:{ transition:{ staggerChildren:0.08, delayChildren:0.04 } } }

  return (
    <div className="relative w-full overflow-x-hidden overflow-y-auto" style={{ background:'#06060c', minHeight:'100vh' }}>

      {/* Ambient orbs */}
      <Orb style={{ width:500, height:500, left:'2%',  top:'-5%',  background:'rgba(99,102,241,1)'  }} animate={{ y:[0,-20,0] }} transition={{ duration:10, repeat:Infinity }}/>
      <Orb style={{ width:400, height:400, left:'65%', top:'2%',   background:'rgba(139,92,246,1)'  }} animate={{ y:[0,-15,0] }} transition={{ duration:12, repeat:Infinity, delay:1.5 }}/>
      <Orb style={{ width:350, height:350, left:'40%', top:'55%',  background:'rgba(6,182,212,1)'   }} animate={{ y:[0,-12,0] }} transition={{ duration:9,  repeat:Infinity, delay:3 }}/>
      <Orb style={{ width:300, height:300, left:'-5%', top:'50%',  background:'rgba(236,72,153,1)'  }} animate={{ y:[0,-18,0] }} transition={{ duration:11, repeat:Infinity, delay:2 }}/>

      {/* Mesh grid */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage:'linear-gradient(rgba(255,255,255,0.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.022) 1px,transparent 1px)',
        backgroundSize:'44px 44px',
        maskImage:'radial-gradient(ellipse 80% 55% at 50% 0%, black 40%, transparent 100%)'
      }}/>

      {/* ══ HERO ══════════════════════════════════════════ */}
      <section className="relative z-10 flex items-center px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto" style={{ minHeight:'100vh', paddingTop:'5vh', paddingBottom:'4vh' }}>
        <motion.div variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-14 w-full items-center">

          {/* LEFT */}
          <div className="flex flex-col gap-4">

            {/* Pill */}
            <motion.div variants={fadeUp}>
              <a href="http://localhost:5000" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-semibold transition-all duration-200 group"
                style={{ background:'rgba(99,102,241,0.08)', borderColor:'rgba(99,102,241,0.25)', color:'rgba(255,255,255,0.70)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping"/>
                Powered by Groq · LLaMA 3.3 70B — v3.0
                <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform opacity-60"/>
              </a>
            </motion.div>

            {/* Brand */}
            <motion.div variants={fadeUp}>
              <span className="text-[10px] font-black tracking-[0.28em] uppercase"
                style={{ background:'linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Loki AI
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div variants={fadeUp}>
              <h1 className="font-display font-black leading-[1.06] tracking-tight"
                style={{ fontSize:'clamp(1.95rem,4.2vw,3rem)', color:'#f3f4f6' }}>
                Unleash the Power of{' '}
                <span style={{
                  background:'linear-gradient(135deg,#6366f1 0%,#8b5cf6 45%,#06b6d4 100%)',
                  WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                  filter:'drop-shadow(0 0 22px rgba(99,102,241,0.45))'
                }}>Multimodal AI</span>
              </h1>
            </motion.div>

            {/* Typing */}
            <motion.div variants={fadeUp} className="flex items-center gap-2 h-5">
              <span style={{ color:'rgba(255,255,255,0.40)', fontSize:'0.83rem', fontWeight:500 }}>{typingText}</span>
              <span className="inline-block w-0.5 h-4 rounded-full bg-brand animate-blink"/>
            </motion.div>

            {/* Description */}
            <motion.p variants={fadeUp}
              style={{ color:'rgba(255,255,255,0.40)', fontSize:'0.83rem', lineHeight:1.70, maxWidth:440 }}>
              A premium enterprise workspace to converse, index, search and analyze documents — engineered with live telemetry, FAISS vector search and custom LangChain pipelines.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} className="flex flex-wrap gap-2.5 mt-0.5">
              <motion.button onClick={start}
                whileHover={{ scale:1.035, boxShadow:'0 0 28px rgba(99,102,241,0.55)' }}
                whileTap={{ scale:0.97 }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs text-white transition-all duration-200"
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow:'0 0 16px rgba(99,102,241,0.32)' }}>
                <Zap size={13} className="fill-white/30"/> Start Workspace <ArrowRight size={13}/>
              </motion.button>

              <motion.a href="http://localhost:5000" target="_blank" rel="noreferrer"
                whileHover={{ scale:1.03, boxShadow:'0 0 16px rgba(99,102,241,0.18)' }}
                whileTap={{ scale:0.97 }}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.60)' }}>
                MLflow Registry <ExternalLink size={11} className="opacity-50"/>
              </motion.a>
            </motion.div>

            {/* Metrics */}
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-2 pt-4 border-t" style={{ borderColor:'rgba(255,255,255,0.06)' }}>
              {METRICS.map((m,i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <span className="font-display font-black text-base" style={{ color:'#f3f4f6' }}>{m.value}</span>
                  <span style={{ color:'rgba(255,255,255,0.32)', fontSize:'0.60rem', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em' }}>{m.label}</span>
                </div>
              ))}
            </motion.div>

            {/* Trust */}
            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              {TRUST.map(({ icon: Icon, label }, i) => (
                <div key={i} className="flex items-center gap-1" style={{ color:'rgba(255,255,255,0.28)', fontSize:'0.68rem', fontWeight:600 }}>
                  <Icon size={11} style={{ color:'#6366f1' }}/>{label}
                </div>
              ))}
            </motion.div>
          </div>

          {/* RIGHT — Illustration */}
          <motion.div variants={fadeUp} className="hidden lg:flex items-center justify-center relative" style={{ height:'62vh', maxHeight:480 }}>
            <div className="absolute inset-0 rounded-2xl" style={{ background:'rgba(255,255,255,0.018)', border:'1px solid rgba(255,255,255,0.06)', backdropFilter:'blur(10px)' }}/>
            <NeuralIllustration/>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════ */}
      <section className="relative z-10 px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto pb-16">

        {/* Header */}
        <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.5 }}
          className="text-center mb-8">
          <p className="text-[10px] font-bold tracking-[0.20em] uppercase mb-2" style={{ color:'rgba(99,102,241,0.8)' }}>Full-Stack AI Capabilities</p>
          <h2 className="font-display font-black text-2xl md:text-3xl mb-2.5" style={{ color:'#f3f4f6' }}>
            Everything you need,{' '}
            <span style={{ background:'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              out of the box
            </span>
          </h2>
          <p className="mx-auto text-sm" style={{ color:'rgba(255,255,255,0.35)', lineHeight:1.65, maxWidth:520 }}>
            A modular, enterprise-grade AI stack built for developers and researchers who demand more than a chat window.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <motion.div key={i}
                initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}
                transition={{ duration:0.45, delay:i*0.07 }}
                whileHover={{ y:-5, boxShadow:`0 0 28px ${f.glow}` }}
                className="group relative rounded-2xl p-5 cursor-default transition-all duration-300"
                style={{ background:'rgba(255,255,255,0.026)', border:'1px solid rgba(255,255,255,0.07)', backdropFilter:'blur(12px)' }}>

                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ boxShadow:`inset 0 0 0 1px ${f.color}50` }}/>

                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-110"
                  style={{ background:`${f.color}18`, boxShadow:`0 0 16px ${f.color}28` }}>
                  <Icon size={17} style={{ color:f.color }}/>
                </div>

                <h3 className="font-display font-bold text-[13px] mb-1.5" style={{ color:'#f3f4f6' }}>{f.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color:'rgba(255,255,255,0.36)' }}>{f.desc}</p>

                <div className="absolute bottom-0 left-0 right-0 h-px rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background:`linear-gradient(90deg,transparent,${f.color}80,transparent)` }}/>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 border-t" style={{ borderColor:'rgba(255,255,255,0.05)' }}>
        <span style={{ color:'rgba(255,255,255,0.16)', fontSize:'0.68rem', fontWeight:700, letterSpacing:'0.15em', textTransform:'uppercase' }}>
          Loki AI · Enterprise Suite · v3.0.0
        </span>
      </div>
    </div>
  )
}
