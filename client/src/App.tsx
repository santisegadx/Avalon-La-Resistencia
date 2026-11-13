import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { HomeScreen } from './screens/HomeScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { GameScreen } from './screens/GameScreen';
export const App: React.FC = () => {
    const { initSocket, roomState, myPlayerId, toastMessage, clearToast } =
        useGameStore();
    useEffect(() => {
        initSocket();
    }, [initSocket]);
    return (
        <div className="relative h-[100dvh] w-full bg-[#0a0c10] text-slate-100 overflow-hidden">
            {/* Toast flotante global para errores o avisos */}
            {toastMessage && (
                <div
                    onClick={clearToast}
                    className="fixed top-14 left-4 right-4 z-50 max-w-sm mx-auto px-4 py-2.5 rounded-xl bg-slate-900/95 border border-amber-500/70 text-xs font-medium text-amber-200 shadow-2xl text-center"
                >
                    {toastMessage}
                </div>
            )}
            {!roomState || !myPlayerId ? (
                <HomeScreen />
            ) : roomState.room.status === 'LOBBY' ? (
                <LobbyScreen roomState={roomState} myPlayerId={myPlayerId} />
            ) : (
                <GameScreen roomState={roomState} myPlayerId={myPlayerId} />
            )}
        </div>
    );
};
export default App;