import { chooseMove } from './ai.js'

self.onmessage = (e) => {
  const { state, difficulty, requestId } = e.data
  const move = chooseMove(state, difficulty)
  self.postMessage({ move, requestId })
}
