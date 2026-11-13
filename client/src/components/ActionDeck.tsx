import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Crosshair,
  Droplets,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { PlayerVision, PublicRoomState } from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';

interface ActionDeckProps {
  roomState: PublicRoomState;
  myPlayerId: string;
  privateVision: PlayerVision | null;
  selectedPlayerIds: string[];
  onPlayerReady: () => void;
  onProposeTeam: () => void;
  onSubmitTeamVote: (vote: 'APPROVE' | 'REJECT') => void;
  onSubmitQuestCard: (card: 'SUCCESS' | 'FAIL') => void;
  onUseLady: () => void;
  onAssassinate: () => void;
  onReturnToLobby: () => void;
}

const WIN_REASON_TEXT: Record<
  NonNullable<PublicRoomState['gameState']['winner']>['reason'],
  string
> = {
  THREE_QUESTS_FAILED: 'Tres gestas han fracasado. La oscuridad cae sobre Camelot.',
  FIVE_REJECTIONS: 'Cinco equipos rechazados seguidos. El caos destruye la mesa.',
  MERLIN_ASSASSINATED: '¡El Asesino descubrió y eliminó a Merlín!',
  QUESTS_COMPLETED_MERLIN_SURVIVED: 'Tres gestas completadas y Merlín sobrevivió al atentado.',
};

