// src/pages/KnowledgeGraphPage.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'motion/react'
import { Network, Search, Filter, ArrowUpRight, Copy, Check, ChevronRight, Loader2 } from 'lucide-react'
import { listReports, getKnowledgeGraph } from '@/lib/api'
import type { AgentRun } from '@/types/agent'

interface GraphNode {
  id: string
  type: string
  name: string
  category: string
  mentions: number
  trend: string
}

/** Normalize the API graph payload into the node shape the UI expects. */
function normalizeNodes(payload: unknown): GraphNode[] {
  if (!payload || typeof payload !== 'object') return []
  const raw = (payload as Record<string, unknown>).nodes ?? payload
  if (!Array.isArray(raw)) return []
  return (raw as Record<string, unknown>[]).map((n, i) => ({
    id: String(n.id ?? n.node_id ?? i),
    type: String(n.type ?? n.label ?? n.kind ?? 'Node'),
    name: String(n.name ?? n.label ?? n.title ?? 'Untitled'),
    category: String(n.category ?? n.group ?? '—'),
    mentions: Number(n.mentions ?? n.weight ?? n.count ?? 0),
    trend: String(n.trend ?? n.delta ?? '0%'),
  }))
}

export function KnowledgeGraphPage() {
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string>('')

  const { data: runs = [] } = useQuery<AgentRun[]>({
    queryKey: ['reports'],
    queryFn: listReports,
  })

  const { data: graphPayload, isLoading: graphLoading } = useQuery({
    queryKey: ['knowledge-graph', selectedRunId],
    queryFn: () => getKnowledgeGraph(selectedRunId),
    enabled: !!selectedRunId,
  })

  const nodes = normalizeNodes(graphPayload)

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="max-w-[1080px] mx-auto pb-12">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-[#A3A3A3] mb-1">
            ProductIQ Neo4j Backing
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">
            Knowledge Graph
          </h1>
          <p className="text-[14px] text-[#A3A3A3] mt-1">
            Explore the normalized concepts extracted across all product categories.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 10 }} 
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
           <select
             value={selectedRunId}
             onChange={(e) => setSelectedRunId(e.target.value)}
             className="input w-56 text-[13px]"
           >
             <option value="">Select a report…</option>
             {runs.map((r) => (
               <option key={r.id} value={r.id}>
                 {r.product_category}{r.brand_name ? ` · ${r.brand_name}` : ''}
               </option>
             ))}
           </select>
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
             <input
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               placeholder="Search nodes..."
               className="input pl-9 w-64 text-[13px]"
             />
           </div>
           <button className="btn btn-outline btn-sm flex items-center gap-2">
             <Filter size={13} /> Filters
           </button>
        </motion.div>
      </div>

      {!selectedRunId ? (
        <div className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)] h-[500px] flex flex-col items-center justify-center text-center">
          <Network size={28} className="text-[#D1D5DB] mb-3" />
          <p className="text-[14px] font-semibold text-[#0A0A0A] mb-1">Select a report to view its knowledge graph.</p>
          <p className="text-[12px] text-[#A3A3A3]">Choose a run from the dropdown above.</p>
        </div>
      ) : graphLoading ? (
        <div className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)] h-[500px] flex flex-col items-center justify-center text-center">
          <Loader2 size={24} className="animate-spin text-[#A3A3A3] mb-3" />
          <p className="text-[13px] text-[#6B6B6B]">Loading knowledge graph…</p>
        </div>
      ) : (
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Graph representation mock */}
        <div className="lg:col-span-2">
           <div className="bg-[#0F0F0F] rounded-[24px] border border-[rgba(255,255,255,0.07)] relative overflow-hidden h-[500px] flex items-center justify-center">
             
             {/* Fake connection lines */}
             <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
               <path d="M 300 250 Q 400 150 500 200" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
               <path d="M 300 250 Q 200 150 150 300" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
               <path d="M 300 250 Q 400 350 450 400" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
             </svg>
             
             {/* Central node */}
             <motion.div 
                animate={{ scale: [1, 1.05, 1] }} 
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute z-10 w-24 h-24 rounded-full bg-[#C8F04A] flex flex-col items-center justify-center shadow-[0_0_40px_rgba(200,240,74,0.15)]"
             >
                <Network size={20} className="text-[#0A0A0A] mb-1" />
                <span className="text-[10px] font-bold text-[#0A0A0A] uppercase tracking-wider">Root</span>
             </motion.div>

             {/* Satellite nodes */}
             <div className="absolute top-[20%] left-[25%] bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl text-white">
               <span className="text-[11px] font-mono text-[#C8F04A] block mb-0.5">Ingredient</span>
               <span className="text-[13px] font-semibold">Marine Collagen</span>
             </div>
             <div className="absolute top-[60%] left-[15%] bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl text-white">
               <span className="text-[11px] font-mono text-[#0EA5E9] block mb-0.5">Benefit</span>
               <span className="text-[13px] font-semibold">Joint Health</span>
             </div>
             <div className="absolute top-[30%] right-[20%] bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl text-white">
               <span className="text-[11px] font-mono text-[#F59E0B] block mb-0.5">Claim</span>
               <span className="text-[13px] font-semibold">Anti-Aging</span>
             </div>
             <div className="absolute top-[70%] right-[30%] bg-white/10 backdrop-blur border border-white/10 px-4 py-2 rounded-xl text-white">
               <span className="text-[11px] font-mono text-[#EF4444] block mb-0.5">Pain Point</span>
               <span className="text-[13px] font-semibold">Fishy Odor</span>
             </div>
             
             <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
               <div className="flex gap-4">
                 {[
                   { label: 'Ingredients', color: '#C8F04A' },
                   { label: 'Claims', color: '#F59E0B' },
                   { label: 'Benefits', color: '#0EA5E9' },
                   { label: 'Pains', color: '#EF4444' }
                 ].map(t => (
                   <div key={t.label} className="flex items-center gap-1.5">
                     <span className="w-2 h-2 rounded-full" style={{ background: t.color }}></span>
                     <span className="text-[11px] text-white/50">{t.label}</span>
                   </div>
                 ))}
               </div>
               <div className="text-[11px] font-mono text-white/30 text-right">
                 Rendering {nodes.length} nodes<br/>from {runs.length} reports
               </div>
             </div>
           </div>
        </div>

        {/* Node list */}
        <div className="bg-white rounded-[24px] border border-[rgba(0,0,0,0.07)] flex flex-col h-[500px]">
           <div className="px-5 py-4 border-b border-[rgba(0,0,0,0.05)]">
             <h3 className="text-[14px] font-bold text-[#0A0A0A]">Top Global Nodes</h3>
           </div>
           
           <div className="flex-1 overflow-y-auto p-2">
             {nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).length === 0 ? (
               <div className="p-6 text-center">
                 <p className="text-[12px] text-[#A3A3A3]">No nodes found.</p>
               </div>
             ) : nodes.filter(n => n.name.toLowerCase().includes(search.toLowerCase())).map(node => (
               <div key={node.id} className="p-3 mb-1 rounded-xl hover:bg-[#F8F9FB] transition-colors group cursor-pointer">
                 <div className="flex items-start justify-between mb-1.5">
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.04)] text-[#6B6B6B]">
                       {node.type}
                     </span>
                     <span className="text-[11px] text-[#A3A3A3]">{node.category}</span>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); copyId(`node-${node.id}`); }}
                     className="text-[#A3A3A3] hover:text-[#0A0A0A] opacity-0 group-hover:opacity-100 transition-opacity"
                   >
                     {copied === `node-${node.id}` ? <Check size={13} className="text-[#22C55E]" /> : <Copy size={13} />}
                   </button>
                 </div>
                 
                 <div className="flex items-center justify-between">
                   <span className="text-[13px] font-semibold text-[#0A0A0A]">{node.name}</span>
                   <span className={`text-[11px] font-mono ${node.trend.startsWith('+') ? 'text-[#16A34A]' : 'text-[#EF4444]'}`}>
                     {node.trend}
                   </span>
                 </div>
                 <div className="text-[11px] text-[#A3A3A3] mt-1 group-hover:text-[#6B6B6B] transition-colors">
                   {node.mentions.toLocaleString()} mentions
                 </div>
               </div>
             ))}
           </div>
           
           <div className="p-4 border-t border-[rgba(0,0,0,0.05)] text-center">
             <button className="text-[12px] font-semibold text-[#6B6B6B] hover:text-[#0A0A0A] inline-flex items-center gap-1.5 transition-colors">
               Explore via GraphQL API <ArrowUpRight size={13} />
             </button>
           </div>
        </div>

      </div>
      )}
    </div>
  )
}
