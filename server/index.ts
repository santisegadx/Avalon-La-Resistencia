import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';
import { AvalonEngine, EngineRoomInstance } from './engine/AvalonEngine.js';
import { RoomManager } from './store/RoomManager.js';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'avalon-authoritative-server' });
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const roomManager = new RoomManager();

/**
 * Emite el estado público sincronizado a toda la sala.
 * Jamás contiene información de `secretState`.
 */
function broadcastRoomState(instance: EngineRoomInstance): void {
  io.to(instance.publicState.room.code).emit('room_state', instance.publicState);
}

/**
 * Emite la proyección individual `PlayerVision` únicamente al socket de cada jugador.
 */
function emitPrivateVisionToPlayer(
  instance: EngineRoomInstance,
  playerId: string,
  targetSocket?: Socket<ClientToServerEvents, ServerToClientEvents>
): void {
  if (instance.publicState.room.status === 'LOBBY') {
    return;
  }

  try {
    const vision = AvalonEngine.getPrivateVision(playerId, instance);
    if (targetSocket) {
      targetSocket.emit('private_vision', vision);
      return;
    }

    const socketId = roomManager.getSocketIdForPlayer(
      instance.publicState.room.code,
      playerId
    );
    if (socketId) {
      io.to(socketId).emit('private_vision', vision);
    }
  } catch {
    // El jugador aún no tiene rol asignado
  }
}

/**
 * Emite individualmente a cada jugador conectado en la sala su propia visión privada.
 */
function broadcastAllPrivateVisions(instance: EngineRoomInstance): void {
  for (const player of instance.publicState.players) {
    emitPrivateVisionToPlayer(instance, player.id);
  }
}

