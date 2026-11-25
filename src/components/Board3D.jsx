import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import { SIZE, isDark, rowOf, colOf, idx, legalMoves, WHITE } from '../game/rules.js'

const PIECE_Y = 0.1
const BOARD_TOP = 0
const COLORS = {
  light: '#e8d3ae',
  dark: '#6b4a2f',
  frame: '#3b2416',
  white: '#f3ead8',
  whiteEdge: '#cfc1a3',
  black: '#2a1f1d',
  blackEdge: '#120c0b',
  gold: '#d6a740',
  target: '#6fd08c',
  selected: '#f0c75e',
  last: '#d98c4a',
}

const toPos = (square) => [colOf(square) - 3.5, PIECE_Y, rowOf(square) - 3.5]

function Square({ r, c, onClick, highlight }) {
  const dark = isDark(r, c)
  let color = dark ? COLORS.dark : COLORS.light
  if (highlight === 'last') color = '#8a5a33'
  return (
    <mesh
      position={[c - 3.5, BOARD_TOP, r - 3.5]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onClick={onClick}
    >
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}

function TargetMarker({ square, onClick, capture }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 1 + Math.sin(clock.elapsedTime * 4) * 0.08
    ref.current.scale.set(s, s, s)
  })
  const [x, , z] = toPos(square)
  return (
    <group position={[x, 0.01, z]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} onClick={onClick}>
        <circleGeometry args={[0.28, 32]} />
        <meshBasicMaterial color={capture ? '#e8734a' : COLORS.target} transparent opacity={0.75} />
      </mesh>
      {/* Área de clic más grande que el marcador */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={onClick} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  )
}

function Piece({ piece, square, path, selected, selectable, onClick }) {
  const group = useRef()
  const queue = useRef([])
  const anim = useRef(null)
  const lastSquare = useRef(square)
  const [hovered, setHovered] = useState(false)

  useLayoutEffect(() => {
    const [x, y, z] = toPos(square)
    group.current.position.set(x, y, z)
    // Solo en el montaje: después se anima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (square === lastSquare.current) return
    lastSquare.current = square
    const waypoints =
      path && path[path.length - 1] === square && path.length > 1 ? path.slice(1) : [square]
    queue.current = waypoints.map(toPos)
    anim.current = null
  }, [square, path])

  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    if (!anim.current && queue.current.length > 0) {
      const to = queue.current.shift()
      const from = [g.position.x, PIECE_Y, g.position.z]
      const dist = Math.hypot(to[0] - from[0], to[2] - from[2])
      anim.current = { from, to, t: 0, duration: 0.18 + dist * 0.07, height: 0.25 + dist * 0.08 }
    }
    const a = anim.current
    if (a) {
      a.t = Math.min(1, a.t + dt / a.duration)
      const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 2) / 2
      g.position.x = a.from[0] + (a.to[0] - a.from[0]) * e
      g.position.z = a.from[2] + (a.to[2] - a.from[2]) * e
      g.position.y = PIECE_Y + Math.sin(Math.PI * a.t) * a.height
      if (a.t >= 1) anim.current = null
    } else {
      const targetY = PIECE_Y + (selected ? 0.25 : hovered && selectable ? 0.08 : 0)
      g.position.y += (targetY - g.position.y) * Math.min(1, dt * 12)
    }
  })

  const isWhite = piece.c === WHITE
  const body = isWhite ? COLORS.white : COLORS.black
  const edge = isWhite ? COLORS.whiteEdge : COLORS.blackEdge

  return (
    <group
      ref={group}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        if (selectable) document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = ''
      }}
    >
      <PieceDisc body={body} edge={edge} y={0} />
      {piece.k && (
        <>
          <PieceDisc body={body} edge={edge} y={0.2} />
          <mesh position={[0, 0.405, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.035, 12, 40]} />
            <meshStandardMaterial color={COLORS.gold} metalness={0.8} roughness={0.25} />
          </mesh>
        </>
      )}
      {(selectable || selected) && (
        <mesh position={[0, -0.095, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.46, 40]} />
          <meshBasicMaterial color={selected ? COLORS.selected : '#f5e2a8'} transparent opacity={selected ? 0.95 : 0.45} />
        </mesh>
      )}
    </group>
  )
}

