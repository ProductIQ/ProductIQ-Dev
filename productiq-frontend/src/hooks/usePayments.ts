// src/hooks/usePayments.ts
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { createOrder, verifyPayment } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true)
    const script = document.createElement('script')
    script.id = 'razorpay-script'
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function usePayments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isLoadingCheckout, setIsLoadingCheckout] = useState(false)

  async function openCheckout(plan: 'pro_monthly' | 'pro_yearly') {
    if (!user) { navigate('/login'); return }
    setIsLoadingCheckout(true)

    try {
      const loaded = await loadRazorpayScript()
      if (!loaded) { toast.error('Payment gateway failed to load.'); return }

      const order = await createOrder({ plan })

      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'rzp_test_placeholder',
        amount: order.amount,
        currency: 'INR',
        order_id: order.order_id,
        name: 'ProductIQ',
        description: 'Pro Plan Subscription',
        prefill: {
          name: user.user_metadata?.full_name ?? '',
          email: user.email ?? '',
        },
        theme: { color: '#0A0A0A' },
        handler: async (response: Record<string, string>) => {
          await verifyPayment({
            razorpay_order_id: response.razorpay_order_id ?? '',
            razorpay_payment_id: response.razorpay_payment_id ?? '',
            razorpay_signature: response.razorpay_signature ?? '',
            plan,
          })
          toast.success('Pro activated! Welcome to ProductIQ Pro.')
          queryClient.invalidateQueries({ queryKey: ['profile'] })
          navigate('/dashboard')
        },
        modal: { ondismiss: () => setIsLoadingCheckout(false) },
      })

      rzp.open()
    } catch {
      toast.error('Could not initiate payment. Try again.')
    } finally {
      setIsLoadingCheckout(false)
    }
  }

  return { openCheckout, isLoadingCheckout }
}
