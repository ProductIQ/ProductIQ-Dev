// src/hooks/useCountUp.ts
import { useState, useEffect, useRef } from 'react'

export function useCountUp(target: number, duration = 1000): number {
  const [current, setCurrent] = useState(0)
  const startTime = useRef<number | null>(null)
  const rafRef    = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) { setCurrent(0); return }
    startTime.current = null

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp
      const elapsed  = timestamp - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(eased * target))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return current
}
