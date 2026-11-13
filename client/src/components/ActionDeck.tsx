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
  Trophy,
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

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
};

const WIN_REASON_TEXT: Record<
  NonNullable<PublicRoomState['gameState']['winner']>['reason'],
  string
> = {
  THREE_QUESTS_FAILED: 'Tres gestas han fracasado. La oscuridad cae sobre Camelot.',
  FIVE_REJECTIONS: 'Cinco comitivas rechazadas seguidas. El caos destruye la mesa.',
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
  const [myTeamVote, setMyTeamVote] = useState<'APPROVE' | 'REJECT' | null>(null);

  useEffect(() => {
    if (phase === 'QUEST_EXECUTION') {
      setSwapQuestButtons(Math.random() < 0.5);
      setHasSubmittedQuestCard(false);
    }
    if (phase === 'TEAM_VOTE') {
      setMyTeamVote(null);
    }
  }, [
    phase,
    gameState.currentQuestNumber,
    gameState.completedQuestsCount,
    gameState.rejectionTrack,
    gameState.leaderIndex,
  ]);

  const me = players.find((p) => p.id === myPlayerId);
  const currentLeader = players[gameState.leaderIndex];
  const activeQuest = gameState.quests.find(
    (q) => q.index === gameState.currentQuestNumber
  );
  const romanQuest =
    ROMAN_NUMERALS[gameState.currentQuestNumber] ?? String(gameState.currentQuestNumber);

  if (phase === 'REVEAL_ROLES') {
    const readyCount = players.filter((p) => p.isReady).length;
    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        <p className="text-xs text-center text-[#d8ccb2] mb-2">
          Mantén presionado <strong className="text-amber-300">[Mantener Rol]</strong> arriba para ver tu identidad ({readyCount}/{players.length} listos).
        </p>
        <button
          type="button"
          disabled={me?.isReady}
          onClick={() => {
            tapMedium();
            onPlayerReady();
          }}
          className="w-full min-h-[54px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold active:scale-[0.985] transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          {me?.isReady ? 'Aguardando a la mesa...' : 'He visto mi rol · Estoy listo'}
        </button>
      </footer>
    );
  }

  if (phase === 'TEAM_SELECTION') {
    const isLeader = currentLeader?.id === myPlayerId;
    const requiredSize = activeQuest?.teamSize ?? 2;

    if (!isLeader) {
      return (
        <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
          <div className="min-h-[54px] flex flex-col items-center justify-center text-center px-2">
            <span className="text-xs text-amber-200 font-semibold flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-400" />
              {currentLeader?.nickname} delibera la comitiva (Gesta {romanQuest})
            </span>
            <span className="text-[11px] text-[#9d917b] mt-0.5 font-mono">
              Caballeros elegidos: {gameState.activeProposal?.teamIds.length ?? 0} / {requiredSize}
            </span>
          </div>
        </footer>
      );
    }

    const canConfirm = selectedPlayerIds.length === requiredSize;
    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        <p className="text-xs text-center text-[#d8ccb2] mb-2">
          Elige <strong className="text-amber-300">{requiredSize} caballeros</strong> en la mesa para la Gesta {romanQuest}.
        </p>
        <button
          type="button"
          disabled={!canConfirm}
          onClick={() => {
            tapMedium();
            onProposeTeam();
          }}
          className="w-full min-h-[54px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold active:scale-[0.985] transition-all"
        >
          Proponer Comitiva ({selectedPlayerIds.length}/{requiredSize})
        </button>
      </footer>
    );
  }

  if (phase === 'TEAM_VOTE') {
    const hasVoted =
      gameState.activeProposal?.votesSubmittedIds.includes(myPlayerId) ?? false;
    const totalVoted = gameState.activeProposal?.votesSubmittedIds.length ?? 0;

    const isApproveChosen = hasVoted && myTeamVote === 'APPROVE';
    const isRejectChosen = hasVoted && myTeamVote === 'REJECT';

    const approveClasses =
      'min-h-[56px] rounded-xl font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 border transition-all active:scale-[0.98] ' +
      (isApproveChosen
        ? 'bg-[#f4ebd8] border-amber-300 text-[#1a1103] ring-2 ring-amber-400/60 shadow-goldring'
        : hasVoted
        ? 'bg-[#1c1824] border-amber-500/20 text-[#b8ab92]'
        : 'bg-[#efe4cc] border-amber-200 text-[#1a1103] shadow-sm');

    const rejectClasses =
      'min-h-[56px] rounded-xl font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 border transition-all active:scale-[0.98] ' +
      (isRejectChosen
        ? 'btn-crimson-wax ring-2 ring-rose-400/60'
        : 'bg-[#1b131b] border-rose-500/35 text-rose-100');

    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        <div className="flex items-center justify-between text-xs text-[#b8ab92] mb-2 px-1">
          <span>Votación de Comitiva · Gesta {romanQuest}</span>
          <span className="font-mono text-amber-300 font-semibold">
            {totalVoted}/{players.length} votos
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              tapMedium();
              setMyTeamVote('APPROVE');
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
              setMyTeamVote('REJECT');
              onSubmitTeamVote('REJECT');
            }}
            className={rejectClasses}
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
        <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-sky-300">
              La comitiva parte hacia la Gesta {romanQuest}...
            </span>
            <span className="text-[11px] text-[#9d917b] font-mono mt-0.5">
              Cartas selladas: {submittedCount} / {teamSize}
            </span>
          </div>
        </footer>
      );
    }

    if (hasSubmittedQuestCard) {
      return (
        <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-emerald-300">
              Carta sellada en secreto ({submittedCount}/{teamSize})
            </span>
            <span className="text-[11px] text-[#9d917b] mt-0.5">
              Guarda compostura mientras deciden tus compañeros...
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
        className="min-h-[56px] rounded-xl font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 bg-gradient-to-b from-sky-950/90 to-[#0d1c2e] border border-sky-400/60 text-sky-100 active:scale-[0.98] transition-all shadow-azurering"
      >
        <ShieldCheck className="w-4 h-4 text-sky-300" />
        ÉXITO
      </button>
    );

    const failBtnClasses =
      'min-h-[56px] rounded-xl font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 border transition-all ' +
      (isGood
        ? 'bg-[#17131e] border-slate-700/70 text-slate-400 opacity-75 '
        : 'bg-gradient-to-b from-rose-950/90 to-[#220b12] border-rose-400/60 text-rose-100 active:scale-[0.98] shadow-crimsonring ') +
      (shakeBlocked ? 'translate-x-1 border-amber-400/80' : '');

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
          <ShieldAlert className="w-4 h-4 text-rose-300" />
        )}
        FRACASO
      </button>
    );

    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        <p className="text-[11px] text-center text-[#b8ab92] mb-2">
          {isGood
            ? 'Como caballero leal al Bien, tu juramento solo permite el Éxito.'
            : 'Decide en secreto el destino de esta gesta.'}
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
        <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
          <div className="min-h-[56px] flex items-center justify-center gap-2 text-xs text-cyan-200 font-semibold">
            <Droplets className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>{holder?.nickname} consulta a la Dama del Lago...</span>
          </div>
        </footer>
      );
    }

    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        <p className="text-xs text-center text-cyan-200 mb-2">
          Elige a un caballero no investigado para revelar su bando en secreto.
        </p>
        <button
          type="button"
          disabled={!targetId}
          onClick={() => {
            tapMedium();
            onUseLady();
          }}
          className="w-full min-h-[54px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-azure-crest flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
        >
          <Droplets className="w-4 h-4" />
          Invocar la Dama del Lago
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
        <footer className="p-3 camelot-bar border-t border-rose-500/35 shrink-0">
          <div className="min-h-[56px] flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-rose-400 animate-pulse" />
              ¡El Bien logró 3 gestas! El Asesino apunta hacia Merlín...
            </span>
          </div>
        </footer>
      );
    }

    return (
      <footer className="p-3 camelot-bar border-t border-rose-500/40 shrink-0">
        <p className="text-xs text-center text-rose-200 mb-2">
          Señala en la mesa quién es <strong>Merlín</strong> y asesta el golpe final.
        </p>
        <button
          type="button"
          disabled={!targetId}
          onClick={() => {
            tapMedium();
            onAssassinate();
          }}
          className="w-full min-h-[54px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-crimson-wax flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
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
      'font-display text-sm font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 ' +
      (isGoodWin ? 'text-sky-300' : 'text-rose-300');

    return (
      <footer className="p-3 camelot-bar border-t border-amber-500/35 shrink-0">
        <div className="text-center mb-2.5">
          <div className={titleClasses}>
            <Trophy className="w-4 h-4 text-amber-400" />
            {isGoodWin ? '¡Victoria de Camelot!' : '¡Triunfo de las Sombras!'}
          </div>
          <p className="text-[11px] text-[#d8ccb2] mt-0.5">
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
            className="w-full min-h-[50px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            Volver al Consejo
          </button>
        ) : (
          <p className="text-center text-[11px] text-[#9d917b] italic">
            Aguardando que el anfitrión prepare una nueva partida...
          </p>
        )}
      </footer>
    );
  }

  return null;
};