export const ActionDeck: React.FC<ActionDeckProps> = ({
  roomState,
  myPlayerId,
  privateVision,
  selectedPlayerIds,
  onPlayerReady,
  onProposeTeam,
  onSubmitTeamVote,
  onSubmitQuestCard,
  onUseLady,
  onAssassinate,
  onReturnToLobby,
}) => {
  const { tapMedium, tapLight } = useHaptics();
  const { room, players, gameState } = roomState;
  const phase = room.status;

  const [swapQuestButtons, setSwapQuestButtons] = useState(false);
  const [hasSubmittedQuestCard, setHasSubmittedQuestCard] = useState(false);
  const [shakeBlocked, setShakeBlocked] = useState(false);

  useEffect(() => {
    if (phase === 'QUEST_EXECUTION') {
      setSwapQuestButtons(Math.random() < 0.5);
      setHasSubmittedQuestCard(false);
    }
  }, [phase, gameState.currentQuestNumber, gameState.completedQuestsCount]);

  const me = players.find((p) => p.id === myPlayerId);
  const currentLeader = players[gameState.leaderIndex];
  const activeQuest = gameState.quests.find(
    (q) => q.index === gameState.currentQuestNumber
  );

  if (phase === 'REVEAL_ROLES') {
    const readyCount = players.filter((p) => p.isReady).length;
    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <p className="text-xs text-center text-slate-300 mb-2">
          Mantén presionado <strong className="text-amber-300">[Mantener Rol]</strong> arriba para ver tu identidad secreta ({readyCount}/{players.length} listos).
        </p>
        <button
          type="button"
          disabled={me?.isReady}
          onClick={() => {
            tapMedium();
            onPlayerReady();
          }}
          className="w-full min-h-[54px] rounded-xl font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2 bg-amber-500 text-slate-950 active:scale-[0.99] disabled:bg-slate-800 disabled:text-slate-400"
        >
          <CheckCircle2 className="w-5 h-5" />
          {me?.isReady ? 'Esperando al resto de la mesa...' : 'Ya revisé mi rol · Estoy listo'}
        </button>
      </footer>
    );
  }

  if (phase === 'TEAM_SELECTION') {
    const isLeader = currentLeader?.id === myPlayerId;
    const requiredSize = activeQuest?.teamSize ?? 2;

    if (!isLeader) {
      return (
        <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
          <div className="min-h-[54px] flex flex-col items-center justify-center text-center px-2">
            <span className="text-xs text-amber-300 font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {currentLeader?.nickname} está formando equipo para Gesta {gameState.currentQuestNumber}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Seleccionados: {gameState.activeProposal?.teamIds.length ?? 0} / {requiredSize} jugadores
            </span>
          </div>
        </footer>
      );
    }

    const canConfirm = selectedPlayerIds.length === requiredSize;
    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <p className="text-xs text-center text-slate-300 mb-2">
          Toca las tarjetas de <strong className="text-amber-300">{requiredSize} jugadores</strong> para la Gesta {gameState.currentQuestNumber}.
        </p>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            tapMedium();
            onProposeTeam();
          }}
          className="w-full min-h-[54px] rounded-xl font-bold text-sm bg-amber-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.99] transition-all"
        >
          Confirmar Equipo ({selectedPlayerIds.length}/{requiredSize})
        </button>
      </footer>
    );
  }

  if (phase === 'TEAM_VOTE') {
    const hasVoted =
      gameState.activeProposal?.votesSubmittedIds.includes(myPlayerId) ?? false;
    const totalVoted = gameState.activeProposal?.votesSubmittedIds.length ?? 0;

    const approveClasses =
      'min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all active:scale-[0.98] ' +
      (hasVoted
        ? 'bg-slate-900 border-slate-700 text-slate-200'
        : 'bg-slate-100 border-white text-slate-950');

    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
          <span>Votación de Equipo (Gesta {gameState.currentQuestNumber})</span>
          <span className="font-mono text-amber-300">
            {totalVoted}/{players.length} votos
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              tapMedium();
              onSubmitTeamVote('APPROVE');
            }}
            className={approveClasses}
          >
            <ThumbsUp className="w-4 h-4" />
            APROBAR
          </button>
          <button
            type="button"
            onClick={() => {
              tapMedium();
              onSubmitTeamVote('REJECT');
            }}
            className="min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-900 border border-slate-600 text-slate-200 active:scale-[0.98] transition-all"
          >
            <ThumbsDown className="w-4 h-4" />
            RECHAZAR
          </button>
        </div>
      </footer>
    );
  }

  if (phase === 'QUEST_EXECUTION') {
    const isOnQuest =
      gameState.activeProposal?.teamIds.includes(myPlayerId) ?? false;
    const submittedCount = gameState.activeProposal?.questVotesSubmittedCount ?? 0;
    const teamSize = gameState.activeProposal?.teamIds.length ?? 0;

    if (!isOnQuest) {
      return (
        <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-sky-300">
              El equipo está ejecutando la Gesta {gameState.currentQuestNumber}...
            </span>
            <span className="text-[11px] text-slate-400 font-mono mt-0.5">
              Cartas jugadas: {submittedCount} / {teamSize}
            </span>
          </div>
        </footer>
      );
    }

    if (hasSubmittedQuestCard) {
      return (
        <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-emerald-300">
              Carta secreta enviada ({submittedCount}/{teamSize})
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Mantén la calma mientras votan tus compañeros...
            </span>
          </div>
        </footer>
      );
    }

    const isGood = privateVision?.myAlignment === 'GOOD';

    const successBtn = (
      <button
        key="success"
        type="button"
        onClick={() => {
          tapMedium();
          setHasSubmittedQuestCard(true);
          onSubmitQuestCard('SUCCESS');
        }}
        className="min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-900 border border-slate-600 text-slate-100 active:bg-slate-800 active:scale-[0.98] transition-all"
      >
        <ShieldCheck className="w-4 h-4 text-sky-400" />
        ÉXITO
      </button>
    );

    const failBtnClasses =
      'min-h-[56px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-900 border border-slate-600 text-slate-100 transition-all ' +
      (isGood ? 'opacity-75 ' : 'active:bg-slate-800 active:scale-[0.98] ') +
      (shakeBlocked ? 'translate-x-1 border-amber-500/60' : '');

    const failBtn = (
      <button
        key="fail"
        type="button"
        onClick={() => {
          if (isGood) {
            tapLight();
            setShakeBlocked(true);
            setTimeout(() => setShakeBlocked(false), 350);
            return;
          }
          tapMedium();
          setHasSubmittedQuestCard(true);
          onSubmitQuestCard('FAIL');
        }}
        className={failBtnClasses}
      >
        {isGood ? (
          <Lock className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        )}
        FRACASO
      </button>
    );

    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <p className="text-[11px] text-center text-slate-400 mb-2">
          {isGood
            ? 'Como miembro del Bien, tu lealtad solo permite apoyar el Éxito.'
            : 'Elige en secreto el destino de esta gesta.'}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {swapQuestButtons ? [failBtn, successBtn] : [successBtn, failBtn]}
        </div>
      </footer>
    );
  }

  if (phase === 'LADY_OF_THE_LAKE') {
    const isHolder = gameState.ladyOfTheLakeHolderId === myPlayerId;
    const holder = players.find((p) => p.id === gameState.ladyOfTheLakeHolderId);
    const targetId = selectedPlayerIds[0];

    if (!isHolder) {
      return (
        <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
          <div className="min-h-[56px] flex items-center justify-center gap-2 text-xs text-cyan-300 font-semibold">
            <Droplets className="w-4 h-4" />
            <span>{holder?.nickname} está usando la Dama del Lago...</span>
          </div>
        </footer>
      );
    }

    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <p className="text-xs text-center text-cyan-200 mb-2">
          Elige a un jugador no investigado para conocer en secreto su bando.
        </p>
        <button
          type="button"
          disabled={!targetId}
          onClick={() => {
            tapMedium();
            onUseLady();
          }}
          className="w-full min-h-[54px] rounded-xl font-bold text-sm bg-cyan-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
        >
          <Droplets className="w-4 h-4" />
          Investigar Lealtad
        </button>
      </footer>
    );
  }

  if (phase === 'ASSASSINATION') {
    const isAssassin = privateVision?.myRole === 'ASSASSIN';
    const targetId = selectedPlayerIds[0];
    const targetPlayer = players.find((p) => p.id === targetId);

    if (!isAssassin) {
      return (
        <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 animate-pulse" />
              ¡El Bien completó 3 gestas! El Asesino apunta a Merlín...
            </span>
          </div>
        </footer>
      );
    }

    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <p className="text-xs text-center text-rose-300 mb-2">
          Toca a quién crees que es <strong>Merlín</strong> y ejecuta el disparo final.
        </p>
        <button
          type="button"
          disabled={!targetId}
          onClick={() => {
            tapMedium();
            onAssassinate();
          }}
          className="w-full min-h-[54px] rounded-xl font-bold text-sm bg-rose-600 text-white disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2"
        >
          <Crosshair className="w-4 h-4" />
          {targetPlayer ? 'Asesinar a ' + targetPlayer.nickname : 'Selecciona un objetivo'}
        </button>
      </footer>
    );
  }

  if (phase === 'GAME_OVER' && gameState.winner) {
    const isGoodWin = gameState.winner.alignment === 'GOOD';
    const isHost = room.hostId === myPlayerId;
    const titleClasses =
      'text-sm font-extrabold uppercase tracking-wider ' +
      (isGoodWin ? 'text-sky-400' : 'text-rose-400');

    return (
      <footer className="p-3 bg-[#12151e] border-t border-slate-800 shrink-0">
        <div className="text-center mb-2">
          <div className={titleClasses}>
            {isGoodWin ? '¡Victoria del Bando del Bien!' : '¡Victoria del Bando del Mal!'}
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {WIN_REASON_TEXT[gameState.winner.reason]}
          </p>
        </div>
        {isHost ? (
          <button
            type="button"
            onClick={() => {
              tapMedium();
              onReturnToLobby();
            }}
            className="w-full min-h-[50px] rounded-xl font-bold text-sm bg-amber-500 text-slate-950 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Volver al Lobby
          </button>
        ) : (
          <p className="text-center text-[11px] text-slate-400">
            Esperando a que el anfitrión reinicie la sala...
          </p>
        )}
      </footer>
    );
  }

  return null;
};