# Contexto del Proyecto: La Resistencia: Ávalon

Guía de contexto persistente para trabajar en el repositorio **Avalon-La-Resistencia**. Refleja la arquitectura, contratos, reglas e invariantes reales del código actual.

---

## 1. Visión General y Stack

PWA multijugador en tiempo real del juego de deducción social **La Resistencia: Ávalon** (5 a 10 jugadores), pensada para móvil en una sola pantalla sin componentes físicos.

- **Estructura**: Monorepo npm (`avalon-pwa-monorepo`) con 3 workspaces (`shared`, `server`, `client`), `TypeScript` estricto (`ES2022`, `strict: true` en `tsconfig.base.json`).
- **Backend (`server/`)**: Node.js + Express + Socket.io (`type: "module"`, compilación `NodeNext`). Estado 100 % en memoria y **autoridad total en el servidor**.
- **Frontend (`client/`)**: React 18 + Vite 5 + Tailwind CSS 3 + Zustand 5 + Framer Motion + Lucide React + `qrcode.react` + `vite-plugin-pwa`.
- **Contratos compartidos (`shared/`)**: Tipos de dominio, tablas oficiales del juego y firma estricta de eventos Socket.io en `shared/types.ts`.
- **Idioma**: Toda la interfaz de usuario, mensajes de error del servidor y documentación del código están en **español**.

---

## 2. Mapa de Archivos

| Ruta | Responsabilidad |
| :--- | :--- |
| `package.json` | Workspaces (`shared`, `server`, `client`) y scripts raíz (`build`, `build:client`, `build:server`, `start:server`) |
| `tsconfig.base.json` | Opciones base de TypeScript (`ES2022`, `ESNext`, `bundler`, `strict: true`) |
| `shared/types.ts` | Tipos `Role`, `Alignment`, `GamePhase`, `PublicRoomState`, `ServerSecretState`, `PlayerVision`, `ALIGNMENT_DISTRIBUTION`, `QUEST_TEAM_SIZES`, `ClientToServerEvents`, `ServerToClientEvents` |
| `server/index.ts` | Servidor HTTP Express (`/health`), servidor Socket.io (`PORT \|\| 3001`), handlers de eventos y separación de broadcasts públicos/privados |
| `server/store/RoomManager.ts` | Almacén en memoria (`rooms`, `sessionsByToken`, `sessionBySocketId`), creación/ingreso de salas, reconexión por token, expulsión y TTL de salas |
| `server/engine/AvalonEngine.ts` | Motor puro de reglas (métodos estáticos): reparto aleatorio de roles, visión privada por rol, votaciones, gestas, Dama del Lago, Elección del Objetivo y Asesinato |
| `client/vite.config.ts` | Configuración Vite + `VitePWA` (`manifest: false`) + proxy `/socket.io` → `http://localhost:3001` en puerto `5173` |
| `client/public/manifest.json` | Manifiesto PWA (`portrait`, `standalone`) |
| `client/src/App.tsx` | Enrutamiento por fase (`HomeScreen` / `LobbyScreen` / `GameScreen`) y toast global |
| `client/src/store/useGameStore.ts` | Store Zustand + cliente Socket.io + persistencia de sesión en `localStorage` (`avalon_pwa_session_v1`) |
| `client/src/screens/HomeScreen.tsx` | Crear sala o unirse por código (parsea `/room/:code` de la URL) y pantalla de reconexión |
| `client/src/screens/LobbyScreen.tsx` | Lista de jugadores (5–10), compartir link/QR, expulsar, toggles de roles y reglas opcionales (solo anfitrión) |
| `client/src/screens/GameScreen.tsx` | Layout móvil `100dvh` sin scroll global; coordina tablero, grilla de jugadores, barra de acción, modal y drawer |
| `client/src/components/TopBar.tsx` | Botón *hold-to-peek* (`Mantener Rol`), código de sala, indicador de conexión y acceso al historial |
| `client/src/components/QuestBoard.tsx` | Tablero de 5 gestas (tamaño de equipo, requisito de 2 fallos, selección de objetivo) y contador de 5 rechazos |
| `client/src/components/PlayerGrid.tsx` | Grilla interactiva de jugadores (selección de equipo/objetivo, badges de estado, overlays secretos al hacer peek y roles en `GAME_OVER`) |
| `client/src/components/ActionDeck.tsx` | Controles contextuales por fase y rol (ready, confirmar equipo, aprobar/rechazar, éxito/fracaso con orden aleatorio, Dama del Lago, Asesinato, fin) |
| `client/src/components/QuestRevealModal.tsx` | Modal animado de revelación secuencial (1200 ms por carta) en `QUEST_REVEAL` |
| `client/src/components/HistoryDrawer.tsx` | Drawer inferior con historial cronológico inverso de propuestas, votos y resultados |
| `client/src/utils/roleLabels.ts` | Metadatos (`name`, `alignment`, `shortDesc`) para UI en `ROLE_METADATA` |
| `client/src/hooks/useWakeLock.ts` | Mantiene la pantalla activa durante la partida (`Screen Wake Lock API`) |
| `client/src/hooks/useHaptics.ts` | Patrones de vibración (`navigator.vibrate`) para acciones y revelaciones |

