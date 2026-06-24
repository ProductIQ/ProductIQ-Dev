// src/pages/ChatPage.tsx
// AI Chat — RAG intelligence assistant.
// Design: clean two-panel layout, typographic, no colorful decoration.

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Send, ArrowRight, RotateCcw, Copy, Check, ChevronRight,
} from 'lucide-react'
import {
  MOCK_CHAT_SESSIONS,
  MOCK_SUGGESTED_QUESTIONS,
  type ChatMessage,
  type ChatSession,
} from '@/lib/mockData'

// ── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3.5">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#C8C8C8]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ── Streaming text simulation ────────────────────────────────────────────────
function StreamText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [shown, setShown] = useState('')
  const idx = useRef(0)

  useEffect(() => {
    idx.current = 0
    setShown('')
    const iv = setInterval(() => {
      if (idx.current < text.length) {
        setShown(prev => prev + text.slice(idx.current, idx.current + 4))
        idx.current += 4
      } else {
        clearInterval(iv)
        onDone?.()
      }
    }, 10)
    return () => clearInterval(iv)
  }, [text])

  return <>{shown}</>
}

// ── Inline markdown renderer — no heavy deps ─────────────────────────────────
function Prose({ text }: { text: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-[#0A0A0A] space-y-1">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <p key={i} className="font-bold text-[#0A0A0A] mt-2 first:mt-0">{line.slice(2, -2)}</p>
        }
        if (line.startsWith('- ')) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-0.5 h-full min-h-[14px] rounded-full bg-[#D1D5DB] mt-1" />
              <span className="text-[#6B6B6B]">{line.slice(2)}</span>
            </div>
          )
        }
        if (line === '') return <div key={i} className="h-1" />
        return <span key={i} className="block">{line}</span>
      })}
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, isNew = false }: { msg: ChatMessage; isNew?: boolean }) {
  const [streaming, setStreaming] = useState(isNew && msg.role === 'assistant')
  const [copied, setCopied]       = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(msg.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  if (msg.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
        <div
          className="max-w-[72%] rounded-[16px] rounded-br-[4px] px-4 py-3"
          style={{ background: '#0F0F0F', color: '#fff' }}
        >
          <p className="text-[13px] leading-relaxed">{msg.content}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
      {/* IQ avatar */}
      <div
        className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 text-[9px] font-black"
        style={{ background: '#C8F04A', color: '#0A0A0A' }}
      >
        IQ
      </div>

      <div className="flex-1 min-w-0">
        <div
          className="inline-block rounded-[16px] rounded-tl-[4px] px-4 py-3.5 max-w-[92%]"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}
        >
          {streaming
            ? (
              <div className="text-[13px] leading-relaxed text-[#0A0A0A]">
                <StreamText text={msg.content} onDone={() => setStreaming(false)} />
              </div>
            )
            : <Prose text={msg.content} />
          }

          {msg.citations && msg.citations.length > 0 && !streaming && (
            <div className="mt-3 pt-2.5 border-t border-[rgba(0,0,0,0.06)] flex flex-wrap gap-1.5">
              {msg.citations.map((c, i) => (
                <span
                  key={i}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(0,0,0,0.05)', color: '#6B6B6B' }}
                  title={c.source}
                >
                  {c.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {!streaming && (
          <button
            onClick={copy}
            className="mt-1.5 ml-1 flex items-center gap-1 text-[10px] text-[#C8C8C8] hover:text-[#6B6B6B] transition-colors"
          >
            {copied ? <Check size={9} /> : <Copy size={9} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Session panel ────────────────────────────────────────────────────────────
function SessionList({
  sessions, activeId, onSelect,
}: {
  sessions: ChatSession[]
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="w-52 flex-shrink-0 bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[rgba(0,0,0,0.05)]">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3]">Sessions</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="w-full text-left px-4 py-3 border-b border-[rgba(0,0,0,0.04)] last:border-0 transition-colors hover:bg-[#FAFAFA]"
            style={{
              background: activeId === s.id ? '#FAFAFA' : 'transparent',
              borderLeft: activeId === s.id ? '2px solid #0A0A0A' : '2px solid transparent',
            }}
          >
            <p className="text-[12px] font-semibold text-[#0A0A0A] truncate">{s.brandName}</p>
            <p className="text-[10px] text-[#A3A3A3] mt-0.5 truncate">{s.category}</p>
            <p className="text-[10px] text-[#C8C8C8] mt-0.5">{s.messages.length} messages</p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Canned responses for demo ────────────────────────────────────────────────
function getResponse(q: string): { content: string; citations: { text: string; source: string }[] } {
  const lower = q.toLowerCase()
  if (lower.includes('pain') || lower.includes('unhappy') || lower.includes('complaint')) {
    return {
      content: `Based on review cluster analysis across 847 customer reviews:\n\n**Top pain points by volume**\n\n- Packaging quality (127 reviews, ★2.1) — scoop missing or buried, seal fails to reseal\n- Taste consistency (98 reviews, ★2.8) — batch-to-batch variation\n- Mixability (76 reviews, ★3.0) — clumps in cold water\n- Value perception (68 reviews, ★2.5) — underfilled appearance\n\nMost actionable gap: packaging. Competitors MuscleBlaze and MyProtein score ★4.1 on packaging vs your ★3.1.`,
      citations: [{ text: '847 reviews analysed', source: 'Review Miner' }, { text: 'Competitor packaging benchmark', source: 'Competitor Intel' }],
    }
  }
  if (lower.includes('price') || lower.includes('optimal') || lower.includes('concept')) {
    return {
      content: `For Concept #2 (Ashwagandha + Whey Blend, 1kg), the data suggests an optimal launch price of ₹1,249–₹1,399.\n\n**Reasoning**\n\n- Market leaders in adaptogens + protein: ₹1,100–₹1,600\n- Price elasticity: every ₹100 above ₹1,400 reduces conversion ~18%\n- Psychological anchor: ₹1,299 sits below the ₹1,300 barrier\n\n**Recommendation**: Launch at ₹1,399 with a 90-day introductory offer at ₹1,199, then normalise.`,
      citations: [{ text: 'Price elasticity model', source: 'Insight Synthesis' }, { text: 'Competitor pricing matrix', source: 'Price Tracker' }],
    }
  }
  if (lower.includes('fssai') || lower.includes('ashwagandha') || lower.includes('compliance')) {
    return {
      content: `FSSAI requirements for ashwagandha in food products (current as of 2026):\n\n- Classified as a permitted ingredient under Schedule 1, List B\n- Industry standard dosage: 300–600mg per serving\n- Must declare the branded extract name (e.g. "KSM-66 Ashwagandha") on the label\n- Immunity claims are prohibited without clinical evidence — use "supports stress adaptation" instead\n- Third-party certificate of analysis required before manufacturing\n\n**Timeline**: FSSAI nutraceutical registration takes 45–90 days. Budget ₹80,000–₹1.5L.`,
      citations: [{ text: 'FSSAI Schedule 1 List B', source: 'Compliance Guardian' }],
    }
  }
  return {
    content: `Based on the data from your most recent run across 847 reviews and 18 competitor SKUs, here are the key findings:\n\n- The sugar-free certified segment is 0% of the top-10 — the largest uncaptured gap\n- Packaging quality is the top pain point (127 reviews, ★2.1)\n- Your target demographic (25–38, urban professionals) shows 92% positive NPS when taste scores above ★4.0\n\nWould you like me to go deeper on any of these points?`,
    citations: [{ text: '847 reviews synthesised', source: 'Review Miner' }],
  }
}

// ── Main page ────────────────────────────────────────────────────────────────
export function ChatPage() {
  const [sessions, setSessions]   = useState<ChatSession[]>(MOCK_CHAT_SESSIONS)
  const [activeId, setActiveId]   = useState(MOCK_CHAT_SESSIONS[0].id)
  const [input, setInput]         = useState('')
  const [thinking, setThinking]   = useState(false)
  const bottomRef                  = useRef<HTMLDivElement>(null)

  const active = sessions.find(s => s.id === activeId) ?? sessions[0]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length, thinking])

  const send = () => {
    if (!input.trim() || thinking) return
    const q = input.trim()
    setInput('')
    setThinking(true)

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: 'user', content: q,
      timestamp: new Date().toISOString(),
    }
    setSessions(prev => prev.map(s =>
      s.id === activeId ? { ...s, messages: [...s.messages, userMsg] } : s,
    ))

    setTimeout(() => {
      const { content, citations } = getResponse(q)
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`, role: 'assistant', content,
        timestamp: new Date().toISOString(), citations,
      }
      setSessions(prev => prev.map(s =>
        s.id === activeId ? { ...s, messages: [...s.messages, aiMsg] } : s,
      ))
      setThinking(false)
    }, 1600)
  }

  const clear = () =>
    setSessions(prev => prev.map(s => s.id === activeId ? { ...s, messages: [] } : s))

  return (
    <div className="max-w-[1080px] mx-auto" style={{ height: 'calc(100vh - 112px)' }}>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">AI Intelligence</p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">AI Chat</h1>
        </motion.div>
        <span className="text-[11px] font-semibold text-[#A3A3A3] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#C8F04A] animate-pulse" />
          Gemini Pro · RAG active
        </span>
      </div>

      <div className="flex gap-4 h-[calc(100%-68px)]">
        {/* Session list */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.06 }}>
          <SessionList sessions={sessions} activeId={activeId} onSelect={setActiveId} />
        </motion.div>

        {/* Chat panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 flex flex-col min-w-0 bg-white rounded-[20px] border border-[rgba(0,0,0,0.07)] overflow-hidden"
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
            <div>
              <p className="text-[13px] font-bold text-[#0A0A0A]">{active.brandName} — Intelligence Assistant</p>
              <p className="text-[10px] text-[#A3A3A3] mt-0.5">Context: {active.category} · {active.messages.length} messages</p>
            </div>
            <button
              onClick={clear}
              className="flex items-center gap-1 text-[11px] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
            >
              <RotateCcw size={10} /> Clear
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {active.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div
                  className="w-12 h-12 rounded-[16px] flex items-center justify-center mb-4 text-[14px] font-black"
                  style={{ background: '#C8F04A', color: '#0A0A0A' }}
                >
                  IQ
                </div>
                <p className="text-[14px] font-bold text-[#0A0A0A] mb-1.5">Ask anything about your data</p>
                <p className="text-[12px] text-[#A3A3A3] max-w-xs">
                  I have full context of your reports, reviews, competitors, and market trends.
                </p>
              </div>
            ) : (
              active.messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isNew={i === active.messages.length - 1 && msg.role === 'assistant'}
                />
              ))
            )}
            {thinking && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0 text-[9px] font-black" style={{ background: '#C8F04A', color: '#0A0A0A' }}>IQ</div>
                <div className="bg-white border border-[rgba(0,0,0,0.07)] rounded-[16px] rounded-tl-[4px]">
                  <TypingDots />
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested questions — only when empty */}
          {active.messages.length === 0 && (
            <div className="px-5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#A3A3A3] mb-2">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {MOCK_SUGGESTED_QUESTIONS.slice(0, 4).map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full border border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.25)] hover:bg-[#F8F9FB] transition-all text-[#0A0A0A]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-5 py-4 border-t border-[rgba(0,0,0,0.06)]">
            <div className="flex items-end gap-2.5">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                placeholder="Ask anything about your market data..."
                rows={1}
                className="flex-1 resize-none rounded-[12px] px-4 py-3 text-[13px] border border-[rgba(0,0,0,0.12)] outline-none focus:border-[#0A0A0A] transition-colors leading-relaxed"
                style={{ maxHeight: 100, fontFamily: 'inherit', background: '#F8F9FB' }}
                onInput={e => {
                  const t = e.currentTarget; t.style.height = 'auto'
                  t.style.height = `${Math.min(t.scrollHeight, 100)}px`
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim() || thinking}
                className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && !thinking ? '#0F0F0F' : '#F0F2F5',
                  color: input.trim() && !thinking ? '#C8F04A' : '#A3A3A3',
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-[10px] text-[#C8C8C8] mt-2 text-center">
              {active.category} context · press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
