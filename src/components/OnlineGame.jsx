import { useEffect, useState } from 'react'
import GameLayout from './GameLayout.jsx'
import { resultText } from '../game/result.js'
import { applyMove, initialState, opponent, WHITE, BLACK } from '../game/rules.js'
import { fetchRoom, joinRoom, pushState, subscribeRoom, supabaseConfigured } from '../lib/supabase.js'

export default function OnlineGame({ player, code, joining, onExit }) {
  const [room, setRoom] = useState(null)
  const [error, setError] = useState(null)
  const [online, setOnline] = useState([])
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  // Cargar o unirse a la sala, y escuchar cambios en tiempo real.
  useEffect(() => {
    if (!supabaseConfigured) return
    let active = true
    const load = joining ? joinRoom(code, player) : fetchRoom(code)
    load
      .then((r) => {
        if (!active) return
        if (!r) setError(`No existe una sala con el código ${code}.`)
        else setRoom(r)
      })
      .catch((e) => active && setError(e.message))

    const unsubscribe = subscribeRoom(code, player, {
      onChange: (r) => {
        // Ignorar actualizaciones viejas que lleguen fuera de orden.
        setRoom((prev) => (!prev || r.move_no >= prev.move_no ? r : prev))
      },
      onPresence: setOnline,
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [code, joining, player])

  if (!supabaseConfigured) {
    return (
      <Message onExit={onExit}>
        El juego online no está configurado. Falta cargar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el
        archivo .env.local.
      </Message>
    )
  }
  if (error) return <Message onExit={onExit}>{error}</Message>
  if (!room) return <Message>Conectando con la sala {code}…</Message>

  const isHost = room.host_id === player.id
  const isGuest = room.guest_id === player.id
  if (!isHost && !isGuest) {
    return <Message onExit={onExit}>Esta sala ya tiene dos jugadores.</Message>
  }

  const myColor = isHost ? WHITE : BLACK
  const rivalColor = opponent(myColor)
  const rivalId = isHost ? room.guest_id : room.host_id
  const state = room.state
  const names = {
    [WHITE]: room.host_name,
    [BLACK]: room.guest_name ?? 'Esperando rival',
  }
  const waiting = room.status === 'waiting'
  const rivalConnected = rivalId && online.includes(rivalId)
  const statuses = rivalId ? { [rivalColor]: rivalConnected ? 'conectado' : 'desconectado' } : {}
  const myTurn = !waiting && !state.winner && state.turn === myColor

  async function save(newState) {
    setSending(true)
    // Mostrar la jugada al instante; si el servidor la rechaza, se vuelve a cargar.
    const optimistic = { ...room, state: newState, move_no: room.move_no + 1 }
    setRoom(optimistic)
    try {
      const saved = await pushState(room, newState)
      if (saved) setRoom((prev) => (saved.move_no >= prev.move_no ? saved : prev))
      else setRoom(await fetchRoom(code))
    } catch (e) {
      setError(`No se pudo guardar la jugada: ${e.message}`)
    } finally {
      setSending(false)
    }
  }

  function resign() {
    if (!confirm('¿Seguro que querés abandonar? La partida se la lleva tu rival.')) return
    save({ ...state, winner: rivalColor, reason: 'abandono', moveNo: state.moveNo + 1, lastMove: null })
  }

  function rematch() {
    save(initialState())
  }

  async function copyLink() {
    const url = new URL(location.href)
    url.searchParams.set('sala', room.code)
    await navigator.clipboard.writeText(url.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  let turnText
  if (waiting) turnText = 'Esperando que se una tu rival'
  else if (state.winner) turnText = 'Partida terminada'
  else if (myTurn) turnText = 'Te toca mover'
  else turnText = `Mueve ${names[rivalColor]}`

  const result = resultText(state, names)

  let overlay = null
  if (waiting) {
    overlay = (
      <div className="card">
        <h2>Sala creada</h2>
        <p>Pasale este código a tu rival para que entre desde “Unirme a la sala”:</p>
        <div className="room-code">{room.code}</div>
        <div className="row">
          <button className="btn primary" onClick={copyLink}>
            {copied ? 'Enlace copiado' : 'Copiar enlace de invitación'}
          </button>
          <button className="btn" onClick={onExit}>
            Salir de la sala
          </button>
        </div>
        <p className="muted small">Vas a jugar con las blancas. La partida empieza cuando tu rival entra.</p>
      </div>
    )
  } else if (result) {
    overlay = (
      <div className="card">
        <h2>{state.winner === myColor ? 'Ganaste' : state.winner === 'draw' ? 'Empate' : 'Perdiste'}</h2>
        <p>{result}</p>
        <div className="row">
          <button className="btn primary" onClick={rematch} disabled={sending}>
            Jugar la revancha
          </button>
          <button className="btn" onClick={onExit}>
            Volver al menú
          </button>
        </div>
      </div>
    )
  }

  return (
    <GameLayout
      state={state}
      myColor={myColor}
      canPlay={myTurn && !sending}
      onMove={(m) => save(applyMove(state, m))}
      names={names}
      statuses={statuses}
      turnText={turnText}
      actions={
        <>
          <button className="btn small" onClick={onExit}>
            Volver al menú
          </button>
          {!waiting && !state.winner && (
            <button className="btn small danger" onClick={resign} disabled={sending}>
              Abandonar
            </button>
          )}
          <span className="room-tag">Sala {room.code}</span>
        </>
      }
      overlay={overlay}
    />
  )
}

function Message({ children, onExit }) {
  return (
    <main className="screen">
      <div className="card">
        <p>{children}</p>
        {onExit && (
          <button className="btn" onClick={onExit}>
            Volver al menú
          </button>
        )}
      </div>
    </main>
  )
}
