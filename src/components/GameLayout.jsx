import Board3D from './Board3D.jsx'
import { countPieces, WHITE, BLACK } from '../game/rules.js'

function PlayerTag({ name, color, active, count, status }) {
  return (
    <div className={`player-tag ${active ? 'active' : ''}`}>
      <span className={`chip ${color === WHITE ? 'chip-white' : 'chip-black'}`} aria-hidden />
      <div>
        <div className="player-name">{name}</div>
        <div className="player-meta">
          {count} {count === 1 ? 'pieza' : 'piezas'}
          {status && <> · {status}</>}
        </div>
      </div>
    </div>
  )
}

export default function GameLayout({
  state,
  myColor,
  canPlay,
  onMove,
  names,
  statuses = {},
  turnText,
  actions,
  overlay,
}) {
  const count = countPieces(state.board)
  const opponentColor = myColor === WHITE ? BLACK : WHITE
  return (
    <div className="game">
      <Board3D state={state} myColor={myColor} canPlay={canPlay} onMove={onMove} />
      <div className="hud top">
        <PlayerTag
          name={names[opponentColor]}
          color={opponentColor}
          active={!state.winner && state.turn === opponentColor}
          count={count[opponentColor]}
          status={statuses[opponentColor]}
        />
        <div className="turn">{turnText}</div>
        <PlayerTag
          name={names[myColor]}
          color={myColor}
          active={!state.winner && state.turn === myColor}
          count={count[myColor]}
          status={statuses[myColor]}
        />
      </div>
      <div className="hud bottom">
        {actions}
        <span className="hint">Arrastrá para girar la cámara. Rueda para acercar.</span>
      </div>
      {overlay && <div className="overlay">{overlay}</div>}
    </div>
  )
}
