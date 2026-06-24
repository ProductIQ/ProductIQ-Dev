// src/pages/NotFoundPage.tsx
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-16 h-16 rounded-2xl bg-[#F8F9FB] border border-[rgba(0,0,0,0.07)] flex items-center justify-center mx-auto mb-6">
          <Search size={24} className="text-[#A3A3A3]" />
        </div>
        
        <h1 className="text-[32px] md:text-[40px] font-bold text-[#0A0A0A] tracking-tight mb-3">
          Intelligence not found
        </h1>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed max-w-sm mx-auto mb-8">
          The page you're looking for doesn't exist, was moved, or requires different permissions.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="btn btn-outline"
          >
            <ArrowLeft size={16} className="mr-1.5" /> Go Back
          </button>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-black"
          >
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  )
}
