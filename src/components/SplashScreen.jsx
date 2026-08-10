import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'

// Splash de carregamento — "jahint.studies" (Bukhari Script) sendo escrito com
// GSAP; sai com transição suave quando o app termina de verificar a sessão.
export default function SplashScreen({ ready, onFinish }) {
  const rootRef = useRef(null)
  const readyRef = useRef(ready)
  const introDoneRef = useRef(false)
  const exitStartedRef = useRef(false)
  const onFinishRef = useRef(onFinish)

  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  const startExit = () => {
    if (exitStartedRef.current) return
    exitStartedRef.current = true
    const root = rootRef.current
    if (!root) { onFinishRef.current?.(); return }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    gsap.timeline({ onComplete: () => onFinishRef.current?.() })
      .to(root.querySelector('.splash-center'), {
        autoAlpha: 0,
        y: reduce ? 0 : -18,
        scale: reduce ? 1 : 1.03,
        duration: reduce ? 0.25 : 0.55,
        ease: 'power2.in',
      }, 0)
      .to(root, { autoAlpha: 0, duration: reduce ? 0.25 : 0.7, ease: 'power2.inOut' }, reduce ? 0 : 0.3)
  }

  useEffect(() => {
    readyRef.current = ready
    if (ready && introDoneRef.current) startExit()
  }, [ready])

  useEffect(() => {
    const root = rootRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false

    const wrap = root.querySelector('.splash-word-wrap')
    const shine = root.querySelector('.splash-shine')
    const dots = root.querySelectorAll('.splash-dot')

    gsap.set(shine, { backgroundPositionX: '160%' })

    if (!reduce) {
      gsap.to(dots, {
        opacity: 0.25, y: -3,
        duration: 0.45, ease: 'sine.inOut',
        yoyo: true, repeat: -1, stagger: 0.15,
      })
    }

    const onIntroDone = () => {
      introDoneRef.current = true
      if (readyRef.current) startExit()
    }

    const play = () => {
      if (cancelled) return
      // Com a escrita completa a máscara é identidade — removê-la elimina o
      // leve retângulo fantasma que o Chromium deixa em elementos mascarados.
      const dropMask = { webkitMaskImage: 'none', maskImage: 'none' }
      if (reduce) {
        gsap.set(wrap, { '--reveal': '118%', ...dropMask })
        onIntroDone()
        return
      }
      gsap.timeline({ onComplete: onIntroDone })
        .to(wrap, { '--reveal': '118%', duration: 2.2, ease: 'power1.inOut' }, 0.2)
        .set(wrap, dropMask)
        .to(shine, { backgroundPositionX: '-60%', duration: 1.0, ease: 'power2.inOut' }, '-=0.1')
    }

    // Espera a fonte carregar para não animar com a fonte de fallback
    if (document.fonts?.load) {
      Promise.race([
        document.fonts.load('400 96px "Bukhari Script"'),
        new Promise((r) => setTimeout(r, 1500)),
      ]).then(play, play)
    } else {
      play()
    }

    return () => {
      cancelled = true
      gsap.killTweensOf([root, root.querySelector('.splash-center'), wrap, shine, ...dots])
    }
  }, [])

  return (
    <div className="splash" ref={rootRef} role="status" aria-label="Carregando">
      <div className="bg-aero">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="orb orb-5" />
      </div>
      <div className="splash-center">
        <div className="splash-word-wrap">
          <span className="splash-word">Jahint.studies</span>
          <span className="splash-shine" aria-hidden="true">Jahint.studies</span>
        </div>
        <div className="splash-status">
          <span>Carregando</span>
          <span className="splash-dot" />
          <span className="splash-dot" />
          <span className="splash-dot" />
        </div>
      </div>
    </div>
  )
}