function PieceDisc({ body, edge, y }) {
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.38, 0.18, 40]} />
        <meshStandardMaterial color={body} roughness={0.35} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.091, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.28, 40]} />
        <meshStandardMaterial color={edge} roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.38, 0.02, 8, 40]} />
        <meshStandardMaterial color={edge} roughness={0.5} />
      </mesh>
    </group>
  )
}

function Scene({ state, canPlay, onMove }) {
  const [selected, setSelected] = useState(null)

  const moves = useMemo(
    () => (canPlay ? legalMoves(state.board, state.turn) : []),
    [state.board, state.turn, canPlay],
  )
  const movable = useMemo(() => new Set(moves.map((m) => m.from)), [moves])

  // Limpiar selección cuando cambia el turno o el tablero.
  const [prevMoveNo, setPrevMoveNo] = useState(state.moveNo)
  if (prevMoveNo !== state.moveNo) {
    setPrevMoveNo(state.moveNo)
    setSelected(null)
  }

  // Si hay una sola pieza que puede mover, se selecciona sola.
  const autoSelected = selected == null && movable.size === 1 ? [...movable][0] : selected

  const targets = useMemo(() => {
    if (autoSelected == null) return []
    // Un destino por casilla: si hay varias rutas, la que captura más.
    const byTo = new Map()
    for (const m of moves) {
      if (m.from !== autoSelected) continue
      const prev = byTo.get(m.to)
      if (!prev || m.captures.length > prev.captures.length) byTo.set(m.to, m)
    }
    return [...byTo.values()]
  }, [moves, autoSelected])

  const lastSquares = new Set(state.lastMove ? [state.lastMove.path[0], state.lastMove.path.at(-1)] : [])

  const squares = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c)
      squares.push(
        <Square
          key={i}
          r={r}
          c={c}
          highlight={lastSquares.has(i) ? 'last' : null}
          onClick={(e) => {
            e.stopPropagation()
            setSelected(null)
          }}
        />,
      )
    }
  }

  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff4e0', '#2b1a10', 0.5]} />
      <directionalLight
        position={[4, 10, 5]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-6, 5, -4]} intensity={20} color="#ffcf9a" />

      {/* Marco del tablero */}
      <mesh position={[0, -0.21, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.2, 0.4, 9.2]} />
        <meshStandardMaterial color={COLORS.frame} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.15, 8.15]} />
        <meshStandardMaterial color="#1e120b" />
      </mesh>
      {squares}

      {/* Mesa */}
      <mesh position={[0, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#1d2a24" roughness={0.95} />
      </mesh>
      <ContactShadows position={[0, -0.41, 0]} scale={14} blur={2.5} opacity={0.6} far={2} />

      {state.board.map((p, i) =>
        p ? (
          <Piece
            key={p.id}
            piece={p}
            square={i}
            path={state.lastMove?.pieceId === p.id ? state.lastMove.path : null}
            selected={autoSelected === i}
            selectable={canPlay && movable.has(i) && autoSelected !== i}
            onClick={(e) => {
              e.stopPropagation()
              if (!canPlay) return
              if (movable.has(i)) setSelected(i)
              else setSelected(null)
            }}
          />
        ) : null,
      )}

      {canPlay &&
        targets.map((m) => (
          <TargetMarker
            key={m.to}
            square={m.to}
            capture={m.captures.length > 0}
            onClick={(e) => {
              e.stopPropagation()
              setSelected(null)
              onMove(m)
            }}
          />
        ))}

      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        minDistance={7}
        maxDistance={18}
        minPolarAngle={0.15}
        maxPolarAngle={1.25}
      />
    </>
  )
}

export default function Board3D({ state, myColor = WHITE, canPlay, onMove }) {
  const z = myColor === WHITE ? 1 : -1
  return (
    <Canvas
      key={myColor}
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 9.5, 7.5 * z], fov: 45 }}
      className="board-canvas"
    >
      <color attach="background" args={['#14100d']} />
      <fog attach="fog" args={['#14100d', 16, 30]} />
      <Scene state={state} canPlay={canPlay} onMove={onMove} />
    </Canvas>
  )
}