---

## 3. Comandos y Convenciones de Build

- **Compilar todo**: `npm run build` (ejecuta en orden `shared` → `server` → `client`).
- **Desarrollo servidor**: `npm --workspace=server run dev` (`tsx watch index.ts`, escucha en `PORT` o `3001`).
- **Desarrollo cliente**: `npm --workspace=client run dev` (`vite --host`, puerto `5173`, proxea `/socket.io` a `http://localhost:3001`).
- **Variable de entorno cliente**: `VITE_SERVER_URL` (opcional; por defecto usa `window.location.origin`).
- **Variable de entorno servidor**: `PORT` (default `3001`), `CLIENT_ORIGIN` (default `*`).
- **Imports en `server/`**: Usar extensión `.js` en imports relativos TypeScript por `moduleResolution: "NodeNext"` (ej. `import { ... } from '../../shared/types.js'`).
- **Imports en `client/`**: Sin extensión `.js`; usa `moduleResolution: "bundler"` y `noEmit: true` (el código de `shared/` se incluye directamente en `client/tsconfig.json`).

---

## 4. Invariantes Críticas y Reglas del Juego

### Seguridad y Separación de Estado (No Negociable)
- **`ServerSecretState` jamás se envía al cliente** antes de `GAME_OVER`. Toda emisión pública usa `room_state` con `PublicRoomState`.
- Durante la partida, cada jugador recibe únicamente su proyección individual `PlayerVision` mediante el evento privado `private_vision` generado por `AvalonEngine.getPrivateVision(playerId, instance)`.
- Solo al entrar en `GAME_OVER` (`triggerGameOver`) se rellena `gameState.winner.revealedRoles` con todas las asignaciones.
- Los miembros del bando `GOOD` están obligados por el servidor a enviar `'SUCCESS'` en `QUEST_EXECUTION` (el cliente además bloquea el botón `FRACASO`, pero la validación autoritativa vive en `AvalonEngine.submitQuestCard`).

### Máquina de Fases (`GamePhase`)
1. `LOBBY` → `start_game` (solo `hostId`, 5–10 jugadores, configuración válida) → `REVEAL_ROLES`.
2. `REVEAL_ROLES` → todos llaman a `player_ready` → `TEAM_SELECTION`.
3. `TEAM_SELECTION`:
   - El líder actual (`players[leaderIndex]`) puede preseleccionar en vivo (`update_draft_team`), elegir gesta si `rules.targetSelection` está activo (`select_quest_target`) y confirmar equipo (`propose_team`) → `TEAM_VOTE`.
   - Regla de `targetSelection`: **la Gesta 5 no puede seleccionarse** mientras queden más de 3 gestas pendientes/activas (es decir, requiere al menos 2 gestas completadas).
4. `TEAM_VOTE`:
   - Votan todos los jugadores (`submit_team_vote`). Mientras falten votos, un jugador puede sobrescribir su voto; `PublicRoomState` solo expone `votesSubmittedIds`, nunca el sentido del voto hasta completarse.
   - Mayoría estricta (`approves > rejects`):
     - **Aprobado**: `rejectionTrack` vuelve a `0` → `QUEST_EXECUTION`.
     - **Rechazado**: `rejectionTrack += 1`; si llega a `5`, gana `EVIL` por `FIVE_REJECTIONS` → `GAME_OVER`; si no, rota `leaderIndex` y vuelve a `TEAM_SELECTION`.
5. `QUEST_EXECUTION`:
   - Solo miembros de `activeProposal.teamIds` envían `submit_quest_card`. Al completar el equipo, se barajan las cartas (`lastShuffledCards`), se evalúa el resultado (`requiresTwoFails` es `true` en **Gesta 4 con 7+ jugadores**, 1 fallo en el resto) → `QUEST_REVEAL`.
6. `QUEST_REVEAL`:
   - Al llamar a `finish_quest_reveal`:
     - Si `totalFails >= 3` → gana `EVIL` (`THREE_QUESTS_FAILED`) → `GAME_OVER`.
     - Si `totalSuccesses >= 3` → `ASSASSINATION`.
     - Si `rules.ladyOfTheLake` está activo, `completedQuestsCount` es `2`, `3` o `4` y existe algún jugador elegible (`!p.investigatedByLady` y distinto al portador actual) → `LADY_OF_THE_LAKE`.
     - En otro caso → rota `leaderIndex` y pasa a `TEAM_SELECTION`.
