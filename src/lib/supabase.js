import { createClient } from '@supabase/supabase-js'
import { initialState } from '../game/rules.js'

// trim(): un salto de línea pegado al cargar la variable rompe la conexión de Realtime.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabaseConfigured = Boolean(url && key)
export const supabase = supabaseConfigured ? createClient(url, key) : null

// Sin letras ni números que se confundan (O/0, I/1).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomCode(length = 5) {
  let s = ''
  const values = crypto.getRandomValues(new Uint32Array(length))
  for (const v of values) s += ALPHABET[v % ALPHABET.length]
  return s
}

export async function createRoom(player) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode()
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: player.id,
        host_name: player.name,
        state: initialState(),
        status: 'waiting',
      })
      .select()
      .single()
    if (!error) return data
    if (error.code !== '23505') throw error // 23505: código repetido, probamos otro
  }
  throw new Error('No se pudo generar un código de sala. Probá de nuevo.')
}

export async function joinRoom(code, player) {
  const { data: room, error } = await supabase
    .from('rooms')
    .select()
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!room) throw new Error(`No existe una sala con el código ${code}. Revisá que esté bien escrito.`)

  // Volver a una sala en la que ya estabas (por ejemplo, después de recargar la página).
  if (room.host_id === player.id || room.guest_id === player.id) return room

  if (room.guest_id) throw new Error('Esa sala ya tiene dos jugadores. Pedí otro código o creá una sala nueva.')

  const { data: joined, error: joinError } = await supabase
    .from('rooms')
    .update({
      guest_id: player.id,
      guest_name: player.name,
      status: 'playing',
      updated_at: new Date().toISOString(),
    })
    .eq('code', code)
    .is('guest_id', null)
    .select()
  if (joinError) throw joinError
  if (!joined || joined.length === 0) {
    throw new Error('Otro jugador entró a la sala justo antes que vos. Pedí otro código o creá una sala nueva.')
  }
  return joined[0]
}

// Guarda una jugada solo si nadie movió antes (evita pisar el estado).
export async function pushState(room, newState) {
  const finished = Boolean(newState.winner)
  const { data, error } = await supabase
    .from('rooms')
    .update({
      state: newState,
      move_no: room.move_no + 1,
      status: finished ? 'finished' : 'playing',
      updated_at: new Date().toISOString(),
    })
    .eq('code', room.code)
    .eq('move_no', room.move_no)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export async function fetchRoom(code) {
  const { data, error } = await supabase.from('rooms').select().eq('code', code).maybeSingle()
  if (error) throw error
  return data
}

export function subscribeRoom(code, player, { onChange, onPresence }) {
  let channel = null
  // Se crea el canal en el próximo ciclo: si el componente se desmonta enseguida
  // (React lo hace en desarrollo), no queda un canal a medio cerrar con el mismo nombre.
  const timer = setTimeout(() => {
    channel = supabase.channel(`room:${code}`, {
      config: { presence: { key: player.id } },
    })
    channel
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
        (payload) => onChange(payload.new),
      )
      .on('presence', { event: 'sync' }, () => {
        onPresence(Object.keys(channel.presenceState()))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: player.name })
          // Recupera cambios que pudieron llegar antes de conectarse.
          const room = await fetchRoom(code).catch(() => null)
          if (room) onChange(room)
        }
      })
  }, 0)
  return () => {
    clearTimeout(timer)
    if (channel) supabase.removeChannel(channel)
  }
}
