import crypto from 'crypto';
import { Player, RoomConfig } from '../../shared/types.js';
import { AvalonEngine, EngineRoomInstance } from '../engine/AvalonEngine.js';

export interface ActiveSession {
    roomCode: string;
    playerId: string;
    playerToken: string;
    socketId: string | null;
}

export class RoomManager {
    private rooms: Map<string, EngineRoomInstance> = new Map();
    private sessionsByToken: Map<string, ActiveSession> = new Map();
    private sessionBySocketId: Map<string, ActiveSession> = new Map();

    private static readonly ROOM_TTL_MS = 1000 * 60 * 60 * 6;

    constructor() {
        setInterval(() => this.cleanupStaleRooms(), 1000 * 60 * 15).unref();
    }

    private generateRoomCode(): string {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        do {
            code = '';
            for (let i = 0; i < 5; i++) {
                code += alphabet[crypto.randomInt(0, alphabet.length)];
            }
        } while (this.rooms.has(code));
        return code;
    }

    private generatePlayerId(): string {
        return `plr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }

    private generatePlayerToken(): string {
        return crypto.randomUUID();
    }

    private sanitizeNickname(raw: string): string {
        const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 16);
        if (cleaned.length < 2) {
            throw new Error('El apodo debe tener entre 2 y 16 caracteres.');
        }
        return cleaned;
    }

    private sanitizeRoomName(raw: string): string {
        const cleaned = raw.trim().replace(/\s+/g, ' ').slice(0, 28);
        return cleaned.length >= 2 ? cleaned : '';
    }

    public getRoom(roomCode: string): EngineRoomInstance | undefined {
        return this.rooms.get(roomCode.toUpperCase().trim());
    }

    public getSessionBySocket(socketId: string): ActiveSession | undefined {
        return this.sessionBySocketId.get(socketId);
    }

    public getSocketIdForPlayer(roomCode: string, playerId: string): string | null {
        for (const session of this.sessionBySocketId.values()) {
            if (session.roomCode === roomCode && session.playerId === playerId) {
                return session.socketId;
            }
        }
        return null;
    }

    public createRoom(
        socketId: string,
        rawNickname: string,
        rawRoomName: string
    ): {
        instance: EngineRoomInstance;
        session: ActiveSession;
    } {
        const nickname = this.sanitizeNickname(rawNickname);
        const roomName = this.sanitizeRoomName(rawRoomName);
        const roomCode = this.generateRoomCode();
        const playerId = this.generatePlayerId();
        const playerToken = this.generatePlayerToken();

        const hostPlayer: Player = {
            id: playerId,
            nickname,
            seatIndex: 0,
            isConnected: true,
            isReady: false,
            investigatedByLady: false,
        };

        const instance = AvalonEngine.createInitialRoom(
            roomCode,
            roomName,
            hostPlayer,
            playerToken
        );

        this.rooms.set(roomCode, instance);

        const session: ActiveSession = {
            roomCode,
            playerId,
            playerToken,
            socketId,
        };

        this.sessionsByToken.set(playerToken, session);
        this.sessionBySocketId.set(socketId, session);

        return { instance, session };
    }

    public joinRoom(
        socketId: string,
        rawRoomCode: string,
        rawNickname: string,
        existingToken?: string
    ): {
        instance: EngineRoomInstance;
        session: ActiveSession;
        isReconnect: boolean;
    } {
        const roomCode = rawRoomCode.toUpperCase().trim();
        const instance = this.rooms.get(roomCode);
        if (!instance) {
            throw new Error('La sala no existe o ha expirado.');
        }

        if (existingToken) {
            const existingPlayerId = instance.secretState.playerTokens[existingToken];
            if (existingPlayerId) {
                const reconnected = this.reconnectSession(socketId, roomCode, existingToken);
                return { ...reconnected, isReconnect: true };
            }
        }

        if (instance.publicState.room.status !== 'LOBBY') {
            throw new Error('La partida ya comenzó. No es posible unirse como jugador nuevo.');
        }

        const players = instance.publicState.players;
        const maxPlayers = instance.publicState.room.config.maxPlayers;
        if (players.length >= maxPlayers) {
            throw new Error(`La sala está llena (máximo ${maxPlayers} jugadores).`);
        }

        const nickname = this.sanitizeNickname(rawNickname);
        const duplicateName = players.some(
            (p: any) => p.nickname.toLowerCase() === nickname.toLowerCase()
        );
        if (duplicateName) {
            throw new Error('Ya existe un jugador con ese apodo en la sala.');
        }

        const playerId = this.generatePlayerId();
        const playerToken = this.generatePlayerToken();

        const newPlayer: Player = {
            id: playerId,
            nickname,
            seatIndex: players.length,
            isConnected: true,
            isReady: false,
            investigatedByLady: false,
        };

        players.push(newPlayer);
        instance.secretState.playerTokens[playerToken] = playerId;

        const session: ActiveSession = {
            roomCode,
            playerId,
            playerToken,
            socketId,
        };

        this.sessionsByToken.set(playerToken, session);
        this.sessionBySocketId.set(socketId, session);

        return { instance, session, isReconnect: false };
    }

    public reconnectSession(
        socketId: string,
        rawRoomCode: string,
        playerToken: string
    ): {
        instance: EngineRoomInstance;
        session: ActiveSession;
    } {
        const roomCode = rawRoomCode.toUpperCase().trim();
        const instance = this.rooms.get(roomCode);
        if (!instance) {
            throw new Error('La sala ya no existe.');
        }

        const playerId = instance.secretState.playerTokens[playerToken];
        if (!playerId) {
            throw new Error('Sesión inválida o expirada.');
        }

        const player = instance.publicState.players.find((p: any) => p.id === playerId);
        if (!player) {
            throw new Error('El jugador fue expulsado o ya no pertenece a la sala.');
        }

        let session = this.sessionsByToken.get(playerToken);
        if (session && session.socketId && session.socketId !== socketId) {
            this.sessionBySocketId.delete(session.socketId);
        }

        player.isConnected = true;

        session = {
            roomCode,
            playerId,
            playerToken,
            socketId,
        };

        this.sessionsByToken.set(playerToken, session);
        this.sessionBySocketId.set(socketId, session);

        return { instance, session };
    }

    public updateConfig(
        roomCode: string,
        requesterId: string,
        newConfig: RoomConfig
    ): EngineRoomInstance {
        const instance = this.getRoom(roomCode);
        if (!instance) throw new Error('Sala no encontrada.');
        if (instance.publicState.room.hostId !== requesterId) {
            throw new Error('Solo el anfitrión puede modificar la configuración.');
        }
        if (instance.publicState.room.status !== 'LOBBY') {
            throw new Error('No se puede cambiar la configuración con la partida iniciada.');
        }

        const rawMax = Number(newConfig.maxPlayers);
        const baseMax = Number.isFinite(rawMax)
            ? rawMax
            : instance.publicState.room.config.maxPlayers;
        const clampedMax = Math.max(5, Math.min(10, Math.floor(baseMax)));

        if (clampedMax < instance.publicState.players.length) {
            throw new Error(
                `Ya hay ${instance.publicState.players.length} jugadores en la sala. Expulsa jugadores antes de reducir el límite a ${clampedMax}.`
            );
        }
        const sanitizedConfig: RoomConfig = {
            maxPlayers: clampedMax,
            optionalRoles: {
                perceval: Boolean(newConfig.optionalRoles?.perceval),
                morgana: Boolean(newConfig.optionalRoles?.morgana),
                mordred: Boolean(newConfig.optionalRoles?.mordred),
                oberon: Boolean(newConfig.optionalRoles?.oberon),
            },
            rules: {
                ladyOfTheLake: Boolean(newConfig.rules?.ladyOfTheLake),
                targetSelection: Boolean(newConfig.rules?.targetSelection),
            },
        };

        const validation = AvalonEngine.validateRoomConfig(clampedMax, sanitizedConfig);
        if (!validation.valid) {
            throw new Error(validation.error || 'Configuración de roles inválida.');
        }

        instance.publicState.room.config = sanitizedConfig;
        instance.publicState.gameState.quests = AvalonEngine.buildQuestSlots(clampedMax);
        return instance;
    }

    public kickPlayer(
        roomCode: string,
        requesterId: string,
        targetPlayerId: string
    ): { instance: EngineRoomInstance; kickedSocketId: string | null } {
        const instance = this.getRoom(roomCode);
        if (!instance) throw new Error('Sala no encontrada.');
        if (instance.publicState.room.hostId !== requesterId) {
            throw new Error('Solo el anfitrión puede expulsar jugadores.');
        }
        if (instance.publicState.room.status !== 'LOBBY') {
            throw new Error('No se puede expulsar jugadores durante la partida.');
        }
        if (requesterId === targetPlayerId) {
            throw new Error('No puedes expulsarte a ti mismo.');
        }

        const idx = instance.publicState.players.findIndex((p: any) => p.id === targetPlayerId);
        if (idx === -1) {
            throw new Error('Jugador no encontrado.');
        }

        instance.publicState.players.splice(idx, 1);
        instance.publicState.players.forEach((p: any, i: any) => {
            p.seatIndex = i;
        });

        let kickedSocketId: string | null = null;
        for (const [token, pId] of Object.entries(instance.secretState.playerTokens)) {
            if (pId === targetPlayerId) {
                delete instance.secretState.playerTokens[token];
                const session = this.sessionsByToken.get(token);
                if (session) {
                    kickedSocketId = session.socketId;
                    if (session.socketId) {
                        this.sessionBySocketId.delete(session.socketId);
                    }
                    this.sessionsByToken.delete(token);
                }
            }
        }

        return { instance, kickedSocketId };
    }

    public leaveRoom(socketId: string): {
        roomCode: string;
        dissolved: boolean;
        instance: EngineRoomInstance | null;
    } {
        const session = this.sessionBySocketId.get(socketId);
        if (!session) {
            throw new Error('Sesión no encontrada.');
        }

        const { roomCode, playerId } = session;
        const instance = this.rooms.get(roomCode);

        if (!instance) {
            this.sessionBySocketId.delete(socketId);
            this.sessionsByToken.delete(session.playerToken);
            return { roomCode, dissolved: false, instance: null };
        }

        if (instance.publicState.room.hostId === playerId) {
            for (const token of Object.keys(instance.secretState.playerTokens)) {
                const s = this.sessionsByToken.get(token);
                if (s?.socketId) {
                    this.sessionBySocketId.delete(s.socketId);
                }
                this.sessionsByToken.delete(token);
            }
            this.rooms.delete(roomCode);
            return { roomCode, dissolved: true, instance: null };
        }

        if (instance.publicState.room.status !== 'LOBBY') {
            throw new Error('No puedes abandonar una partida en curso.');
        }

        const idx = instance.publicState.players.findIndex((p: any) => p.id === playerId);
        if (idx !== -1) {
            instance.publicState.players.splice(idx, 1);
            instance.publicState.players.forEach((p: any, i: number) => {
                p.seatIndex = i;
            });
        }

        for (const [token, pId] of Object.entries(instance.secretState.playerTokens)) {
            if (pId === playerId) {
                delete instance.secretState.playerTokens[token];
                const s = this.sessionsByToken.get(token);
                if (s?.socketId) {
                    this.sessionBySocketId.delete(s.socketId);
                }
                this.sessionsByToken.delete(token);
            }
        }

        return { roomCode, dissolved: false, instance };
    }

    public handleDisconnect(socketId: string): EngineRoomInstance | null {
        const session = this.sessionBySocketId.get(socketId);
        if (!session) return null;

        this.sessionBySocketId.delete(socketId);
        session.socketId = null;

        const instance = this.rooms.get(session.roomCode);
        if (!instance) return null;

        const player = instance.publicState.players.find((p: any) => p.id === session.playerId);
        if (player) {
            player.isConnected = false;
        }

        return instance;
    }

    private cleanupStaleRooms(): void {
        const now = Date.now();
        for (const [code, instance] of this.rooms.entries()) {
            const anyConnected = instance.publicState.players.some((p: any) => p.isConnected);
            const age = now - instance.publicState.room.createdAt;
            if (!anyConnected && age > RoomManager.ROOM_TTL_MS) {
                for (const token of Object.keys(instance.secretState.playerTokens)) {
                    this.sessionsByToken.delete(token);
                }
                this.rooms.delete(code);
            }
        }
    }
}
