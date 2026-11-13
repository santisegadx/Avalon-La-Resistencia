import React, { useEffect, useState } from 'react';
import { Crown, LogIn, PlusCircle, Shield } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { useHaptics } from '../hooks/useHaptics';

export const HomeScreen: React.FC = () => {
  const { createRoom, joinRoom, isConnected, isReconnecting } = useGameStore();
  const { tapMedium } = useHaptics();

  const [mode, setMode] = useState<'JOIN' | 'CREATE'>('JOIN');
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [roomName, setRoomName] = useState('Mesa de Camelot');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/room\/([A-Za-z0-9]{4,6})$/i);
    if (match) {
      setMode('JOIN');
      setRoomCode(match[1].toUpperCase());
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    tapMedium();
    setSubmitting(true);

    if (mode === 'CREATE') {
      await createRoom(nickname, roomName);
    } else {
      await joinRoom(roomCode, nickname);
    }
    setSubmitting(false);
  };

  if (isReconnecting) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#0a0c10] text-center">
        <Shield className="w-10 h-10 text-amber-400 animate-pulse mb-3" />
        <p className="text-sm font-semibold text-slate-200">
          Restaurando tu asiento en la mesa...
        </p>
      </div>
    );
  }

  const joinTabClass =
    'py-2 rounded-lg text-xs font-bold transition-colors ' +
    (mode === 'JOIN' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200');

  const createTabClass =
    'py-2 rounded-lg text-xs font-bold transition-colors ' +
    (mode === 'CREATE' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200');

  const statusDotClass =
    'w-2 h-2 rounded-full ' + (isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-pulse');

  return (
    <div className="h-[100dvh] flex flex-col justify-between p-5 bg-[#0a0c10] max-w-md mx-auto">
      <div className="pt-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/40 mb-3">
          <Crown className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-100">
          La Resistencia: <span className="text-amber-400">Ávalon</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deducción social multijugador · Cero componentes físicos
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-[#12151e] border border-slate-800 shadow-xl">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-4">
          <button
            type="button"
            onClick={() => setMode('JOIN')}
            className={joinTabClass}
          >
            Unirse a Sala
          </button>
          <button
            type="button"
            onClick={() => setMode('CREATE')}
            className={createTabClass}
          >
            Crear Sala
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Tu Apodo en la Mesa
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={16}
              placeholder="Ej. Arturo, Morgana..."
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          {mode === 'JOIN' ? (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Código de Sala
              </label>
              <input
                type="text"
                required
                minLength={4}
                maxLength={6}
                placeholder="EJ. AVLN42"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-base font-mono uppercase tracking-widest text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Nombre de la Sala
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={28}
                placeholder="Mesa de Camelot"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isConnected || submitting}
            className="w-full min-h-[52px] mt-2 rounded-xl font-bold text-sm bg-amber-500 text-slate-950 disabled:bg-slate-800 disabled:text-slate-500 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
          >
            {mode === 'CREATE' ? (
              <>
                <PlusCircle className="w-4 h-4" />
                {submitting ? 'Creando...' : 'Crear Nueva Sala'}
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                {submitting ? 'Entrando...' : 'Entrar a la Sala'}
              </>
            )}
          </button>
        </form>
      </div>

      <footer className="pb-2 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className={statusDotClass} />
          {isConnected ? 'Conectado al servidor de Ávalon' : 'Conectando...'}
        </span>
      </footer>
    </div>
  );
};