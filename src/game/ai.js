import { legalMoves, applyMove, rowOf, colOf, WHITE } from './rules.js'

export const DIFFICULTIES = {
  facil: { label: 'Fácil', depth: 1, randomness: 0.6 },
  normal: { label: 'Normal', depth: 4, randomness: 0.1 },
  dificil: { label: 'Difícil', depth: 6, randomness: 0 },
}

// Evaluación desde el punto de vista de `color`.
function evaluate(state, color) {
  if (state.winner) {
    if (state.winner === 'draw') return 0
    return state.winner === color ? 100000 : -100000
  }
  let score = 0
  for (let i = 0; i < state.board.length; i++) {
    const p = state.board[i]
    if (!p) continue
    const r = rowOf(i)
    const c = colOf(i)
    let v = p.k ? 300 : 100
    if (!p.k) {
      // Premia avanzar hacia la coronación.
      const advance = p.c === WHITE ? 7 - r : r
      v += advance * 4
      // Peones de la fila de fondo defienden la coronación rival.
      if (advance === 0) v += 6
    }
    // Preferencia leve por el centro.
    if (c >= 2 && c <= 5 && r >= 2 && r <= 5) v += 5
    score += p.c === color ? v : -v
  }
  return score
}

function minimax(state, depth, alpha, beta, color) {
  if (depth === 0 || state.winner) return evaluate(state, color)
  const moves = legalMoves(state.board, state.turn)
  const maximizing = state.turn === color
  let best = maximizing ? -Infinity : Infinity
  for (const m of moves) {
    const v = minimax(applyMove(state, m), depth - 1, alpha, beta, color)
    if (maximizing) {
      best = Math.max(best, v)
      alpha = Math.max(alpha, v)
    } else {
      best = Math.min(best, v)
      beta = Math.min(beta, v)
    }
    if (beta <= alpha) break
  }
  return best
}

export function chooseMove(state, difficulty = 'normal') {
  const { depth, randomness } = DIFFICULTIES[difficulty] ?? DIFFICULTIES.normal
  const moves = legalMoves(state.board, state.turn)
  if (moves.length === 0) return null
  if (Math.random() < randomness) {
    return moves[Math.floor(Math.random() * moves.length)]
  }
  const color = state.turn
  let bestScore = -Infinity
  let best = []
  for (const m of moves) {
    const v = minimax(applyMove(state, m), depth - 1, -Infinity, Infinity, color)
    if (v > bestScore) {
      bestScore = v
      best = [m]
    } else if (v === bestScore) {
      best.push(m)
    }
  }
  return best[Math.floor(Math.random() * best.length)]
}
