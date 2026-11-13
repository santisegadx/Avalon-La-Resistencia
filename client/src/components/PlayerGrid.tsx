import React from 'react';
import {
  Check,
  Crown,
  Droplets,
  Eye,
  HelpCircle,
  Shield,
  Skull,
  WifiOff,
} from 'lucide-react';
import {
  GamePhase,
  Player,
  PlayerVision,
  PublicRoomState,
} from '../../../shared/types';
import { useHaptics } from '../hooks/useHaptics';
import { ROLE_METADATA } from '../utils/roleLabels';

interface PlayerGridProps {
  players: Player[];
  myPlayerId: string;
  phase: GamePhase;
  leaderIndex: number;
  ladyHolderId: string | null;
  activeProposal: PublicRoomState['gameState']['activeProposal'];
  winner: PublicRoomState['gameState']['winner'];
  privateVision: PlayerVision | null;
  isPeeking: boolean;
  selectedPlayerIds: string[];
  onTogglePlayerSelect: (playerId: string) => void;
}

const SEAT_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  players,
  myPlayerId,
  phase,
  leaderIndex,
  ladyHolderId,
  activeProposal,
  winner,
  privateVision,
  isPeeking,
  selectedPlayerIds,
  onTogglePlayerSelect,
}) => {
  const { tapLight } = useHaptics();
  const currentLeader = players[leaderIndex];

  const isLeaderSelecting =
    phase === 'TEAM_SELECTION' && currentLeader?.id === myPlayerId;
  const isLadySelecting =
    phase === 'LADY_OF_THE_LAKE' && ladyHolderId === myPlayerId;
  const isAssassinSelecting =
    phase === 'ASSASSINATION' && privateVision?.myRole === 'ASSASSIN';

  const canInteractWithCards =
    isLeaderSelecting || isLadySelecting || isAssassinSelecting;

  const getSecretOverlay = (targetId: string) => {
    if (!isPeeking || !privateVision) return null;

    const known = privateVision.knownPlayers.find((k) => k.playerId === targetId);
    const ladyReveal = privateVision.ladyReveals.find((l) => l.targetId === targetId);

    if (known) {
      if (known.tag === 'EVIL_TEAMMATE') {
        return {
          label: 'Aliado del Mal',
          badgeClass: 'bg-rose-950/90 border-rose-400/80 text-rose-200',
          icon: <Skull className="w-3 h-3 text-rose-400" />,
        };
      }
      if (known.tag === 'KNOWN_EVIL') {
        return {
          label: 'Agente del Mal',
          badgeClass: 'bg-rose-950/90 border-rose-400/80 text-rose-200',
          icon: <Eye className="w-3 h-3 text-rose-400" />,
        };
      }
      if (known.tag === 'POSSIBLE_MERLIN') {
        return {
          label: '¿Merlín / Morgana?',
          badgeClass: 'bg-purple-950/90 border-purple-400/80 text-purple-200',
          icon: <HelpCircle className="w-3 h-3 text-purple-300" />,
        };
      }
    }

    if (ladyReveal) {
      return ladyReveal.alignment === 'GOOD'
        ? {
            label: 'Dama: BIEN',
            badgeClass: 'bg-sky-950/90 border-sky-400/80 text-sky-200',
            icon: <Droplets className="w-3 h-3 text-sky-300" />,
          }
        : {
            label: 'Dama: MAL',
            badgeClass: 'bg-rose-950/90 border-rose-400/80 text-rose-200',
            icon: <Droplets className="w-3 h-3 text-rose-400" />,
          };
    }

    return null;
  };

  const gridClasses =
    'grid gap-2 h-full max-h-[470px] ' +
    (players.length <= 6 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3');

  return (
    <main className="flex-1 min-h-0 px-3 py-2 flex flex-col justify-center overflow-hidden">
      <div className={gridClasses}>
        {players.map((player) => {
          const isMe = player.id === myPlayerId;
          const isLeader = currentLeader?.id === player.id;
          const hasLady = ladyHolderId === player.id;

          const inProposedTeam =
            phase === 'TEAM_SELECTION'
              ? isLeaderSelecting
                ? selectedPlayerIds.includes(player.id)
                : activeProposal?.teamIds.includes(player.id) ?? false
              : activeProposal?.teamIds.includes(player.id) ?? false;

          const isTargetSelected =
            (isLadySelecting || isAssassinSelecting) &&
            selectedPlayerIds.includes(player.id);

          const hasVotedInPhase =
            (phase === 'REVEAL_ROLES' && player.isReady) ||
            (phase === 'TEAM_VOTE' &&
              (activeProposal?.votesSubmittedIds.includes(player.id) ?? false));

          const isDisabledTarget =
            (isLadySelecting && (player.id === myPlayerId || player.investigatedByLady)) ||
            (isAssassinSelecting && player.id === myPlayerId);

          const secretOverlay = getSecretOverlay(player.id);
          const gameOverRole =
            phase === 'GAME_OVER' && winner?.revealedRoles
              ? winner.revealedRoles[player.id]
              : null;

          let cardSurface =
            'border-amber-500/20 bg-gradient-to-b from-[#1a1624] to-[#120f19]';
          if (inProposedTeam || isTargetSelected) {
            cardSurface =
              'border-amber-400 bg-gradient-to-b from-amber-950/60 to-[#1f160c] shadow-goldring';
          } else if (isLeader) {
            cardSurface =
              'border-amber-400/50 bg-gradient-to-b from-[#201929] to-[#14101b]';
          } else if (isMe) {
            cardSurface =
              'border-amber-500/35 bg-gradient-to-b from-[#1e1a2a] to-[#14111c]';
          }

          const cardClasses =
            'relative flex flex-col justify-between p-2.5 rounded-xl border text-left transition-all ' +
            cardSurface +
            ' ' +
            (canInteractWithCards && !isDisabledTarget
              ? 'cursor-pointer active:scale-[0.975] '
              : 'cursor-default ') +
            (isDisabledTarget ? 'opacity-40' : '');

          const gameOverBadgeClass = gameOverRole
            ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-display font-bold ' +
              (gameOverRole.alignment === 'GOOD'
                ? 'bg-sky-950/75 border-sky-400/60 text-sky-200'
                : 'bg-rose-950/75 border-rose-400/60 text-rose-200')
            : '';

          return (
            <button
              key={player.id}
              type="button"
              disabled={!canInteractWithCards || isDisabledTarget}
              onClick={() => {
                if (canInteractWithCards && !isDisabledTarget) {
                  tapLight();
                  onTogglePlayerSelect(player.id);
                }
              }}
              className={cardClasses}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-[#f4ecda] truncate">
                      {player.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-400/35 text-amber-300 font-semibold shrink-0">
                        TÚ
                      </span>
                    )}
                    {!player.isConnected && (
                      <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {isLeader && (
                    <span
                      title="Líder actual"
                      className="p-1 rounded-md bg-amber-500/20 border border-amber-400/60 text-amber-300"
                    >
                      <Crown className="w-3 h-3" />
                    </span>
                  )}
                  {inProposedTeam && (
                    <span
                      title="En la comitiva"
                      className="p-1 rounded-md bg-sky-500/20 border border-sky-400/60 text-sky-300"
                    >
                      <Shield className="w-3 h-3" />
                    </span>
                  )}
                  {hasLady && (
                    <span
                      title="Porta la Dama del Lago"
                      className="p-1 rounded-md bg-cyan-500/20 border border-cyan-400/60 text-cyan-300"
                    >
                      <Droplets className="w-3 h-3" />
                    </span>
                  )}
                  {hasVotedInPhase && (
                    <span
                      title="Listo / Votó"
                      className="p-1 rounded-md bg-emerald-500/20 border border-emerald-400/60 text-emerald-300"
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1.5 min-h-[20px] flex items-center justify-between">
                {secretOverlay ? (
                  <span
                    className={
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[10px] font-semibold ' +
                      secretOverlay.badgeClass
                    }
                  >
                    {secretOverlay.icon}
                    {secretOverlay.label}
                  </span>
                ) : gameOverRole ? (
                  <span className={gameOverBadgeClass}>
                    {ROLE_METADATA[gameOverRole.role].name}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#8f836c] font-mono">
                    Sitial {SEAT_ROMAN[player.seatIndex] ?? `#${player.seatIndex + 1}`}
                    {player.investigatedByLady ? ' · Dama ✓' : ''}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
};
