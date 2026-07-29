import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { castNetwork } from './MainMenu';
import { ANT_TYPES, AntType } from '../types';

export default function CastView() {
  const [pin, setPin] = useState('');
  const [connected, setConnected] = useState(false);
  const selectedAnt = useAppStore(state => state.selectedAnt);
  const setSelectedAnt = useAppStore(state => state.setSelectedAnt);

  useEffect(() => {
    castNetwork.onConnectCallback = () => {
      setConnected(true);
      // Send initial ant type
      castNetwork.sendData('change_ant', { antType: selectedAnt });
    };
    castNetwork.onDisconnectCallback = () => {
      setConnected(false);
    };
  }, [selectedAnt]);

  const connect = () => {
    if (pin.length === 4) {
      castNetwork.connectToHost(pin);
    }
  };

  const selectAnt = (type: AntType) => {
    setSelectedAnt(type);
    if (connected) {
      castNetwork.sendData('change_ant', { antType: type });
    }
  };

  const handleMove = (action: string, active: boolean) => {
    if (connected) {
      castNetwork.sendData('move', { action, active });
    }
  };

  const handleAction = (action: string) => {
    if (connected) {
      castNetwork.sendData('action', { action });
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-6 font-mono text-white">
        <div className="w-full max-w-sm bg-neutral-800 p-8 rounded-2xl shadow-xl border border-neutral-700">
          <h2 className="text-2xl font-black mb-6 text-center text-emerald-400">CONNECT TO HOST</h2>
          <input 
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value.toUpperCase())}
            placeholder="ENTER 4-DIGIT PIN"
            maxLength={4}
            className="w-full bg-neutral-900 border-2 border-neutral-600 rounded-lg py-4 px-6 text-3xl font-black text-center tracking-widest text-white mb-6 focus:border-emerald-500 focus:outline-none"
          />
          <button 
            onClick={connect}
            disabled={pin.length !== 4}
            className="w-full py-4 bg-emerald-600 disabled:bg-neutral-700 disabled:text-neutral-500 hover:bg-emerald-500 text-white font-bold text-xl rounded-lg transition-colors"
          >
            CONNECT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col select-none touch-none">
      {/* Top Bar: Ant Selection */}
      <div className="flex-none p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between overflow-x-auto gap-4 scrollbar-hide">
        {Object.values(ANT_TYPES).map((ant) => (
          <button
            key={ant.type}
            onClick={() => selectAnt(ant.type)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-bold capitalize border-2 transition-all ${
              selectedAnt === ant.type 
                ? 'bg-neutral-700 border-white text-white' 
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            <span 
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: ant.color }}
            ></span>
            {ant.type}
          </button>
        ))}
      </div>

      {/* Controller Area */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between p-8 gap-8 relative">
        
        {/* D-PAD */}
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex-shrink-0">
          <div className="absolute inset-0 bg-neutral-900 rounded-full border-4 border-neutral-800"></div>
          
          <button 
            className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-20 bg-neutral-700 hover:bg-neutral-600 active:bg-emerald-500 rounded-t-lg transition-colors"
            onPointerDown={() => handleMove('up', true)}
            onPointerUp={() => handleMove('up', false)}
            onPointerLeave={() => handleMove('up', false)}
          />
          <button 
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-16 h-20 bg-neutral-700 hover:bg-neutral-600 active:bg-emerald-500 rounded-b-lg transition-colors"
            onPointerDown={() => handleMove('down', true)}
            onPointerUp={() => handleMove('down', false)}
            onPointerLeave={() => handleMove('down', false)}
          />
          <button 
            className="absolute left-2 top-1/2 -translate-y-1/2 w-20 h-16 bg-neutral-700 hover:bg-neutral-600 active:bg-emerald-500 rounded-l-lg transition-colors"
            onPointerDown={() => handleMove('left', true)}
            onPointerUp={() => handleMove('left', false)}
            onPointerLeave={() => handleMove('left', false)}
          />
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-20 h-16 bg-neutral-700 hover:bg-neutral-600 active:bg-emerald-500 rounded-r-lg transition-colors"
            onPointerDown={() => handleMove('right', true)}
            onPointerUp={() => handleMove('right', false)}
            onPointerLeave={() => handleMove('right', false)}
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-neutral-800 rounded-full"></div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0 w-48 sm:w-64">
          <button
            onPointerDown={() => handleAction('bite')}
            className="aspect-square bg-red-600 active:bg-red-500 rounded-full border-4 border-red-800 shadow-lg shadow-red-900/50 font-black text-2xl"
          >
            BITE
          </button>
          <button
            onPointerDown={() => handleAction('drop')}
            className="aspect-square bg-amber-600 active:bg-amber-500 rounded-full border-4 border-amber-800 shadow-lg shadow-amber-900/50 font-black text-xl"
          >
            DROP
          </button>
          <button
            onPointerDown={() => handleAction('dash')}
            className="col-span-2 py-6 bg-blue-600 active:bg-blue-500 rounded-full border-4 border-blue-800 shadow-lg shadow-blue-900/50 font-black text-2xl"
          >
            DASH
          </button>
        </div>

      </div>
    </div>
  );
}