io.on('connection', (socket) => {
  // 1. Crear Sala
  socket.on('create_room', ({ nickname, roomName }, callback) => {
    try {
      const { instance, session } = roomManager.createRoom(
        socket.id,
        nickname,
        roomName
      );
      socket.join(session.roomCode);

      callback({
        ok: true,
        playerId: session.playerId,
        playerToken: session.playerToken,
        roomCode: session.roomCode,
      });

      broadcastRoomState(instance);
    } catch (err) {
      callback({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al crear la sala.',
      });
    }
  });

  // 2. Unirse a Sala (o reconectar si envía playerToken)
  socket.on('join_room', ({ roomCode, nickname, playerToken }, callback) => {
    try {
      const { instance, session, isReconnect } = roomManager.joinRoom(
        socket.id,
        roomCode,
        nickname,
        playerToken
      );
      socket.join(session.roomCode);

      callback({
        ok: true,
        playerId: session.playerId,
        playerToken: session.playerToken,
        roomCode: session.roomCode,
      });

      broadcastRoomState(instance);

      if (isReconnect && instance.publicState.room.status !== 'LOBBY') {
        emitPrivateVisionToPlayer(instance, session.playerId, socket);
      }
    } catch (err) {
      callback({
        ok: false,
        error: err instanceof Error ? err.message : 'No se pudo unir a la sala.',
      });
    }
  });

  // 3. Reconexión automática por playerToken almacenado en localStorage
  socket.on('reconnect_session', ({ roomCode, playerToken }, callback) => {
    try {
      const { instance, session } = roomManager.reconnectSession(
        socket.id,
        roomCode,
        playerToken
      );
      socket.join(session.roomCode);

      callback({
        ok: true,
        playerId: session.playerId,
        playerToken: session.playerToken,
        roomCode: session.roomCode,
      });

      broadcastRoomState(instance);
      emitPrivateVisionToPlayer(instance, session.playerId, socket);
    } catch (err) {
      callback({
        ok: false,
        error: err instanceof Error ? err.message : 'Sesión expirada.',
      });
    }
  });

  // 4. Actualizar configuración del Lobby (Host)
  socket.on('update_config', ({ config }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.updateConfig(
        session.roomCode,
        session.playerId,
        config
      );
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al actualizar reglas.',
      });
    }
  });

  // 5. Expulsar jugador en Lobby (Host)
  socket.on('kick_player', ({ targetPlayerId }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const { instance, kickedSocketId } = roomManager.kickPlayer(
        session.roomCode,
        session.playerId,
        targetPlayerId
      );

      if (kickedSocketId) {
        const kickedSocket = io.sockets.sockets.get(kickedSocketId);
        if (kickedSocket) {
          kickedSocket.leave(session.roomCode);
          kickedSocket.emit('kicked', {
            reason: 'Has sido expulsado de la sala por el anfitrión.',
          });
        }
      }

      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al expulsar jugador.',
      });
    }
  });

  // 5b. Abandonar sala explícitamente (si es el anfitrión, se disuelve la sala)
  socket.on('leave_room', (callback) => {
    try {
      const result = roomManager.leaveRoom(socket.id);

      if (result.dissolved) {
        socket.to(result.roomCode).emit('room_dissolved', {
          reason: 'El anfitrión abandonó la sala. La sala se ha disuelto.',
        });
        io.in(result.roomCode).socketsLeave(result.roomCode);
      } else {
        socket.leave(result.roomCode);
        if (result.instance) {
          broadcastRoomState(result.instance);
        }
      }

      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al abandonar la sala.',
      });
    }
  });

  // 6. Iniciar Partida (LOBBY -> REVEAL_ROLES)
  socket.on('start_game', (callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.startGame(instance, session.playerId);

      broadcastRoomState(instance);
      broadcastAllPrivateVisions(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'No se pudo iniciar la partida.',
      });
    }
  });

  // 7. Confirmar lectura de rol (REVEAL_ROLES -> TEAM_SELECTION)
  socket.on('player_ready', (callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.markPlayerReady(instance, session.playerId);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al confirmar preparación.',
      });
    }
  });

  // 8. Elegir gesta objetivo (si regla targetSelection está activa)
  socket.on('select_quest_target', ({ questIndex }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.selectQuestTarget(instance, session.playerId, questIndex);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al elegir gesta.',
      });
    }
  });

  // 9. Preselección en vivo de integrantes del equipo por el Líder
  socket.on('update_draft_team', ({ teamIds }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) return;

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) return;

      AvalonEngine.updateDraftTeam(instance, session.playerId, teamIds);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch {
      callback?.({ ok: false });
    }
  });

  // 10. Confirmar propuesta de equipo (TEAM_SELECTION -> TEAM_VOTE)
  socket.on('propose_team', ({ questIndex, teamIds }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.proposeTeam(instance, session.playerId, questIndex, teamIds);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al proponer equipo.',
      });
    }
  });

  // 11. Votación secreta de equipo (APPROVE / REJECT)
  socket.on('submit_team_vote', ({ vote }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.submitTeamVote(instance, session.playerId, vote);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al registrar voto.',
      });
    }
  });

  // 12. Ejecución de gesta (SUCCESS / FAIL)
  socket.on('submit_quest_card', ({ card }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.submitQuestCard(instance, session.playerId, card);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al jugar carta de gesta.',
      });
    }
  });

  // 13. Finalizar revelación dramática de cartas (QUEST_REVEAL -> Siguiente fase)
  socket.on('finish_quest_reveal', (callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.finishQuestReveal(instance);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al avanzar fase.',
      });
    }
  });

  // 14. Usar Dama del Lago (emite lealtad privada solo al portador)
  socket.on('use_lady_of_the_lake', ({ targetPlayerId }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.useLadyOfTheLake(instance, session.playerId, targetPlayerId);

      // Actualizar visión privada del portador con la nueva revelación de la Dama
      emitPrivateVisionToPlayer(instance, session.playerId, socket);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al usar la Dama del Lago.',
      });
    }
  });

  // 15. Disparo final del Asesino contra Merlín
  socket.on('assassinate_target', ({ targetPlayerId }, callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.assassinateTarget(instance, session.playerId, targetPlayerId);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al ejecutar asesinato.',
      });
    }
  });

  // 16. Volver al Lobby al finalizar partida (Host)
  socket.on('return_to_lobby', (callback) => {
    try {
      const session = roomManager.getSessionBySocket(socket.id);
      if (!session) throw new Error('Sesión no encontrada.');

      const instance = roomManager.getRoom(session.roomCode);
      if (!instance) throw new Error('Sala no encontrada.');

      AvalonEngine.returnToLobby(instance, session.playerId);
      broadcastRoomState(instance);
      callback?.({ ok: true });
    } catch (err) {
      callback?.({
        ok: false,
        error: err instanceof Error ? err.message : 'Error al volver al lobby.',
      });
    }
  });

  // 17. Manejo de desconexión temporal
  socket.on('disconnect', () => {
    const instance = roomManager.handleDisconnect(socket.id);
    if (instance) {
      broadcastRoomState(instance);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Ávalon Server] Escuchando en puerto ${PORT}`);
});