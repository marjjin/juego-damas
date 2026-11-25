import { WHITE, BLACK } from './rules.js'

export function resultText(state, names) {
  if (!state.winner) return null
  if (state.winner === 'draw') return 'Empate: 40 jugadas seguidas sin capturas ni movimientos de peón.'
  const winner = names[state.winner]
  const loser = names[state.winner === WHITE ? BLACK : WHITE]
  if (state.reason === 'abandono') return `Ganó ${winner}. ${loser} abandonó la partida.`
  return `Ganó ${winner}. ${loser} se quedó sin movimientos.`
}
