export type Alignment = 'GOOD' | 'EVIL';

export type Role =
  | 'MERLIN'
  | 'PERCEVAL'
  | 'LOYAL_SERVANT'
  | 'ASSASSIN'
  | 'MORGANA'
  | 'MORDRED'
  | 'OBERON'
  | 'MINION';

export type GamePhase =
  | 'LOBBY'
  | 'REVEAL_ROLES'
  | 'TEAM_SELECTION'
  | 'TEAM_VOTE'
  | 'QUEST_EXECUTION'
  | 'QUEST_REVEAL'
  | 'LADY_OF_THE_LAKE'
  | 'ASSASSINATION'
  | 'GAME_OVER';

export interface RoomConfig {
  maxPlayers: number; // 5 a 10
  optionalRoles: {
    perceval: boolean;
    morgana: boolean;
    mordred: boolean;
    oberon: boolean;
  };
  rules: {
    ladyOfTheLake: boolean;
    targetSelection: boolean;
  };
}

export interface Player {
  id: string;
  nickname: string;
  seatIndex: number;
  isConnected: boolean;
  isReady: boolean;
  investigatedByLady: boolean;
}

export interface QuestSlot {
  index: number; // 1 a 5
  teamSize: number;
  requiresTwoFails: boolean;
  status: 'PENDING' | 'ACTIVE' | 'SUCCESS' | 'FAIL';
  results: { successes: number; fails: number } | null;
}

export interface VoteRecord {
  questIndex: number;
  attemptNumber: number; // 1 a 5
  leaderId: string;
  teamIds: string[];
  votes: Record<string, 'APPROVE' | 'REJECT'>;
  approved: boolean;
  questOutcome?: {
    successes: number;
    fails: number;
    passed: boolean;
  } | null;
}

export type WinReason =
  | 'THREE_QUESTS_FAILED'
  | 'FIVE_REJECTIONS'
  | 'MERLIN_ASSASSINATED'
  | 'QUESTS_COMPLETED_MERLIN_SURVIVED';

// Estado público sincronizado con todos los clientes de la sala
export interface PublicRoomState {
  room: {
    code: string;
    name: string;
    hostId: string;
    status: GamePhase;
    createdAt: number;
    config: RoomConfig;
  };
  players: Player[];
  gameState: {
    currentQuestNumber: number; // 1 a 5
    completedQuestsCount: number;
    leaderIndex: number;
    rejectionTrack: number; // 0 a 5
    ladyOfTheLakeHolderId: string | null;
    activeProposal: {
      questIndex: number;
      leaderId: string;
      teamIds: string[];
      votesSubmittedIds: string[]; // Quiénes ya votaron (sin mostrar qué votaron)
      revealedVotes: Record<string, 'APPROVE' | 'REJECT'> | null;
      questVotesSubmittedCount: number; // Cuántos miembros del equipo ya jugaron carta de gesta
      lastShuffledCards?: Array<'SUCCESS' | 'FAIL'>; // Orden barajado para QUEST_REVEAL
    } | null;
    quests: QuestSlot[];
    history: VoteRecord[];
    winner: {
      alignment: Alignment;
      reason: WinReason;
      assassinatedPlayerId?: string;
      revealedRoles?: Record<string, { alignment: Alignment; role: Role }>;
    } | null;
  };
}

// Estado estrictamente privado en el servidor (NUNCA enviarlo crudo al cliente antes de GAME_OVER)
export interface ServerSecretState {
  playerTokens: Record<string, string>; // playerToken -> playerId
  assignments: Record<string, { alignment: Alignment; role: Role }>;
  currentTeamVoteBuffer: Record<string, 'APPROVE' | 'REJECT'>;
  currentQuestCardBuffer: Record<string, 'SUCCESS' | 'FAIL'>;
  ladyInvestigationHistory: Record<string, Array<{ targetId: string; alignment: Alignment }>>;
}

// Payload proyectado individualmente para cada jugador
export interface PlayerVision {
  myPlayerId: string;
  myRole: Role;
  myAlignment: Alignment;
  knownPlayers: Array<{
    playerId: string;
    tag: 'EVIL_TEAMMATE' | 'KNOWN_EVIL' | 'POSSIBLE_MERLIN';
  }>;
  ladyReveals: Array<{
    targetId: string;
    alignment: Alignment;
  }>;
}

// Matrices Constantes del Motor de Reglas
export const ALIGNMENT_DISTRIBUTION: Record<number, { good: number; evil: number }> = {
  5: { good: 3, evil: 2 },
  6: { good: 4, evil: 2 },
  7: { good: 4, evil: 3 },
  8: { good: 5, evil: 3 },
  9: { good: 6, evil: 3 },
  10: { good: 6, evil: 4 },
};

export const QUEST_TEAM_SIZES: Record<number, [number, number, number, number, number]> = {
  5: [2, 3, 2, 3, 3],
  6: [2, 3, 4, 3, 4],
  7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5],
  9: [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// Contratos estrictos de Socket.io
export interface JoinAckResponse {
  ok: boolean;
  error?: string;
  playerId?: string;
  playerToken?: string;
  roomCode?: string;
}

export interface ActionAckResponse {
  ok: boolean;
  error?: string;
}

export interface ClientToServerEvents {
  create_room: (
    payload: { nickname: string; roomName: string },
    callback: (res: JoinAckResponse) => void
  ) => void;
  join_room: (
    payload: { roomCode: string; nickname: string; playerToken?: string },
    callback: (res: JoinAckResponse) => void
  ) => void;
  reconnect_session: (
    payload: { roomCode: string; playerToken: string },
    callback: (res: JoinAckResponse) => void
  ) => void;
  update_config: (
    payload: { config: RoomConfig },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  kick_player: (
    payload: { targetPlayerId: string },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  leave_room: (callback?: (res: ActionAckResponse) => void) => void;
  start_game: (callback?: (res: ActionAckResponse) => void) => void;
  player_ready: (callback?: (res: ActionAckResponse) => void) => void;
  select_quest_target: (
    payload: { questIndex: number },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  update_draft_team: (
    payload: { teamIds: string[] },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  propose_team: (
    payload: { questIndex: number; teamIds: string[] },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  submit_team_vote: (
    payload: { vote: 'APPROVE' | 'REJECT' },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  submit_quest_card: (
    payload: { card: 'SUCCESS' | 'FAIL' },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  finish_quest_reveal: (callback?: (res: ActionAckResponse) => void) => void;
  use_lady_of_the_lake: (
    payload: { targetPlayerId: string },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  assassinate_target: (
    payload: { targetPlayerId: string },
    callback?: (res: ActionAckResponse) => void
  ) => void;
  return_to_lobby: (callback?: (res: ActionAckResponse) => void) => void;
}

export interface ServerToClientEvents {
  room_state: (state: PublicRoomState) => void;
  private_vision: (vision: PlayerVision) => void;
  kicked: (payload: { reason: string }) => void;
  room_dissolved: (payload: { reason: string }) => void;
  error_toast: (payload: { message: string }) => void;
}