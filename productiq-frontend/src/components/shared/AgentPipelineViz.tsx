// src/components/shared/AgentPipelineViz.tsx
// Animated 12-node pipeline with SVG beam flows between nodes
import { motion } from 'motion/react'
import { AGENT_DEFINITIONS } from '@/types/agent'

// Extended to show all 12 agents on landing page
const ALL_AGENTS = [
  ...AGENT_DEFINITIONS,
  { number: 9,  name: 'Sentiment',    description: 'Real-time brand sentiment', icon: '❤️' },
  { number: 10, name: 'Price Opt.',   description: 'Optimal pricing model',     icon: '💰' },
  { number: 11, name: 'Supply Scout', description: 'Supplier discovery',        icon: '🏭' },
  { number: 12, name: 'Compliance',   description: 'Regulation checks',         icon: '✅' },
]

const NODE_COLORS = [
  '#D85A30', // coral — scraper
  '#1D9E75', // teal  — review
  '#7F77DD', // brand — competitor
  '#EF9F27', // amber — trend
  '#7F77DD', // brand — insight
  '#B19EEF', // light brand — innovator
  '#5DCAA5', // mint — gtm
  '#639922', // green — report
  '#FF6B9D', // pink — sentiment
  '#FAC775', // gold — price
  '#888780', // gray — supply
  '#5DCAA5', // teal — compliance
]

export function AgentPipelineViz() {
  // Two rows of 6 nodes each for landing page display
  const row1 = ALL_AGENTS.slice(0, 6)
  const row2 = ALL_AGENTS.slice(6, 12)

  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      {/* Row 1 */}
      <div className="flex items-center justify-between gap-1 mb-2">
        {row1.map((agent, idx) => (
          <PipelineNode
            key={agent.number}
            agent={agent}
            color={NODE_COLORS[idx]}
            delay={idx * 0.15}
            isLast={idx === row1.length - 1}
          />
        ))}
      </div>

      {/* Connector between rows */}
      <div className="flex justify-end pr-[8.3%] mb-2">
        <motion.div
          className="w-px bg-gradient-to-b from-brand-400/60 to-transparent"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 24, opacity: 1 }}
          transition={{ delay: row1.length * 0.15 + 0.1, duration: 0.4 }}
        />
      </div>

      {/* Row 2 — reversed direction */}
      <div className="flex items-center justify-between gap-1 flex-row-reverse mb-4">
        {row2.map((agent, idx) => (
          <PipelineNode
            key={agent.number}
            agent={agent}
            color={NODE_COLORS[6 + idx]}
            delay={(row1.length + (5 - idx)) * 0.15}
            isLast={idx === row2.length - 1}
            reversed
          />
        ))}
      </div>

      {/* Final Report node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          delay: ALL_AGENTS.length * 0.15 + 0.3,
          duration: 0.5,
          type: 'spring',
          bounce: 0.3,
        }}
        className="mx-auto w-fit"
      >
        <div className="relative px-5 py-3 rounded-xl bg-gradient-to-r from-brand-500/30 to-purple-600/30 border border-brand-400/50 backdrop-blur-sm flex items-center gap-3">
          {/* Pulse glow */}
          <div className="absolute inset-0 rounded-xl bg-brand-500/10 animate-pulse-soft" />
          <span className="text-xl">📊</span>
          <div>
            <div className="text-xs font-semibold text-brand-300">Final Report</div>
            <div className="text-[10px] text-ink-tertiary">PDF + PPTX ready in 10 min</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

interface NodeProps {
  agent:    { number: number; name: string; icon: string }
  color:    string
  delay:    number
  isLast?:  boolean
  reversed?:boolean
}

function PipelineNode({ agent, color, delay, isLast, reversed }: NodeProps) {
  return (
    <div className={`flex ${reversed ? 'flex-row-reverse' : 'flex-row'} items-center flex-1 min-w-0`}>
      {/* Node */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay, duration: 0.4, type: 'spring', bounce: 0.25 }}
        className="flex-shrink-0"
      >
        <div
          className="w-14 h-14 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm border"
          style={{
            background: `${color}18`,
            borderColor: `${color}40`,
            boxShadow:   `0 0 16px ${color}20`,
          }}
        >
          <span className="text-lg leading-none">{agent.icon}</span>
          <span className="text-[9px] text-ink-tertiary mt-0.5 font-mono">
            {String(agent.number).padStart(2, '0')}
          </span>
        </div>
        <div className="text-[9px] text-ink-tertiary text-center mt-1 truncate max-w-[56px]">
          {agent.name}
        </div>
      </motion.div>

      {/* Beam connector */}
      {!isLast && (
        <motion.div
          className="flex-1 h-px mx-1 relative overflow-hidden"
          style={{ background: `${color}20` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.4 }}
        >
          {/* Animated particle */}
          <motion.div
            className="absolute top-0 h-full w-4 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
            }}
            initial={{ left: reversed ? '100%' : '-20%' }}
            animate={{ left: reversed ? '-20%' : '100%' }}
            transition={{
              delay: delay + 0.4,
              duration: 1.2,
              repeat: Infinity,
              ease: 'linear',
              repeatDelay: 0.8,
            }}
          />
        </motion.div>
      )}
    </div>
  )
}
