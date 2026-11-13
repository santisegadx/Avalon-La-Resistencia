import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import {
  ActionAckResponse,
  ClientToServerEvents,
  PlayerVision,
  PublicRoomState,
  RoomConfig,
  ServerToClientEvents,
} from '../../../shared/types';

const STORAGE_SESSION_KEY = 'avalon_pwa_session_v1';

interface StoredSession {
  roomCode: string;
  playerId: string;
  playerToken: string;
  nickname: string;
}

function loadStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (parsed.roomCode && parsed.playerId && parsed.playerToken) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function saveStoredSession(session: StoredSession): void {
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignorar errores de cuota
  }
}

function clearStoredSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {
    // Ignorar
  }
}

interface GameStoreState {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isReconnecting: boolean;
  myPlayerId: string | null;
  myPlayerToken: string | null;
  roomState: PublicRoomState | null;
  privateVision: PlayerVision | null;
  toastMessage: string | null;
  isHistoryOpen: boolean;

  // Conexión y sesión
  initSocket: () => void;
  clearToast: () => void;
  showToast: (msg: string) => void;
  setHistoryOpen: (open: boolean) => void;
  leaveRoomLocally: () => void;

  // Acciones hacia el servidor autoritativo
  createRoom: (nickname: string, roomName: string) => Promise<boolean>;
  joinRoom: (roomCode: string, nickname: string) => Promise<boolean>;
  updateConfig: (config: RoomConfig) => Promise<boolean>;
  kickPlayer: (targetPlayerId: string) => Promise<boolean>;
  startGame: () => Promise<boolean>;
  playerReady: () => Promise<boolean>;
  selectQuestTarget: (questIndex: number) => Promise<boolean>;
  updateDraftTeam: (teamIds: string[]) => void;
  proposeTeam: (questIndex: number, teamIds: string[]) => Promise<boolean>;
  submitTeamVote: (vote: 'APPROVE' | 'REJECT') => Promise<boolean>;
  submitQuestCard: (card: 'SUCCESS' | 'FAIL') => Promise<boolean>;
  finishQuestReveal: () => Promise<boolean>;
  useLadyOfTheLake: (targetPlayerId: string) => Promise<boolean>;
  assassinateTarget: (targetPlayerId: string) => Promise<boolean>;
  returnToLobby: () => Promise<boolean>;
}

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export const useGameStore = create<GameStoreState>((set, get) => ({
  socket: null,
  isConnected: false,
  isReconnecting: false,
  myPlayerId: loadStoredSession()?.playerId ?? null,
  myPlayerToken: loadStoredSession()?.playerToken ?? null,
  roomState: null,
  privateVision: null,
  toastMessage: null,
  isHistoryOpen: false,

  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3500);
  },

  clearToast: () => set({ toastMessage: null }),

  setHistoryOpen: (open: boolean) => set({ isHistoryOpen: open }),

  leaveRoomLocally: () => {
    clearStoredSession();
    set({
      myPlayerId: null,
      myPlayerToken: null,
      roomState: null,
      privateVision: null,
      isHistoryOpen: false,
    });
    if (window.location.pathname.startsWith('/room/')) {
      window.history.replaceState({}, '', '/');
    }
  },

  initSocket: () => {
    if (get().socket) return;

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });

    socket.on('connect', () => {
      set({ isConnected: true });

      const stored = loadStoredSession();
      const urlMatch = window.location.pathname.match(/^\/room\/([A-Za-z0-9]{4,6})$/i);
      const urlRoomCode = urlMatch ? urlMatch[1].toUpperCase() : null;

      // Si hay una sesión guardada en localStorage (y coincide con la URL o no hay URL distinta), reconectar
      if (stored && (!urlRoomCode || stored.roomCode === urlRoomCode)) {
        set({ isReconnecting: true });
        socket.emit(
          'reconnect_session',
          {
            roomCode: stored.roomCode,
            playerToken: stored.playerToken,
          },
          (res) => {
            set({ isReconnecting: false });
            if (res.ok && res.playerId && res.playerToken && res.roomCode) {
              set({
                myPlayerId: res.playerId,
                myPlayerToken: res.playerToken,
              });
              window.history.replaceState({}, '', `/room/${res.roomCode}`);
            } else {
              // Sesión caducada en servidor -> limpiar almacenamiento
              clearStoredSession();
              set({
                myPlayerId: null,
                myPlayerToken: null,
                roomState: null,
                privateVision: null,
              });
            }
          }
        );
      }
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('room_state', (state: PublicRoomState) => {
      set((prev) => ({
        roomState: state,
        // Limpiar visión privada si la sala volvió al LOBBY
        privateVision: state.room.status === 'LOBBY' ? null : prev.privateVision,
      }));
    });

    socket.on('private_vision', (vision: PlayerVision) => {
      set({ privateVision: vision });
    });

    socket.on('kicked', ({ reason }) => {
      get().leaveRoomLocally();
      get().showToast(reason || 'Has sido expulsado de la sala.');
    });

    socket.on('error_toast', ({ message }) => {
      get().showToast(message);
    });

    set({ socket });
  },

  createRoom: (nickname, roomName) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket || !socket.connected) {
        get().showToast('Sin conexión con el servidor.');
        resolve(false);
        return;
      }

      socket.emit('create_room', { nickname, roomName }, (res) => {
        if (res.ok && res.playerId && res.playerToken && res.roomCode) {
          saveStoredSession({
            roomCode: res.roomCode,
            playerId: res.playerId,
            playerToken: res.playerToken,
            nickname,
          });
          set({
            myPlayerId: res.playerId,
            myPlayerToken: res.playerToken,
            privateVision: null,
          });
          window.history.replaceState({}, '', `/room/${res.roomCode}`);
          resolve(true);
        } else {
          get().showToast(res.error || 'No se pudo crear la sala.');
          resolve(false);
        }
      });
    }),

  joinRoom: (roomCode, nickname) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket || !socket.connected) {
        get().showToast('Sin conexión con el servidor.');
        resolve(false);
        return;
      }

      const cleanCode = roomCode.toUpperCase().trim();
      const stored = loadStoredSession();
      const existingToken = stored && stored.roomCode === cleanCode ? stored.playerToken : undefined;

      socket.emit(
        'join_room',
        { roomCode: cleanCode, nickname, playerToken: existingToken },
        (res) => {
          if (res.ok && res.playerId && res.playerToken && res.roomCode) {
            saveStoredSession({
              roomCode: res.roomCode,
              playerId: res.playerId,
              playerToken: res.playerToken,
              nickname,
            });
            set({
              myPlayerId: res.playerId,
              myPlayerToken: res.playerToken,
            });
            window.history.replaceState({}, '', `/room/${res.roomCode}`);
            resolve(true);
          } else {
            get().showToast(res.error || 'No se pudo unir a la sala.');
            resolve(false);
          }
        }
      );
    }),

  updateConfig: (config) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('update_config', { config }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  kickPlayer: (targetPlayerId) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('kick_player', { targetPlayerId }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  startGame: () =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('start_game', (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  playerReady: () =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('player_ready', (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  selectQuestTarget: (questIndex) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('select_quest_target', { questIndex }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  updateDraftTeam: (teamIds) => {
    const socket = get().socket;
    if (!socket) return;
    socket.emit('update_draft_team', { teamIds });
  },

  proposeTeam: (questIndex, teamIds) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('propose_team', { questIndex, teamIds }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  submitTeamVote: (vote) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('submit_team_vote', { vote }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  submitQuestCard: (card) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('submit_quest_card', { card }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  finishQuestReveal: () =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('finish_quest_reveal', (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  useLadyOfTheLake: (targetPlayerId) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('use_lady_of_the_lake', { targetPlayerId }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  assassinateTarget: (targetPlayerId) =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('assassinate_target', { targetPlayerId }, (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),

  returnToLobby: () =>
    new Promise((resolve) => {
      const socket = get().socket;
      if (!socket) return resolve(false);
      socket.emit('return_to_lobby', (res?: ActionAckResponse) => {
        if (!res?.ok && res?.error) get().showToast(res.error);
        resolve(Boolean(res?.ok));
      });
    }),
}));