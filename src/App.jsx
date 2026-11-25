import { useState } from 'react'
import Login from './components/Login.jsx'
import Menu from './components/Menu.jsx'
import LocalGame from './components/LocalGame.jsx'
import OnlineGame from './components/OnlineGame.jsx'
import './App.css'

const PLAYER_KEY = 'damas:jugador'

function loadPlayer() {
  try {
    const p = JSON.parse(localStorage.getItem(PLAYER_KEY))
    if (p?.id && p?.name) return p
  } catch {
    // dato corrupto: se pide el nombre de nuevo
  }
  return null
}

function roomFromUrl() {
  const code = new URLSearchParams(location.search).get('sala')
  return code ? code.toUpperCase() : null
}

function setRoomInUrl(code) {
  const url = new URL(location.href)
  if (code) url.searchParams.set('sala', code)
  else url.searchParams.delete('sala')
  history.replaceState(null, '', url)
}

export default function App() {
  const [player, setPlayer] = useState(loadPlayer)
  const [screen, setScreen] = useState(() => {
    const code = roomFromUrl()
    return code ? { name: 'online', code, joining: true } : { name: 'menu' }
  })

  function login(name) {
    const p = { id: player?.id ?? crypto.randomUUID(), name }
    localStorage.setItem(PLAYER_KEY, JSON.stringify(p))
    setPlayer(p)
  }

  function logout() {
    localStorage.removeItem(PLAYER_KEY)
    setPlayer(null)
    goMenu()
  }

  function goMenu() {
    setRoomInUrl(null)
    setScreen({ name: 'menu' })
  }

  if (!player) return <Login onLogin={login} pendingRoom={screen.name === 'online' ? screen.code : null} />

  if (screen.name === 'local') {
    return <LocalGame player={player} difficulty={screen.difficulty} onExit={goMenu} />
  }

  if (screen.name === 'online') {
    return (
      <OnlineGame
        key={screen.code}
        player={player}
        code={screen.code}
        joining={screen.joining}
        onExit={goMenu}
      />
    )
  }

  return (
    <Menu
      player={player}
      onLogout={logout}
      onPlayComputer={(difficulty) => setScreen({ name: 'local', difficulty })}
      onEnterRoom={(code, joining) => {
        setRoomInUrl(code)
        setScreen({ name: 'online', code, joining })
      }}
    />
  )
}
