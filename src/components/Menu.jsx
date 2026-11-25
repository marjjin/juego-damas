import { useState } from 'react'
import { DIFFICULTIES } from '../game/ai.js'
import { createRoom, supabaseConfigured } from '../lib/supabase.js'

export default function Menu({ player, onLogout, onPlayComputer, onEnterRoom }) {
  const [difficulty, setDifficulty] = useState('normal')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      const room = await createRoom(player)
      onEnterRoom(room.code, false)
    } catch (e) {
      setError(`No se pudo crear la sala: ${e.message}`)
      setBusy(false)
    }
  }

  const cleanCode = code.trim().toUpperCase()

  return (
    <main className="screen">
      <div className="card wide">
        <header className="menu-header">
          <h1 className="title">Damas</h1>
          <div className="who">
            <span>
              Jugás como <strong>{player.name}</strong>
            </span>
            <button className="link" onClick={onLogout}>
              Cambiar nombre
            </button>
          </div>
        </header>

        <section className="panel">
          <h2>Contra la computadora</h2>
          <div className="segmented" role="radiogroup" aria-label="Dificultad">
            {Object.entries(DIFFICULTIES).map(([key, d]) => (
              <button
                key={key}
                role="radio"
                aria-checked={difficulty === key}
                className={difficulty === key ? 'active' : ''}
                onClick={() => setDifficulty(key)}
              >
                {d.label}
              </button>
            ))}
          </div>
          <button className="btn primary" onClick={() => onPlayComputer(difficulty)}>
            Jugar contra la computadora
          </button>
        </section>

        <section className="panel">
          <h2>Online</h2>
          {!supabaseConfigured ? (
            <p className="notice">
              El juego online no está configurado. Faltan las variables VITE_SUPABASE_URL y
              VITE_SUPABASE_ANON_KEY (en local van en .env.local; en Vercel, en Environment Variables).
            </p>
          ) : (
            <>
              <button className="btn" onClick={handleCreate} disabled={busy}>
                {busy ? 'Creando sala…' : 'Crear una sala'}
              </button>
              <form
                className="join-row"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (cleanCode) onEnterRoom(cleanCode, true)
                }}
              >
                <input
                  aria-label="Código de sala"
                  placeholder="Código de sala"
                  maxLength={8}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="code-input"
                />
                <button className="btn" disabled={!cleanCode}>
                  Unirme a la sala
                </button>
              </form>
              {error && <p className="error">{error}</p>}
            </>
          )}
        </section>

        <details className="rules">
          <summary>Reglas</summary>
          <ul>
            <li>Empiezan las blancas. Los peones mueven en diagonal hacia adelante.</li>
            <li>Capturar es obligatorio. Si después de capturar podés seguir, la captura continúa.</li>
            <li>Los peones capturan solo hacia adelante.</li>
            <li>Un peón que llega al fondo corona y pasa a ser dama.</li>
            <li>La dama mueve y captura a cualquier distancia en diagonal, hacia adelante o atrás.</li>
            <li>Gana quien deja al rival sin piezas o sin movimientos.</li>
            <li>Si pasan 40 jugadas sin capturas ni movimientos de peón, es empate.</li>
          </ul>
        </details>
      </div>
    </main>
  )
}
