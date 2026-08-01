import React, { useState, useEffect } from 'react';
import { EmojiData, GameEvent, PlayerEmoji, Rarity } from '../types';
import { EMOJI_CATALOG } from '../data/emojis';
import { calculateAdjustedChance } from '../systems/eventSystem';
import { audioSystem } from '../systems/audioSystem';
import confetti from 'canvas-confetti';
import { Sparkles, MapPin, Compass, RefreshCw, Award, Heart } from 'lucide-react';

interface OverworldScreenProps {
  activeEvent: GameEvent | null;
  onCaptureEmoji: (emoji: EmojiData) => void;
  inventory: PlayerEmoji[];
}

export const OverworldScreen: React.FC<OverworldScreenProps> = ({
  activeEvent,
  onCaptureEmoji,
  inventory,
}) => {
  const [selectedBiome, setSelectedBiome] = useState<'Forest' | 'Volcano' | 'Crystal' | 'Sky'>('Forest');
  const [wildEmojis, setWildEmojis] = useState<EmojiData[]>([]);
  const [activeTarget, setActiveTarget] = useState<EmojiData | null>(null);
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'throwing' | 'success' | 'failed'>('idle');
  const [message, setMessage] = useState<string>('Explore the biome and tap wild emojis to catch them!');

  // Spawn wild emojis based on biome and rarity
  const spawnWild = () => {
    audioSystem.playSfx('spawn');
    const biomeCatalog = EMOJI_CATALOG.filter(e => e.biome === selectedBiome || e.biome === 'Forest');
    const spawned: EmojiData[] = [];
    
    // Pick 3-4 random emojis
    for (let i = 0; i < 4; i++) {
      const rand = Math.random();
      let pool = biomeCatalog;
      if (activeEvent && rand < 0.4) {
        // Boost rare/epic/legendary during events
        pool = biomeCatalog.filter(e => e.rarity === 'Rare' || e.rarity === 'Epic' || e.rarity === 'Legendary');
        if (pool.length === 0) pool = biomeCatalog;
      }
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      spawned.push(chosen);
    }
    setWildEmojis(spawned);
    setMessage(`New wild emojis appeared in the ${selectedBiome}!`);
  };

  useEffect(() => {
    spawnWild();
  }, [selectedBiome]);

  const handleAttemptCapture = (emoji: EmojiData) => {
    audioSystem.playSfx('click');
    setActiveTarget(emoji);
    setCaptureStatus('idle');
  };

  const executeCapture = () => {
    if (!activeTarget) return;
    setCaptureStatus('throwing');
    audioSystem.playSfx('spawn');

    setTimeout(() => {
      const adjustedChance = calculateAdjustedChance(activeTarget.baseCatchChance, activeTarget.rarity, activeEvent);
      const roll = Math.random();

      if (roll <= adjustedChance) {
        setCaptureStatus('success');
        audioSystem.playSfx('capture');
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onCaptureEmoji(activeTarget);
        setMessage(`Success! You caught a ${activeTarget.name} (${activeTarget.symbol})!`);
      } else {
        setCaptureStatus('failed');
        audioSystem.playSfx('error');
        setMessage(`Oh no! The ${activeTarget.name} escaped back into the wild!`);
      }
    }, 1000);
  };

  const getRarityBadgeStyle = (rarity: Rarity) => {
    switch (rarity) {
      case 'Legendary': return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'Epic': return 'bg-purple-100 text-purple-800 border-purple-300 font-bold';
      case 'Rare': return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case 'Uncommon': return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getBiomeBg = () => {
    switch (selectedBiome) {
      case 'Volcano': return 'from-amber-50 via-orange-50 to-red-100 border-orange-200';
      case 'Crystal': return 'from-cyan-50 via-sky-50 to-blue-100 border-cyan-200';
      case 'Sky': return 'from-indigo-50 via-purple-50 to-pink-100 border-purple-200';
      default: return 'from-emerald-50 via-green-50 to-teal-100 border-emerald-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Biome Selection Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-3xl border border-purple-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Compass className="text-purple-600 animate-spin-slow" size={24} />
          <h2 className="text-lg font-black text-gray-800">Explore Biomes</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['Forest', 'Volcano', 'Crystal', 'Sky'] as const).map(biome => (
            <button
              key={biome}
              onClick={() => {
                audioSystem.playSfx('click');
                setSelectedBiome(biome);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedBiome === biome
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MapPin size={14} />
              <span>{biome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Exploration Stage */}
      <div className={`relative min-h-[420px] rounded-3xl bg-gradient-to-b ${getBiomeBg()} border-2 p-6 flex flex-col justify-between shadow-inner overflow-hidden`}>
        {/* Top Status & Refresh */}
        <div className="flex justify-between items-center z-10">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-xs border border-purple-100 flex items-center gap-2">
            <Sparkles className="text-amber-500" size={18} />
            <span className="text-xs font-bold text-gray-700">{message}</span>
          </div>
          <button
            onClick={spawnWild}
            className="flex items-center gap-2 bg-white/90 hover:bg-white px-4 py-2 rounded-2xl shadow-sm text-xs font-bold text-purple-700 border border-purple-200 transition-transform active:scale-95"
          >
            <RefreshCw size={14} />
            <span>Search Area</span>
          </button>
        </div>

        {/* Wild Emojis Display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-8 z-10">
          {wildEmojis.map((emoji, idx) => {
            const adjustedChance = calculateAdjustedChance(emoji.baseCatchChance, emoji.rarity, activeEvent);
            return (
              <div
                key={`${emoji.id}-${idx}`}
                onClick={() => handleAttemptCapture(emoji)}
                className="group bg-white/90 hover:bg-white backdrop-blur-md rounded-3xl p-5 border-2 border-purple-100 hover:border-purple-400 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center cursor-pointer transform hover:-translate-y-1.5"
              >
                <div className="text-5xl mb-3 group-hover:scale-125 transition-transform animate-bounce">
                  {emoji.symbol}
                </div>
                <h3 className="font-extrabold text-gray-800 text-sm mb-1">{emoji.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border mb-2 ${getRarityBadgeStyle(emoji.rarity)}`}>
                  {emoji.rarity}
                </span>
                <span className="text-[11px] font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-xl">
                  Catch Chance: {Math.round(adjustedChance * 100)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer Hint */}
        <div className="text-center text-xs font-medium text-gray-500 z-10">
          Tip: Active events boost rare and legendary emoji appearance rates! Total emojis collected: {inventory.length}
        </div>
      </div>

      {/* Capture Modal */}
      {activeTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-4 border-purple-200 text-center space-y-6">
            <div className="text-7xl animate-bounce">{activeTarget.symbol}</div>
            <div>
              <h3 className="text-2xl font-black text-gray-800">{activeTarget.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{activeTarget.description}</p>
            </div>

            <div className="flex justify-center gap-3">
              <span className={`text-xs px-3 py-1 rounded-full border ${getRarityBadgeStyle(activeTarget.rarity)}`}>
                {activeTarget.rarity}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Chance: {Math.round(calculateAdjustedChance(activeTarget.baseCatchChance, activeTarget.rarity, activeEvent) * 100)}%
              </span>
            </div>

            {captureStatus === 'idle' && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setActiveTarget(null)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors"
                >
                  Run Away
                </button>
                <button
                  onClick={executeCapture}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>Throw Treat!</span>
                </button>
              </div>
            )}

            {captureStatus === 'throwing' && (
              <div className="py-4 text-purple-600 font-bold animate-pulse text-sm">
                Throwing treat... Hold tight! 🌟
              </div>
            )}

            {captureStatus === 'success' && (
              <div className="space-y-4">
                <div className="bg-emerald-50 text-emerald-800 font-bold p-3 rounded-2xl text-sm border border-emerald-200">
                  🎉 Gotcha! Added to your Farm inventory!
                </div>
                <button
                  onClick={() => setActiveTarget(null)}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md"
                >
                  Awesome! Continue
                </button>
              </div>
            )}

            {captureStatus === 'failed' && (
              <div className="space-y-4">
                <div className="bg-rose-50 text-rose-800 font-bold p-3 rounded-2xl text-sm border border-rose-200">
                  💨 Oh no! The emoji slipped away!
                </div>
                <button
                  onClick={() => setActiveTarget(null)}
                  className="w-full py-3 rounded-2xl bg-gray-600 hover:bg-gray-700 text-white font-extrabold text-sm shadow-md"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
