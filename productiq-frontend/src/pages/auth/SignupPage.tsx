// src/pages/auth/SignupPage.tsx
import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  full_name:     z.string().min(2, 'Name must be at least 2 characters'),
  company_name:  z.string().optional(),
  email:         z.string().email('Enter a valid email address'),
  password:      z.string().min(8, 'Password must be at least 8 characters'),
  confirm:       z.string(),
  referral_code: z.string().optional(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})
type Form = z.infer<typeof schema>

export function SignupPage() {
  const navigate       = useNavigate()
  const [params]       = useSearchParams()
  const { signUp }     = useAuth()
  const [showPass, setShowPass]   = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const refFromURL = params.get('ref') ?? ''

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { referral_code: refFromURL },
  })

  const onSubmit = async (data: Form) => {
    setAuthError(null)
    try {
      await signUp(data.email, data.password, {
        full_name:    data.full_name,
        company_name: data.company_name ?? '',
      })
      toast.success('Account created. Your first 3 reports are free.')
      navigate('/dashboard')
    } catch {
      setAuthError('Could not create your account. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 mb-8">
            <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] flex items-center justify-center flex-shrink-0">
              <span className="text-[#C8F04A] font-bold text-xs">IQ</span>
            </div>
            <span className="font-semibold text-[15px] tracking-tight">ProductIQ</span>
          </button>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0A0A0A] mb-1.5">Create your account.</h1>
          <p className="text-[14px] text-[#6B6B6B]">3 free reports — no credit card required.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-[24px] p-8" style={{ border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">Full name</label>
              <input className={`input ${errors.full_name ? 'input-error' : ''}`} placeholder="Irfan Ahmed" {...register('full_name')} />
              {errors.full_name && <p className="mt-1.5 text-[12px] text-red-500">{errors.full_name.message}</p>}
            </div>

            {/* Company */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">
                Company or brand name{' '}
                <span className="text-[#A3A3A3] font-normal">— optional</span>
              </label>
              <input className="input" placeholder="MuscleBlaze, Mamaearth..." {...register('company_name')} />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">Work email</label>
              <input type="email" className={`input ${errors.email ? 'input-error' : ''}`} placeholder="you@company.com" {...register('email')} />
              {errors.email && <p className="mt-1.5 text-[12px] text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={`input pr-11 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Min. 8 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#6B6B6B] transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-[12px] text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">Confirm password</label>
              <input type="password" className={`input ${errors.confirm ? 'input-error' : ''}`} placeholder="Repeat password" {...register('confirm')} />
              {errors.confirm && <p className="mt-1.5 text-[12px] text-red-500">{errors.confirm.message}</p>}
            </div>

            {/* Referral */}
            <div>
              <label className="block text-[12px] font-medium text-[#6B6B6B] mb-1.5">
                Referral code{' '}
                <span className="text-[#A3A3A3] font-normal">— optional</span>
              </label>
              <input
                className="input"
                placeholder="Referral code"
                readOnly={!!refFromURL}
                style={refFromURL ? { background: '#F8F9FB' } : {}}
                {...register('referral_code')}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {authError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[10px] px-4 py-3 bg-red-50 text-red-600 text-[13px]" style={{ border: '1px solid rgba(239,68,68,0.15)' }}>
                    {authError}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-black w-full mt-1"
              style={{ height: '48px', borderRadius: '12px' }}
            >
              {isSubmitting ? (
                <><Loader2 size={15} className="animate-spin" /> Creating account...</>
              ) : 'Create account'}
            </button>
            
            <div className="relative mt-6 pt-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[rgba(0,0,0,0.06)]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-white px-3 text-[#A3A3A3]">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button type="button" className="btn btn-outline" onClick={() => {}}>
                <svg className="w-3.5 h-3.5 mr-2" viewBox="0 0 24 24">
                   <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                   <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                   <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                   <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" className="btn btn-outline" onClick={() => {}}>
                <svg className="w-3.5 h-3.5 mr-2 text-[#1877F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"></path>
                </svg>
                Meta
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-[13px] text-[#6B6B6B] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#0A0A0A] hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
