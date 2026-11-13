import React, { useEffect, useState } from 'react';
import { PublicRoomState } from '../../../shared/types';
import { useGameStore } from '../store/useGameStore';
import { useWakeLock } from '../hooks/useWakeLock';
import { useHaptics } from '../hooks/useHaptics';
import { TopBar } from '../components/TopBar';
import { QuestBoard } from '../components/QuestBoard';
import { PlayerGrid } from '../components/PlayerGrid';
import { ActionDeck } from '../components/ActionDeck';
import { QuestRevealModal } from '../components/QuestRevealModal';
import { HistoryDrawer } from '../components/HistoryDrawer';
interface GameScreenProps {
    roomState: PublicRoomState;
    myPlayerId: string;
}
export const GameScreen: React.FC<GameScreenProps> = ({
    roomState,
    myPlayerId,
}) => {
    const {
        isConnected,
        privateVision,
        isHistoryOpen,
        setHistoryOpen,
        playerReady,
        selectQuestTarget,
        updateDraftTeam,
        proposeTeam,
        submitTeamVote,
        submitQuestCard,
        finishQuestReveal,
        useLadyOfTheLake,
        assassinateTarget,
        returnToLobby,
    } = useGameStore();
    const { phaseAlert } = useHaptics();
    const [isPeeking, setIsPeeking] = useState(false);
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
    const { room, players, gameState } = roomState;
    const phase = room.status;
    const currentLeader = players[gameState.leaderIndex];
    const activeQuest = gameState.quests.find(
        (q) => q.index === gameState.currentQuestNumber
    );
    // Mantener pantalla encendida durante toda la partida
    useWakeLock(phase !== 'LOBBY' && phase !== 'GAME_OVER');
    // Reiniciar selección local al cambiar de fase o de líder y emitir vibración sutil
    useEffect(() => {
        setSelectedPlayerIds([]);
        if (phase !== 'LOBBY') {
            phaseAlert();
        }
    }, [phase, gameState.leaderIndex, gameState.currentQuestNumber, phaseAlert]);
    const handleTogglePlayerSelect = (targetId: string) => {
        if (phase === 'TEAM_SELECTION' && currentLeader?.id === myPlayerId) {
            const maxTeamSize = activeQuest?.teamSize ?? 2;
            setSelectedPlayerIds((prev) => {
                let next: string[];
                if (prev.includes(targetId)) {
                    next = prev.filter((id) => id !== targetId);
                } else if (prev.length < maxTeamSize) {
                    next = [...prev, targetId];
                } else {
                    next = [...prev.slice(1), targetId];
                }
                updateDraftTeam(next);
                return next;
            });
            return;
        }
        if (
            (phase === 'LADY_OF_THE_LAKE' && gameState.ladyOfTheLakeHolderId === myPlayerId) ||
            (phase === 'ASSASSINATION' && privateVision?.myRole === 'ASSASSIN')
        ) {
            setSelectedPlayerIds((prev) => (prev[0] === targetId ? [] : [targetId]));
        }
    };
    const canSelectTargetQuest =
        phase === 'TEAM_SELECTION' &&
        room.config.rules.targetSelection &&
        currentLeader?.id === myPlayerId;
    return (
        <div className="h-[100dvh] w-full max-w-md mx-auto overflow-hidden flex flex-col justify-between bg-[#0a0c10]">
            {/* Top Bar con botón Hold-to-Peek */}
            <TopBar
                roomCode={room.code}
                isConnected={isConnected}
                privateVision={privateVision}
                isPeeking={isPeeking}
                onPeekStart={() => setIsPeeking(true)}
                onPeekEnd={() => setIsPeeking(false)}
                onOpenHistory={() => setHistoryOpen(true)}
                historyCount={gameState.history.length}
            />
            {/* Tablero persistente de 5 Gestas y Contador de Rechazos */}
            <QuestBoard
                quests={gameState.quests}
                currentQuestNumber={gameState.currentQuestNumber}
                rejectionTrack={gameState.rejectionTrack}
                canSelectTargetQuest={canSelectTargetQuest}
                onSelectTargetQuest={(questIdx) => {
                    setSelectedPlayerIds([]);
                    void selectQuestTarget(questIdx);
                }}
            />
            {/* Mesa de Jugadores (Grid interactivo sin scroll) */}
            <PlayerGrid
                players={players}
                myPlayerId={myPlayerId}
                phase={phase}
                leaderIndex={gameState.leaderIndex}
                ladyHolderId={gameState.ladyOfTheLakeHolderId}
                activeProposal={gameState.activeProposal}
                winner={gameState.winner}
                privateVision={privateVision}
                isPeeking={isPeeking}
                selectedPlayerIds={selectedPlayerIds}
                onTogglePlayerSelect={handleTogglePlayerSelect}
            />
            {/* Barra inferior contextual según fase y rol */}
            <ActionDeck
                roomState={roomState}
                myPlayerId={myPlayerId}
                privateVision={privateVision}
                selectedPlayerIds={selectedPlayerIds}
                onPlayerReady={() => void playerReady()}
                onProposeTeam={() =>
                    void proposeTeam(gameState.currentQuestNumber, selectedPlayerIds)
                }
                onSubmitTeamVote={(vote) => void submitTeamVote(vote)}
                onSubmitQuestCard={(card) => void submitQuestCard(card)}
                onUseLady={() => {
                    if (selectedPlayerIds[0]) {
                        void useLadyOfTheLake(selectedPlayerIds[0]);
                    }
                }}
                onAssassinate={() => {
                    if (selectedPlayerIds[0]) {
                        void assassinateTarget(selectedPlayerIds[0]);
                    }
                }}
                onReturnToLobby={() => void returnToLobby()}
            />
            {/* Modal de Revelación Secuencial de Cartas de Gesta */}
            {phase === 'QUEST_REVEAL' && gameState.activeProposal?.lastShuffledCards && (
                <QuestRevealModal
                    cards={gameState.activeProposal.lastShuffledCards}
                    questNumber={gameState.activeProposal.questIndex}
                    requiresTwoFails={
                        gameState.quests.find(
                            (q) => q.index === gameState.activeProposal?.questIndex
                        )?.requiresTwoFails ?? false
                    }
                    isHost={room.hostId === myPlayerId}
                    onCompleteReveal={() => void finishQuestReveal()}
                />
            )}
            {/* Drawer de Historial de Votaciones */}
            <HistoryDrawer
                isOpen={isHistoryOpen}
                onClose={() => setHistoryOpen(false)}
                history={gameState.history}
                players={players}
            />
        </div>
    );
};