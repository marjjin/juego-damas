import { useEffect, useRef, useState } from 'react'
import GameLayout from './GameLayout.jsx'
import { resultText } from '../game/result.js'
import { initialState, applyMove, WHITE, BLACK } from '../game/rules.js'
import { DIFFICULTIES } from '../game/ai.js'

const HUMAN = WHITE
const AI = BLACK
const MIN_THINK_MS = 500

export default function LocalGame({ player, difficulty, onExit }) {
  const [state, setState] = useState(initialState)
  const [thinking, setThinking] = useState(false)
  const workerRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(new URL('../game/aiWorker.js', import.meta.url), { type: 'module' })
    workerRef.current = worker
    return () => worker.terminate()
  }, [])

  useEffect(() => {
    if (state.winner || state.turn !== AI) return
    const worker = workerRef.current
    if (!worker) return
    let cancelled = false
    const started = performance.now()
    const requestId = state.moveNo
    // El estado "pensando" se activa desde un callback, no durante el efecto.
    const startTimer = setTimeout(() => !cancelled && setThinking(true), 0)
    worker.onmessage = (e) => {
      if (cancelled || e.data.requestId !== requestId || !e.data.move) return
      const wait = Math.max(0, MIN_THINK_MS - (performance.now() - started))
      setTimeout(() => {
        if (cancelled) return
        setThinking(false)
        setState((s) => (s.moveNo === requestId ? applyMove(s, e.data.move) : s))
      }, wait)
    }
    worker.postMessage({ state, difficulty, requestId })
    return () => {
      cancelled = true
      clearTimeout(startTimer)
    }
  }, [state, difficulty])

  const names = { [HUMAN]: player.name, [AI]: `Computadora (${DIFFICULTIES[difficulty].label.toLowerCase()})` }
  const result = resultText(state, names)

  let turnText = 'Te toca mover'
  if (state.winner) turnText = 'Partida terminada'
  else if (state.turn === AI) turnText = thinking ? 'La computadora está pensando…' : 'Turno de la computadora'

  function restart() {
    setThinking(false)
    setState(initialState())
  }

  return (
    <GameLayout
      state={state}
      myColor={HUMAN}
      canPlay={!state.winner && state.turn === HUMAN}
      onMove={(m) => setState((s) => applyMove(s, m))}
      names={names}
      turnText={turnText}
      actions={
        <>
          <button className="btn small" onClick={onExit}>
            Volver al menú
          </button>
          <button className="btn small" onClick={restart}>
            Empezar de nuevo
          </button>
        </>
      }
      overlay={
        result && (
          <div className="card">
            <h2>{state.winner === HUMAN ? 'Ganaste' : state.winner === 'draw' ? 'Empate' : 'Perdiste'}</h2>
            <p>{result}</p>
            <div className="row">
              <button className="btn primary" onClick={restart}>
                Jugar otra partida
              </button>
              <button className="btn" onClick={onExit}>
                Volver al menú
              </button>
            </div>
          </div>
        )
      }
    />
  )
}
