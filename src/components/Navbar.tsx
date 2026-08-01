import React from 'react';
import { ScreenType, GameEvent } from '../types';
import { Sparkles, Home, Repeat, Calendar, Volume2, VolumeX, ShieldAlert } from 'lucide-react';
import { audioSystem } from '../systems/audioSystem';

interface NavbarProps {
  currentScreen: ScreenType;
  setScreen: (screen: ScreenType) => void;
  activeEvent: GameEvent | null;
  audioSettings: { bgmEnabled: boolean; sfxEnabled: boolean };
  onToggleAudio: () => void;
  inventoryCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentScreen,
  setScreen,
  activeEvent,
  audioSettings,
  onToggleAudio,
  inventoryCount,
}) => {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-purple-100 sticky top-0 z-50 px-4 py-3 shadow-xs">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setScreen('overworld')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-xl shadow-md animate-pulse">
            🐾
          </div>
          <div>
            <h1 className="text-xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Emoji Capture
            </h1>
            <p className="text-xs text-gray-500 font-medium">Catch, Feed & Trade</p>
          </div>
        </div>

        {/* Active Event Badge */}
        {activeEvent && (
          <div 
            onClick={() => setScreen('events')}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm cursor-pointer hover:scale-105 transition-transform"
          >
            <span>{activeEvent.icon}</span>
            <span>{activeEvent.name} ({activeEvent.rarityMultiplier}x Rarity!)</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl">
          <button
            onClick={() => {
              audioSystem.playSfx('click');
              setScreen('overworld');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentScreen === 'overworld'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <Sparkles size={16} />
            <span>Catch ({inventoryCount})</span>
          </button>

          <button
            onClick={() => {
              audioSystem.playSfx('click');
              setScreen('farm');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentScreen === 'farm'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <Home size={16} />
            <span>Farm</span>
          </button>

          <button
            onClick={() => {
              audioSystem.playSfx('click');
              setScreen('trade');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentScreen === 'trade'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <Repeat size={16} />
            <span>Trade</span>
          </button>

          <button
            onClick={() => {
              audioSystem.playSfx('click');
              setScreen('events');
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              currentScreen === 'events'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-purple-600'
            }`}
          >
            <Calendar size={16} />
            <span>Events</span>
          </button>
        </nav>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            audioSystem.playSfx('click');
            onToggleAudio();
          }}
          className="p-2.5 rounded-xl bg-gray-100 hover:bg-purple-100 text-gray-700 transition-colors"
          title="Toggle Audio"
        >
          {audioSettings.bgmEnabled || audioSettings.sfxEnabled ? (
            <Volume2 size={18} className="text-purple-600" />
          ) : (
            <VolumeX size={18} className="text-gray-400" />
          )}
        </button>
      </div>
    </header>
  );
};
