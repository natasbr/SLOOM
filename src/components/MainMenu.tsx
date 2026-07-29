import React from 'react';
import { useAppStore } from '../store';
import { NetworkManager } from '../network';
import { useGameStore } from '../gameStore';
import { Tv, Gamepad2 } from 'lucide-react';

export const hostNetwork1 = new NetworkManager();
export const hostNetwork2 = new NetworkManager();
export const castNetwork = new NetworkManager();

export default function MainMenu() {
  const setView = useAppStore((state) => state.setView);
  const setPins = useAppStore((state) => state.setPins);
  const setPlayerConnected = useAppStore((state) => state.setPlayerConnected);
  const initPlayer = useGameStore((state) => state.initPlayer);
  const doPlayerAction = useGameStore((state) => state.doPlayerAction);
  const updatePlayerMovement = useGameStore((state) => state.updatePlayerMovement);
  const updatePlayerAntType = useGameStore((state) => state.updatePlayerAntType);

  const startHost = () => {
    const pin1 = hostNetwork1.generateRandomId();
    const pin2 = hostNetwork2.generateRandomId();
    
    setPins(pin1, pin2);
    
    hostNetwork1.createHost(pin1);
    hostNetwork2.createHost(pin2);

    const handleData = (playerNum: 1 | 2) => (data: any) => {
      if (data.type === 'move') {
        updatePlayerMovement(playerNum, data.payload.action, data.payload.active);
      } else if (data.type === 'action') {
        doPlayerAction(playerNum, data.payload.action);
      } else if (data.type === 'change_ant') {
        updatePlayerAntType(playerNum, data.payload.antType);
      }
    };

    hostNetwork1.onDataCallback = handleData(1);
    hostNetwork2.onDataCallback = handleData(2);

    hostNetwork1.onConnectCallback = () => {
      setPlayerConnected(1, true);
      initPlayer(1);
    };
    hostNetwork2.onConnectCallback = () => {
      setPlayerConnected(2, true);
      initPlayer(2);
    };

    hostNetwork1.onDisconnectCallback = () => setPlayerConnected(1, false);
    hostNetwork2.onDisconnectCallback = () => setPlayerConnected(2, false);

    setView('host');
  };

  const startCast = () => {
    castNetwork.createClient();
    setView('cast');
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 flex items-center justify-center font-mono">
      <div className="max-w-md w-full p-8 bg-neutral-800 rounded-xl shadow-2xl border border-neutral-700">
        <h1 className="text-4xl font-black text-center mb-2 text-green-400">VOXEL ANTS</h1>
        <p className="text-center text-neutral-400 mb-8">Multiplayer Sandbox Experience</p>
        
        <div className="space-y-4">
          <button 
            onClick={startHost}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xl flex items-center justify-center gap-3 transition-colors"
          >
            <Tv size={28} />
            Start as HOST (Display)
          </button>
          
          <button 
            onClick={startCast}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xl flex items-center justify-center gap-3 transition-colors"
          >
            <Gamepad2 size={28} />
            Join as CAST (Controller)
          </button>
        </div>
      </div>
    </div>
  );
}
