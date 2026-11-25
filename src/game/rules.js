// Motor de reglas de damas (8x8).
// - Blancas abajo (filas 5 a 7), empiezan moviendo.
// - Peones mueven y capturan solo hacia adelante, en diagonal.
// - Captura obligatoria, con capturas múltiples encadenadas.
// - Dama voladora: se mueve y captura a cualquier distancia en diagonal.
// - Las piezas capturadas se retiran al final de la jugada (no se pueden saltar dos veces).
// - Un peón que llega a la última fila corona y termina la jugada.

export const SIZE = 8
export const WHITE = 'w'
export const BLACK = 'b'
const DIRS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
]
// Si pasan estas jugadas seguidas sin capturas ni movimientos de peón, es empate.
export const DRAW_LIMIT = 40

export const idx = (r, c) => r * SIZE + c
export const rowOf = (i) => Math.floor(i / SIZE)
export const colOf = (i) => i % SIZE
const inside = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE
export const isDark = (r, c) => (r + c) % 2 === 1
export const opponent = (color) => (color === WHITE ? BLACK : WHITE)
const forward = (color) => (color === WHITE ? -1 : 1)
const lastRow = (color) => (color === WHITE ? 0 : SIZE - 1)

export function initialState() {
  const board = Array(SIZE * SIZE).fill(null)
  let id = 0
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!isDark(r, c)) continue
      if (r < 3) board[idx(r, c)] = { id: id++, c: BLACK, k: false }
      else if (r > 4) board[idx(r, c)] = { id: id++, c: WHITE, k: false }
    }
  }
  return {
    board,
    turn: WHITE,
    moveNo: 0,
    quiet: 0,
    lastMove: null,
    winner: null, // 'w' | 'b' | 'draw' | null
    reason: null,
  }
}

// Busca todas las secuencias de captura que parten de `from`.
function captureSequences(board, from, piece) {
  const results = []

  function dfs(pos, path, captured) {
    let extended = false
    const r = rowOf(pos)
    const c = colOf(pos)

    for (const [dr, dc] of DIRS) {
      if (!piece.k && dr !== forward(piece.c)) continue

      if (piece.k) {
        // Avanza por casillas vacías hasta encontrar una pieza.
        let rr = r + dr
        let cc = c + dc
        while (inside(rr, cc) && (!board[idx(rr, cc)] || idx(rr, cc) === from)) {
          rr += dr
          cc += dc
        }
        if (!inside(rr, cc)) continue
        const victimIdx = idx(rr, cc)
        const victim = board[victimIdx]
        if (!victim || victim.c === piece.c || captured.includes(victimIdx)) continue
        // Casillas de aterrizaje: todas las vacías después de la víctima.
        rr += dr
        cc += dc
        while (inside(rr, cc) && (!board[idx(rr, cc)] || idx(rr, cc) === from)) {
          const land = idx(rr, cc)
          extended = true
          dfs(land, [...path, land], [...captured, victimIdx])
          rr += dr
          cc += dc
        }
      } else {
        const mr = r + dr
        const mc = c + dc
        const lr = r + 2 * dr
        const lc = c + 2 * dc
        if (!inside(lr, lc)) continue
        const victimIdx = idx(mr, mc)
        const victim = board[victimIdx]
        const land = idx(lr, lc)
        if (!victim || victim.c === piece.c || captured.includes(victimIdx)) continue
        if (board[land] && land !== from) continue
        extended = true
        const nextCaptured = [...captured, victimIdx]
        if (lr === lastRow(piece.c)) {
          // Corona y termina la jugada.
          results.push({ from, to: land, path: [...path, land], captures: nextCaptured })
        } else {
          dfs(land, [...path, land], nextCaptured)
        }
      }
    }

    if (!extended && captured.length > 0) {
      results.push({ from, to: pos, path, captures: captured })
    }
  }

  dfs(from, [from], [])
  return results
}

function simpleMoves(board, from, piece) {
  const moves = []
  const r = rowOf(from)
  const c = colOf(from)
  for (const [dr, dc] of DIRS) {
    if (!piece.k && dr !== forward(piece.c)) continue
    let rr = r + dr
    let cc = c + dc
    while (inside(rr, cc) && !board[idx(rr, cc)]) {
      const to = idx(rr, cc)
      moves.push({ from, to, path: [from, to], captures: [] })
      if (!piece.k) break
      rr += dr
      cc += dc
    }
  }
  return moves
}

export function legalMoves(board, color) {
  const captures = []
  const simples = []
  for (let i = 0; i < board.length; i++) {
    const p = board[i]
    if (!p || p.c !== color) continue
    captures.push(...captureSequences(board, i, p))
    if (captures.length === 0) simples.push(...simpleMoves(board, i, p))
  }
  return captures.length > 0 ? captures : simples
}

export function applyMove(state, move) {
  const board = state.board.slice()
  const piece = { ...board[move.from] }
  board[move.from] = null
  for (const ci of move.captures) board[ci] = null
  const wasMan = !piece.k
  if (!piece.k && rowOf(move.to) === lastRow(piece.c)) piece.k = true
  board[move.to] = piece

  const quiet = move.captures.length > 0 || wasMan ? 0 : state.quiet + 1
  const turn = opponent(state.turn)
  const next = {
    board,
    turn,
    moveNo: state.moveNo + 1,
    quiet,
    lastMove: { pieceId: piece.id, path: move.path, captures: move.captures },
    winner: null,
    reason: null,
  }

  if (legalMoves(board, turn).length === 0) {
    next.winner = state.turn
    next.reason = 'sin-movimientos'
  } else if (quiet >= DRAW_LIMIT) {
    next.winner = 'draw'
    next.reason = 'empate-por-jugadas'
  }
  return next
}

export function countPieces(board) {
  const count = { w: 0, b: 0 }
  for (const p of board) if (p) count[p.c]++
  return count
}
