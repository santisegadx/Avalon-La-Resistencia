import crypto from 'crypto';
import {
    ALIGNMENT_DISTRIBUTION,
    Alignment,
    Player,
    PlayerVision,
    PublicRoomState,
    QUEST_TEAM_SIZES,
    QuestSlot,
    Role,
    RoomConfig,
    ServerSecretState,
} from '../../shared/types.js';

export interface EngineRoomInstance {
    publicState: PublicRoomState;
    secretState: ServerSecretState;
}

export interface ConfigValidationResult {
    valid: boolean;
    error?: string;
    goodCount: number;
    evilCount: number;
    requiredGood: number;
    requiredEvil: number;
}

export class AvalonEngine {
    public static fisherYatesShuffle<T>(items: readonly T[]): T[] {
        const array = [...items];
        for (let i = array.length - 1; i > 0; i--) {
            const j = crypto.randomInt(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    public static createInitialRoom(
        code: string,
        name: string,
        hostPlayer: Player,
        hostToken: string
    ): EngineRoomInstance {
        const defaultConfig: RoomConfig = {
            maxPlayers: 5,
            optionalRoles: {
                perceval: false,
                morgana: false,
                mordred: false,
                oberon: false,
            },
            rules: {
                ladyOfTheLake: false,
                targetSelection: false,
            },
        };

        const publicState: PublicRoomState = {
            room: {
                code,
                name,
                hostId: hostPlayer.id,
                status: 'LOBBY',
                createdAt: Date.now(),
                config: defaultConfig,
            },
            players: [hostPlayer],
            gameState: {
                currentQuestNumber: 1,
                completedQuestsCount: 0,
                leaderIndex: 0,
                rejectionTrack: 0,
                ladyOfTheLakeHolderId: null,
                activeProposal: null,
                quests: this.buildQuestSlots(5),
                history: [],
                winner: null,
            },
        };

        const secretState: ServerSecretState = {
            playerTokens: {
                [hostToken]: hostPlayer.id,
            },
            assignments: {},
            currentTeamVoteBuffer: {},
            currentQuestCardBuffer: {},
            ladyInvestigationHistory: {},
        };

        return { publicState, secretState };
    }

    public static buildQuestSlots(playerCount: number): QuestSlot[] {
        const clampedCount = Math.max(5, Math.min(10, playerCount));
        const sizes = QUEST_TEAM_SIZES[clampedCount];

        return sizes.map((teamSize: any, idx: any) => {
            const questIndex = idx + 1;
            return {
                index: questIndex,
                teamSize,
                requiresTwoFails: clampedCount >= 7 && questIndex === 4,
                status: 'PENDING',
                results: null,
            };
        });
    }

    public static validateRoomConfig(
        playerCount: number,
        config: RoomConfig
    ): ConfigValidationResult {
        const distribution = ALIGNMENT_DISTRIBUTION[playerCount];
        if (!distribution) {
            return {
                valid: false,
                error