7. `LADY_OF_THE_LAKE`:
   - El portador (`ladyOfTheLakeHolderId`) elige un jugador no investigado previamente (`use_lady_of_the_lake`), recibe su alineación en `privateVision.ladyReveals`, transfiere la ficha al objetivo (marcándolo `investigatedByLady = true`), rota `leaderIndex` y pasa a `TEAM_SELECTION`.
   - Al iniciar la partida, el jugador a la izquierda del líder inicial (`(initialLeaderIndex - 1 + n) % n`) recibe la ficha y arranca con `investigatedByLady = true`.
8. `ASSASSINATION`:
   - Solo `ASSASSIN` ejecuta `assassinate_target`. Si acierta a `MERLIN`, gana `EVIL` (`MERLIN_ASSASSINATED`); si falla, gana `GOOD` (`QUESTS_COMPLETED_MERLIN_SURVIVED`) → `GAME_OVER`.
9. `GAME_OVER` → `return_to_lobby` (solo `hostId`) reinicia la sala a `LOBBY`.

### Visión por Rol (`AvalonEngine.getPrivateVision`)
- `MERLIN` y `ASSASSIN` son obligatorios en toda partida.
- `MERLIN`: ve a los `EVIL` como `KNOWN_EVIL`, **excepto `MORDRED`**.
- `PERCEVAL`: ve a `MERLIN` y `MORGANA` indiferenciados como `POSSIBLE_MERLIN`.
- `ASSASSIN`, `MORGANA`, `MORDRED`, `MINION`: ven a sus compañeros `EVIL` como `EVIL_TEAMMATE`, **excepto `OBERON`**.
- `OBERON` y `LOYAL_SERVANT`: `knownPlayers` vacío.

### Sesiones y Reconexión
- Códigos de sala de **5 caracteres** (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- Cada jugador recibe `playerId` y `playerToken` persistido en `localStorage` (`avalon_pwa_session_v1`) para reconectar automáticamente vía `reconnect_session` (o `join_room` enviando `playerToken`).
- Limpieza de salas en `RoomManager`: cada 15 min elimina salas donde ningún jugador está conectado y `Date.now() - createdAt > 6h`.

---

## 5. Estado Actual y Deuda Técnica Conocida

Tener en cuenta los siguientes puntos detectados en el código actual (no asumir que están resueltos):

1. **Sin `node_modules` ni `.gitignore`**: aún no se han instalado dependencias en el workspace ni existe `.gitignore` en la raíz para excluir `node_modules/` y `dist/`.
2. **Abandono de sala solo local (`useGameStore.leaveRoomLocally`)**: al salir desde `LobbyScreen`, el cliente limpia `localStorage` y estado local sin notificar al servidor ni abandonar el room de Socket.io, dejando un jugador fantasma en `RoomManager` si el socket sigue vivo.
3. **`QUEST_REVEAL` sin restricción de host/consenso y orden reordenado**: cualquier jugador puede disparar `finish_quest_reveal` cerrando el modal para todos; además `QuestRevealModal.tsx` agrupa `SUCCESS` antes de `FAIL` en lugar de usar el orden de `lastShuffledCards`.
4. **Assets PWA ausentes**: `client/vite.config.ts` y `client/public/manifest.json` declaran `favicon.svg`, `/icons/icon-192.png` y `/icons/icon-512.png`, pero no existen en `client/public/`.
5. **Desajustes menores de configuración/UI**:
   - `shared/tsconfig.json` tiene `"include": [".//*.ts"]`.
   - `server/package.json` combina `express` `^4.21.1` con `@types/express` `^5.0.0`.
   - `server/index.ts` no sirve `client/dist` como estáticos en producción (en dev depende del proxy de Vite).
   - `ActionDeck.tsx` guarda `hasSubmittedQuestCard` solo en estado React local (una recarga en `QUEST_EXECUTION` vuelve a mostrar los botones, aunque el servidor rechaza el duplicado) y en `TEAM_VOTE` no resalta cuál voto se eligió mientras se espera al resto.
   - `HomeScreen.tsx` y `useGameStore.ts` aceptan códigos de 4 a 6 caracteres aunque `RoomManager` genera códigos de 5.
   - `QuestBoard.tsx` habilita tocar G5 visualmente antes de completar 2 gestas cuando `targetSelection` está activo (el servidor lo rechaza con error).
   - `TopBar.tsx` usa la clase `z-35` (no estándar en Tailwind v3).
   - `RoomManager.joinRoom` actualiza `config.maxPlayers` al crecer el lobby pero no reconstruye `gameState.quests` hasta `updateConfig` o `startGame`.
