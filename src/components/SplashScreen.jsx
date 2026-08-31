import { useEffect, useRef, useState } from 'react'

// Splash de carregamento — xícara de vidro Frutiger Aero enchendo de café.
// Sem GSAP: o progresso é um tick leve de JS e todo o movimento (ondas,
// vapor, bolhas, fade de saída) vive em CSS com transform/opacity.
//
// Integração com o App: o café sobe enquanto a sessão é verificada e
// ESTACIONA em ~88% se o servidor demorar — só completa os 100% quando
// `ready` chega. Ao terminar: vapor + brilho, uma pausa, fade e onFinish().

const BRAND = 'Jahint.Studies'

const PHASES = [
  { at: 0, text: 'Moendo os grãos…' },
  { at: 30, text: 'Passando o café…' },
  { at: 65, text: 'Quase transbordando…' },
  { at: 100, text: 'Pronto. Bom café!' },
]

// Onda da superfície do café (duas cópias defasadas dão profundidade)
const WAVE_FRONT = 'M0 7 Q 18.75 3, 37.5 7 T 75 7 T 112.5 7 T 150 7 T 187.5 7 T 225 7 T 262.5 7 T 300 7 V 14 H 0 Z'
const WAVE_BACK = 'M0 7 Q 18.75 2, 37.5 7 T 75 7 T 112.5 7 T 150 7 T 187.5 7 T 225 7 T 262.5 7 T 300 7 V 14 H 0 Z'

export default function SplashScreen({ ready, onFinish }) {
  const [progress, setProgress] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const readyRef = useRef(ready)
  const onFinishRef = useRef(onFinish)

  useEffect(() => { readyRef.current = ready }, [ready])
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Loop de progresso: passos aleatórios dão a sensação orgânica de preparo
  useEffect(() => {
    const reduce = reduceMotion()
    let timer
    let cancelled = false
    let p = 0

    const tick = () => {
      if (cancelled) return
      if (readyRef.current) {
        p = Math.min(100, p + (reduce ? 40 : 6 + Math.random() * 9))
      } else {
        const step = p < 70 ? 2 + Math.random() * 5 : 0.5 + Math.random() * 1.5
        p = Math.min(88, p + step) // espera a sessão resolver
      }
      setProgress(p)
      if (p >= 100) return
      timer = setTimeout(tick, reduce ? 60 : 120 + Math.random() * 240)
    }
    tick()

    return () => { cancelled = true; clearTimeout(timer) }
  }, [])

  const done = progress >= 100

  // Café pronto: segura um instante para o vapor aparecer, depois inicia o fade
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setLeaving(true), reduceMotion() ? 250 : 950)
    return () => clearTimeout(t)
  }, [done])

  // Desmonta só depois do fade do CSS (0.65s / 0.25s com movimento reduzido)
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(() => onFinishRef.current?.(), reduceMotion() ? 300 : 700)
    return () => clearTimeout(t)
  }, [leaving])

  const rounded = Math.floor(progress)
  const label = [...PHASES].reverse().find(ph => rounded >= ph.at).text

  return (
    <div
      className={'splash' + (done ? ' done' : '') + (leaving ? ' leaving' : '')}
      role="status"
      aria-label="Carregando"
    >
      {/* bolhas de fundo: só transform/opacity — baratas para a GPU */}
      <div className="splash-bubbles" aria-hidden="true">
        <i /><i /><i /><i /><i /><i />
      </div>

      {/* cartão de vidro: o ÚNICO backdrop-filter da splash */}
      <div className="splash-card">
        <div className="splash-scene" aria-hidden="true">
          <div className="splash-steam"><span /><span /><span /></div>
          <div className="splash-handle" />
          <div className="splash-cup">
            <div
              className={'splash-coffee' + (progress > 3 ? ' visible' : '')}
              style={{ height: `${progress * 0.82}%` }}
            >
              <div className="splash-surface">
                <svg className="back" viewBox="0 0 300 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={WAVE_BACK} fill="#7a4e2c" />
                </svg>
                <svg viewBox="0 0 300 14" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <path d={WAVE_FRONT} fill="#d9ac74" />
                </svg>
              </div>
            </div>
          </div>
          <div className="splash-saucer" />
        </div>

        <div className="splash-status-block">
          <div className="splash-brand" aria-label={BRAND}>
            {[...BRAND].map((ch, i, arr) => {
              const threshold = 8 + (i / (arr.length - 1)) * 84
              return (
                <span
                  key={i}
                  aria-hidden="true"
                  className={(progress >= threshold ? 'lit' : '') + (ch === '.' ? ' dot' : '')}
                >
                  {ch}
                </span>
              )
            })}
          </div>
          {/* aria-hidden: role="status" anunciaria cada tick do número no leitor
              de tela; as frases de fase (4 mudanças) bastam como feedback */}
          <div className="splash-percent" aria-hidden="true">{rounded}%</div>
          <div className="splash-label">{label}</div>
        </div>
      </div>
    </div>
  )
}
