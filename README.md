# Damas 3D

Juego de damas en 3D hecho con React, Three.js (React Three Fiber) y Supabase.

- Se entra solo con un nombre de usuario (sin cuenta ni contraseña).
- Contra la computadora, con tres niveles: fácil, normal y difícil.
- Online: creás una sala, le pasás el código (o el enlace) a otra persona y juegan en tiempo real.

## Puesta en marcha

```bash
npm install
npm run dev
```

El modo contra la computadora funciona sin configurar nada. Para jugar online hace falta Supabase:

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. En el proyecto, abrí **SQL Editor**, pegá el contenido de [supabase/schema.sql](supabase/schema.sql) y ejecutalo.
3. Copiá `.env.example` como `.env.local` y completá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (están en **Project Settings > API**).
4. Reiniciá `npm run dev`.

## Reglas

- Empiezan las blancas. Los peones mueven y capturan en diagonal, solo hacia adelante.
- Capturar es obligatorio y las capturas se encadenan.
- El peón que llega al fondo corona. La dama mueve y captura a cualquier distancia.
- Gana quien deja al rival sin piezas o sin movimientos. Con 40 jugadas seguidas sin capturas ni movimientos de peón, es empate.

## Estructura

- `src/game/rules.js`: reglas y generación de jugadas.
- `src/game/ai.js`: computadora (minimax con poda alfa-beta), corre en un Web Worker.
- `src/components/Board3D.jsx`: escena 3D.
- `src/lib/supabase.js`: salas online (tabla `rooms` + Realtime).

## Limitaciones conocidas

Como no hay cuentas, cualquiera con la clave anónima podría modificar una sala. Para un juego entre amigos alcanza.
Si se publica abierto, conviene pasar las jugadas por una función de base de datos que las valide.
