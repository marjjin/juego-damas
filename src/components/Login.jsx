import { useState } from 'react'

export default function Login({ onLogin, pendingRoom }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()

  return (
    <main className="screen">
      <div className="card">
        <h1 className="title">Damas</h1>
        <p className="muted">
          {pendingRoom
            ? `Te invitaron a la sala ${pendingRoom}. Elegí un nombre para entrar.`
            : 'Elegí un nombre para jugar. Es el que va a ver tu rival.'}
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (trimmed) onLogin(trimmed)
          }}
        >
          <label className="field">
            <span>Nombre de usuario</span>
            <input
              autoFocus
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              autoComplete="nickname"
            />
          </label>
          <button className="btn primary" disabled={!trimmed}>
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}
