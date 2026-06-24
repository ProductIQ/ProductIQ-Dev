// src/components/shared/LiquidEther.tsx
// ════════════════════════════════════════════════════════════════
// Custom WebGL-inspired fluid simulation using Canvas 2D API.
// Implements the LiquidEther spec: mouse-reactive fluid blobs,
// viscous motion, bounce constraints, and autoDemo mode.
// ════════════════════════════════════════════════════════════════
import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface Particle {
  x: number; y: number
  vx: number; vy: number
  radius: number
  color: string
  opacity: number
}

interface LiquidEtherProps {
  mouseForce?:    number
  cursorSize?:    number
  isViscous?:     boolean
  viscous?:       number
  colors?:        string[]
  autoDemo?:      boolean
  autoSpeed?:     number
  autoIntensity?: number
  isBounce?:      boolean
  resolution?:    number
  className?:     string
}

export function LiquidEther({
  mouseForce    = 20,
  cursorSize    = 100,
  isViscous     = true,
  viscous       = 30,
  colors        = ['#5227FF', '#7F77DD', '#B19EEF'],
  autoDemo      = true,
  autoSpeed     = 0.5,
  autoIntensity = 2.2,
  isBounce      = false,
  resolution    = 0.5,
  className,
}: LiquidEtherProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const mouseRef   = useRef({ x: 0, y: 0 })
  const particles  = useRef<Particle[]>([])
  const rafRef     = useRef<number | null>(null)
  const autoAngle  = useRef(0)

  const hexToRgb = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }, [])

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.floor(8 + colors.length * 4)
    particles.current = Array.from({ length: count }, (_, i) => ({
      x:       Math.random() * w,
      y:       Math.random() * h,
      vx:      (Math.random() - 0.5) * autoSpeed * 2,
      vy:      (Math.random() - 0.5) * autoSpeed * 2,
      radius:  80 + Math.random() * 140,
      color:   colors[i % colors.length],
      opacity: 0.35 + Math.random() * 0.45,
    }))
  }, [colors, autoSpeed])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const setSize = () => {
      canvas.width  = canvas.offsetWidth  * resolution
      canvas.height = canvas.offsetHeight * resolution
      ctx.scale(resolution, resolution)
      initParticles(canvas.offsetWidth, canvas.offsetHeight)
    }

    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener('mousemove', onMouseMove)

    const friction   = isViscous ? 1 - (viscous / 1000) : 0.98
    const W = () => canvas.offsetWidth
    const H = () => canvas.offsetHeight

    const draw = () => {
      const w = W(), h = H()
      ctx.clearRect(0, 0, w, h)

      // Auto-pilot cursor
      if (autoDemo) {
        autoAngle.current += autoSpeed * 0.012
        mouseRef.current = {
          x: w / 2 + Math.cos(autoAngle.current) * w * 0.32,
          y: h / 2 + Math.sin(autoAngle.current * 0.7) * h * 0.28,
        }
      }

      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      particles.current.forEach((p) => {
        // Mouse attraction / repulsion
        const dx  = mx - p.x
        const dy  = my - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < cursorSize + p.radius * 0.5) {
          const force = (mouseForce / (dist + 1)) * autoIntensity * 0.02
          p.vx += dx * force
          p.vy += dy * force
        }

        // Apply friction / viscosity
        p.vx *= friction
        p.vy *= friction
        p.x  += p.vx
        p.y  += p.vy

        // Boundary
        if (isBounce) {
          if (p.x < -p.radius)        { p.x = -p.radius;        p.vx *= -0.7 }
          if (p.x > w + p.radius)     { p.x = w + p.radius;     p.vx *= -0.7 }
          if (p.y < -p.radius)        { p.y = -p.radius;        p.vy *= -0.7 }
          if (p.y > h + p.radius)     { p.y = h + p.radius;     p.vy *= -0.7 }
        } else {
          // Wrap around
          if (p.x < -p.radius)        p.x = w + p.radius
          if (p.x > w + p.radius)     p.x = -p.radius
          if (p.y < -p.radius)        p.y = h + p.radius
          if (p.y > h + p.radius)     p.y = -p.radius
        }

        // Draw radial gradient blob
        const rgb = hexToRgb(p.color)
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius)
        grad.addColorStop(0,   `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity})`)
        grad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${p.opacity * 0.4})`)
        grad.addColorStop(1,   `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      canvas.removeEventListener('mousemove', onMouseMove)
      ro.disconnect()
    }
  }, [mouseForce, cursorSize, isViscous, viscous, autoDemo, autoSpeed, autoIntensity, isBounce, resolution, hexToRgb, initParticles])

  return (
    <canvas
      ref={canvasRef}
      className={cn('absolute inset-0 w-full h-full', className)}
      style={{ filter: 'blur(40px)', mixBlendMode: 'screen' }}
    />
  )
}
