import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Compass,
  Copy,
  Crown,
  Droplets,
  LogOut,
  Play,
  QrCode,
  Shield,
  Skull,
  Sparkles,
  UserX,
  Users,
} from 'lucide-react';
import {
  ALIGNMENT_DISTRIBUTION,
  PublicRoomState,
  RoomConfig,
} from '../../../shared/types';
import { useGameStore } from '../store/useGameStore';
import { useHaptics } from '../hooks/useHaptics';
import {
  CornerFiligree,
  MedievalDivider,
} from '../components/MedievalOrnaments';

interface LobbyScreenProps {
  roomState: PublicRoomState;
  myPlayerId: string;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  roomState,
  myPlayerId,
}) => {
  const {
    updateConfig,
    kickPlayer,
    startGame,
    leaveRoom,
    showToast,
  } = useGameStore();
  const { tapLight, tapMedium } = useHaptics();
  const [showQrModal, setShowQrModal] = useState(false);

  const { room, players } = roomState;
  const isHost = room.hostId === myPlayerId;
  const config = room.config;

  const configuredPlayers = Math.max(4, Math.min(10, config.maxPlayers));
  const dist = ALIGNMENT_DISTRIBUTION[configuredPlayers];

  const selectedGoodCount = 1 + (config.optionalRoles.perceval ? 1 : 0);
  const selectedEvilCount =
    1 +
    (config.optionalRoles.morgana ? 1 : 0) +
    (config.optionalRoles.mordred ? 1 : 0) +
    (config.optionalRoles.oberon ? 1 : 0);

  const isEvilOverflow = selectedEvilCount > dist.evil;
  const canStart =
    isHost && players.length === configuredPlayers && !isEvilOverflow;

  const shareUrl = window.location.origin + '/room/' + room.code;

  const handleCopyLink = async () => {
    tapLight();
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Pergamino de invitación copiado al portapapeles.');
    } catch {
      showToast('Código de sala: ' + room.code);
    }
  };

  const handleMaxPlayersChange = (nextMax: number) => {
    if (!isHost || nextMax < players.length) return;
    tapLight();
    const nextDist = ALIGNMENT_DISTRIBUTION[nextMax];
    const nextOptionalRoles = { ...config.optionalRoles };

    let evilCount =
      1 +
      (nextOptionalRoles.morgana ? 1 : 0) +
      (nextOptionalRoles.mordred ? 1 : 0) +
      (nextOptionalRoles.oberon ? 1 : 0);

    for (const key of ['oberon', 'mordred', 'morgana'] as const) {
      if (evilCount <= nextDist.evil) break;
      if (nextOptionalRoles[key]) {
        nextOptionalRoles[key] = false;
        evilCount -= 1;
      }
    }

    void updateConfig({
      ...config,
      maxPlayers: nextMax,
      optionalRoles: nextOptionalRoles,
    });
  };

  const toggleOptionalRole = (key: keyof RoomConfig['optionalRoles']) => {
    if (!isHost) return;
    tapLight();
    const nextValue = !config.optionalRoles[key];
    void updateConfig({
      ...config,
      optionalRoles: {
        ...config.optionalRoles,
        [key]: nextValue,
      },
    });
  };

  const toggleRule = (key: keyof RoomConfig['rules']) => {
    if (!isHost) return;
    tapLight();
    void updateConfig({
      ...config,
      rules: {
        ...config.rules,
        [key]: !config.rules[key],
      },
    });
  };

  const percevalBtnClass =
    'p-2.5 rounded-xl border text-left transition-all ' +
    (config.optionalRoles.perceval
      ? 'bg-gradient-to-br from-sky-950/90 to-[#11192b] border-sky-400/70 text-sky-100 shadow-[0_0_16px_rgba(56,189,248,0.16)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  const morganaBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.morgana
      ? 'bg-gradient-to-br from-rose-950/90 to-[#1c0f18] border-rose-400/70 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.16)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  const mordredBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.mordred
      ? 'bg-gradient-to-br from-rose-950/90 to-[#1c0f18] border-rose-400/70 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.16)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  const oberonBtnClass =
    'p-2.5 rounded-xl border text-left transition-all disabled:opacity-40 ' +
    (config.optionalRoles.oberon
      ? 'bg-gradient-to-br from-rose-950/90 to-[#1c0f18] border-rose-400/70 text-rose-100 shadow-[0_0_16px_rgba(244,63,94,0.16)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  const ladyRuleClass =
    'w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ' +
    (config.rules.ladyOfTheLake
      ? 'bg-gradient-to-r from-cyan-950/75 to-[#101c28] border-cyan-400/65 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.12)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  const targetRuleClass =
    'w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ' +
    (config.rules.targetSelection
      ? 'bg-gradient-to-r from-amber-950/70 to-[#1f170f] border-amber-400/65 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.12)]'
      : 'bg-[#0e0c14] border-amber-500/15 text-[#9d917b]');

  return (
    <div className="h-[100dvh] flex flex-col justify-between max-w-md mx-auto">
      {/* Cabecera Real de la Mesa */}
      <header className="px-4 py-3 camelot-bar border-b border-amber-500/25 flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <h1 className="font-display text-sm font-bold tracking-wide text-amber-200 truncate">
            {room.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-[11px] font-mono text-amber-300 font-bold tracking-[0.18em]">
              {room.code}
            </span>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1d1827] border border-amber-500/20 text-[10px] font-medium text-[#e2d7be] active:scale-95 transition-transform"
            >
              <Copy className="w-3 h-3 text-amber-400/80" /> Copiar
            </button>
            <button
              type="button"
              onClick={() => {
                tapLight();
                setShowQrModal(true);
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1d1827] border border-amber-500/20 text-[10px] font-medium text-amber-300 active:scale-95 transition-transform"
            >
              <QrCode className="w-3 h-3" /> QR
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            tapLight();
            void leaveRoom();
          }}
          title={isHost ? 'Disolver sala' : 'Abandonar sala'}
          className="p-2 rounded-xl bg-[#1a1523] border border-rose-500/25 text-[#c7baa0] hover:text-rose-300 hover:border-rose-400/50 active:scale-95 transition-all"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Cuerpo Scrolleable del Consejo */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Jugadores y Cupo */}
        <section className="relative p-3.5 rounded-2xl camelot-card">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-display text-xs font-bold tracking-wide text-amber-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Caballeros ({players.length}/{configuredPlayers})
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-950/70 border border-sky-400/40 text-sky-300">
                <Shield className="w-2.5 h-2.5" />
                {dist.good} Bien
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/70 border border-rose-400/40 text-rose-300">
                <Skull className="w-2.5 h-2.5" />
                {dist.evil} Mal
              </span>
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#9d917b] font-semibold">
                Tamaño de la Mesa
              </span>
              {!isHost && (
                <span className="text-[10px] text-[#7c705c]">
                  Decide el anfitrión
                </span>
              )}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {[4, 5, 6, 7, 8, 9, 10].map((count) => {
                const isSelected = configuredPlayers === count;
                const isTooLow = count < players.length;
                const countBtnClass =
                  'py-1.5 rounded-lg border text-xs font-mono font-bold transition-all disabled:opacity-35 ' +
                  (isSelected
                    ? 'btn-royal-gold shadow-sm'
                    : 'bg-[#0e0c14] border-amber-500/20 text-[#b8ab92] hover:border-amber-400/45');

                return (
                  <button
                    key={count}
                    type="button"
                    disabled={!isHost || isTooLow}
                    onClick={() => handleMaxPlayersChange(count)}
                    className={countBtnClass}
                  >
                    {count}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {players.map((p) => {
              const dotClass =
                'w-2 h-2 rounded-full shrink-0 ' +
                (p.isConnected
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                  : 'bg-rose-500');

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-[#0e0c14]/95 border border-amber-500/15"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={dotClass} />
                    <span className="text-xs font-semibold text-[#f3ebd8] truncate">
                      {p.nickname}
                    </span>
                    {p.id === room.hostId && (
                      <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>

                  {isHost && p.id !== myPlayerId && (
                    <button
                      type="button"
                      onClick={() => {
                        tapLight();
                        void kickPlayer(p.id);
                      }}
                      className="p-1 text-[#7c705c] hover:text-rose-400 transition-colors"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {players.length < configuredPlayers && (
            <p className="text-[11px] text-amber-300/90 mt-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              Faltan {configuredPlayers - players.length} caballero(s) para completar los {configuredPlayers} cupos.
            </p>
          )}
        </section>

        {/* Roles Especiales */}
        <section className="p-3.5 rounded-2xl camelot-card space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-xs font-bold tracking-wide text-amber-200">
              Personajes de Leyenda
            </span>
            <span className="text-[10px] text-[#9d917b]">
              Merlín y Asesino fijos
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isHost}
              onClick={() => toggleOptionalRole('perceval')}
              className={percevalBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold">Perceval</span>
                <Shield className="w-3.5 h-3.5 text-sky-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Bien ({selectedGoodCount}/{dist.good})
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.morgana && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('morgana')}
              className={morganaBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold">Morgana</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Mal ({selectedEvilCount}/{dist.evil})
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.mordred && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('mordred')}
              className={mordredBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold">Mordred</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Oculto a Merlín
              </span>
            </button>

            <button
              type="button"
              disabled={!isHost || (!config.optionalRoles.oberon && selectedEvilCount >= dist.evil)}
              onClick={() => toggleOptionalRole('oberon')}
              className={oberonBtnClass}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold">Oberón</span>
                <Skull className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <span className="text-[10px] block mt-0.5 opacity-80">
                Ciego al Mal
              </span>
            </button>
          </div>
          {isEvilOverflow && (
            <p className="text-[11px] text-rose-400">
              Demasiados roles especiales del Mal para {configuredPlayers} jugadores (máx {dist.evil}).
            </p>
          )}
        </section>

        {/* Edictos Opcionales */}
        <section className="p-3.5 rounded-2xl camelot-card space-y-2">
          <span className="font-display text-xs font-bold tracking-wide text-amber-200 block">
            Edictos Opcionales
          </span>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => toggleRule('ladyOfTheLake')}
            className={ladyRuleClass}
          >
            <div className="flex items-center gap-2.5">
              <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">La Dama del Lago</div>
                <div className="text-[10px] opacity-80">
                  Revela la lealtad tras las gestas 2, 3 y 4.
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-400/30 bg-black/20">
              {config.rules.ladyOfTheLake ? 'ACTIVA' : 'NO'}
            </span>
          </button>

          <button
            type="button"
            disabled={!isHost}
            onClick={() => toggleRule('targetSelection')}
            className={targetRuleClass}
          >
            <div className="flex items-center gap-2.5">
              <Compass className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-bold">Elección del Objetivo</div>
                <div className="text-[10px] opacity-80">
                  El Líder elige qué gesta pendiente emprender.
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-400/30 bg-black/20">
              {config.rules.targetSelection ? 'ACTIVA' : 'NO'}
            </span>
          </button>
        </section>
      </div>

      {/* Pie de Comienzo */}
      <footer className="p-3 camelot-bar border-t border-amber-500/25 shrink-0">
        {isHost ? (
          <button
            type="button"
            disabled={!canStart}
            onClick={() => {
              tapMedium();
              void startGame();
            }}
            className="w-full min-h-[54px] rounded-xl font-display font-bold text-sm tracking-wider uppercase btn-royal-gold flex items-center justify-center gap-2 active:scale-[0.985] transition-transform"
          >
            <Play className="w-4 h-4 fill-current" />
            Iniciar Partida ({players.length}/{configuredPlayers})
          </button>
        ) : (
          <div className="min-h-[54px] flex items-center justify-center text-xs text-[#afa28a] italic">
            Aguardando que el anfitrión alce el estandarte...
          </div>
        )}
      </footer>

      {/* Modal QR de Invitación */}
      {showQrModal && (
        <div
          onClick={() => setShowQrModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/85 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative p-6 rounded-2xl camelot-card text-center space-y-4 max-w-xs w-full"
          >
            <CornerFiligree />
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-amber-400/80 mb-1">
                Convocatoria Real
              </p>
              <h3 className="font-display text-sm font-bold text-amber-100">
                {room.name}
              </h3>
            </div>
            <MedievalDivider />
            <div className="p-3.5 bg-[#f7f0df] rounded-xl inline-block border-2 border-amber-500/60 shadow-goldring">
              <QRCodeSVG value={shareUrl} size={172} bgColor="#f7f0df" fgColor="#15111c" />
            </div>
            <div className="text-xl font-mono font-extrabold text-amber-300 tracking-[0.28em]">
              {room.code}
            </div>
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#1e1928] border border-amber-500/30 text-xs font-bold text-amber-200 active:scale-95 transition-transform"
            >
              Cerrar Pergamino
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
