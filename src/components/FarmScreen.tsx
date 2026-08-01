import React, { useState, useEffect, useRef } from 'react';
import { PlayerEmoji, FarmEmojiEntity, MeatItem, GameEvent } from '../types';
import { EMOJI_CATALOG } from '../data/emojis';
import { audioSystem } from '../systems/audioSystem';
import { Utensils, Heart, Sparkles, Smile, Info } from 'lucide-react';

interface FarmScreenProps {
  inventory: PlayerEmoji[];
  activeEvent: GameEvent | null;
}

export const FarmScreen: React.FC<FarmScreenProps> = ({ inventory, activeEvent }) => {
  const [farmEmojis, setFarmEmojis] = useState<FarmEmojiEntity[]>([]);
  const [meatList, setMeatList] = useState<MeatItem[]>([]);
  const [selectedEmojiInstance, setSelectedEmojiInstance] = useState<PlayerEmoji | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize farm entities from inventory when inventory changes or on mount
  useEffect(() => {
    const initialEntities: FarmEmojiEntity[] = inventory.slice(0, 12).map((item, idx) => ({
      instanceId: item.instanceId,
      emojiId: item.emojiId,
      x: 100 + (idx * 70) % 600,
      y: 100 + (idx * 50) % 300,
      targetX: 150 + Math.random() * 500,
      targetY: 100 + Math.random() * 250,
      state: 'IDLE',
      stateTimer: Math.floor(Math.random() * 50) + 30,
      speed: 1.2 + Math.random() * 1.5,
      direction: Math.random() > 0.5 ? 'right' : 'left',
      animOffset: Math.random() * 10,
    }));
    setFarmEmojis(initialEntities);
  }, [inventory]);

  // Main autonomous loop for wandering, seeking food, and eating
  useEffect(() => {
    const interval = setInterval(() => {
      setFarmEmojis((prevEntities) => {
        return prevEntities.map((entity) => {
          let { x, y, targetX, targetY, state, stateTimer, direction } = entity;

          // If there is meat and we are idle or wandering, seek food
          if (meatList.length > 0 && (state === 'IDLE' || state === 'WANDERING')) {
            const nearestMeat = meatList[0];
            targetX = nearestMeat.x;
            targetY = nearestMeat.y;
            state = 'SEEKING_FOOD';
          }

          // State machine behavior
          if (state === 'SEEKING_FOOD') {
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 15) {
              // Reached meat!
              state = 'EATING';
              stateTimer = 25; // eating duration ticks
              audioSystem.playSfx('eat');
              // Remove consumed meat
              setMeatList((currentMeat) => currentMeat.slice(1));
            } else {
              x += (dx / dist) * entity.speed * 1.8;
              y += (dy / dist) * entity.speed * 1.8;
              direction = dx > 0 ? 'right' : 'left';
            }
          } else if (state === 'EATING') {
            stateTimer--;
            if (stateTimer <= 0) {
              state = 'HAPPY';
              stateTimer = 35;
              audioSystem.playSfx('happy');
            }
          } else if (state === 'HAPPY') {
            stateTimer--;
            if (stateTimer <= 0) {
              state = 'IDLE';
              stateTimer = Math.floor(Math.random() * 60) + 40;
            }
          } else if (state === 'WANDERING') {
            const dx = targetX - x;
            const dy = targetY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10 || stateTimer <= 0) {
              state = 'IDLE';
              stateTimer = Math.floor(Math.random() * 80) + 40;
            } else {
              x += (dx / dist) * entity.speed;
              y += (dy / dist) * entity.speed;
              direction = dx > 0 ? 'right' : 'left';
            }
          } else {
            // IDLE state
            stateTimer--;
            if (stateTimer <= 0) {
              state = 'WANDERING';
              targetX = Math.max(50, Math.min(750, x + (Math.random() * 200 - 100)));
              targetY = Math.max(50, Math.min(380, y + (Math.random() * 160 - 80)));
              stateTimer = Math.floor(Math.random() * 100) + 50;
            }
          }

          // Boundary enforcement (respecting farm edges)
          x = Math.max(30, Math.min(760, x));
          y = Math.max(40, Math.min(380, y));

          return {
            ...entity,
            x,
            y,
            targetX,
            targetY,
            state,
            stateTimer,
            direction,
          };
        });
      });
    }, 80);

    return () => clearInterval(interval);
  }, [meatList]);

  // Handle clicking on empty space to drop meat
  const handleFarmClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if click target was an emoji or UI button
    const target = e.target as HTMLElement;
    if (target.closest('.emoji-entity') || target.closest('button') || target.closest('.modal-content')) {
      return; // Do not drop meat if clicking emoji or buttons
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 20;
    const y = e.clientY - rect.top - 20;

    audioSystem.playSfx('click');
    const newMeat: MeatItem = {
      id: Math.random().toString(36).substring(2, 9),
      x: Math.max(30, Math.min(750, x)),
      y: Math.max(40, Math.min(380, y)),
      createdAt: Date.now(),
    };

    setMeatList((prev) => [...prev, newMeat]);
  };

  const getCatalogEmoji = (emojiId: string) => {
    return EMOJI_CATALOG.find((e) => e.id === emojiId) || EMOJI_CATALOG[0];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Farm Header Banner */}
      <div className="bg-white/90 backdrop-blur-md p-5 rounded-3xl border border-purple-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <span>🏡 Cozy Emoji Farm</span>
            {activeEvent && <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-bold">{activeEvent.icon} {activeEvent.name} Active</span>}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Click anywhere on the grass to drop meat treats! Emojis will roam, eat, and show happy reactions.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-2xl border border-purple-200 text-xs font-bold text-purple-700">
          <Utensils size={16} />
          <span>Treats Available: {meatList.length}</span>
        </div>
      </div>

      {/* Main Farm Enclosure Canvas */}
      <div
        ref={containerRef}
        onClick={handleFarmClick}
        className="relative w-full h-[450px] rounded-3xl bg-gradient-to-b from-emerald-200 via-green-100 to-emerald-300 border-4 border-emerald-400/60 shadow-inner overflow-hidden cursor-pointer select-none"
      >
        {/* Farm Background Decor (Trees, Ponds, Flowers) */}
        <div className="absolute top-6 left-10 text-3xl opacity-60 select-none">🌲</div>
        <div className="absolute top-12 right-16 text-3xl opacity-60 select-none">🌸</div>
        <div className="absolute bottom-8 left-20 text-4xl opacity-50 select-none">🏡</div>
        <div className="absolute bottom-12 right-24 text-3xl opacity-60 select-none">🍄</div>
        <div className="absolute top-1/2 left-1/3 text-2xl opacity-40 select-none">💧</div>

        {/* Meat Items */}
        {meatList.map((meat) => (
          <div
            key={meat.id}
            className="absolute text-2xl animate-bounce pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20"
            style={{ left: meat.x, top: meat.y }}
          >
            🥩
          </div>
        ))}

        {/* Live Farm Emojis */}
        {farmEmojis.map((entity) => {
          const catalogData = getCatalogEmoji(entity.emojiId);
          return (
            <div
              key={entity.instanceId}
              onClick={(e) => {
                e.stopPropagation();
                audioSystem.playSfx('click');
                const playerItem = inventory.find((i) => i.instanceId === entity.instanceId);
                if (playerItem) setSelectedEmojiInstance(playerItem);
              }}
              className="emoji-entity absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-100 z-30 cursor-pointer group"
              style={{ left: entity.x, top: entity.y }}
            >
              <div className="relative flex flex-col items-center">
                {/* State Reaction Bubble */}
                {entity.state === 'HAPPY' && (
                  <div className="absolute -top-8 bg-white/95 px-2 py-0.5 rounded-full text-xs shadow-md border border-pink-200 flex items-center gap-1 animate-bounce">
                    <Heart size={12} className="text-pink-500 fill-pink-500" />
                    <span className="text-[10px] font-bold text-pink-600">Yummy!</span>
                  </div>
                )}
                {entity.state === 'EATING' && (
                  <div className="absolute -top-8 bg-white/95 px-2 py-0.5 rounded-full text-xs shadow-md border border-amber-200 flex items-center gap-1 animate-pulse">
                    <span className="text-[10px]">😋 Munch...</span>
                  </div>
                )}

                {/* Emoji Character Sprite */}
                <div className={`text-4xl sm:text-5xl drop-shadow-md group-hover:scale-110 transition-transform ${entity.direction === 'left' ? 'scale-x-[-1]' : ''}`}>
                  {catalogData.symbol}
                </div>

                {/* Name Tag */}
                <div className="bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-extrabold text-gray-700 shadow-xs border border-gray-200 mt-1 whitespace-nowrap">
                  {catalogData.name}
                </div>
              </div>
            </div>
          );
        })}

        {farmEmojis.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-emerald-900/10 backdrop-blur-xs">
            <div className="text-5xl mb-3">🐾</div>
            <h3 className="text-lg font-bold text-gray-700">Your Farm is Empty!</h3>
            <p className="text-xs text-gray-600 max-w-xs mt-1">
              Go to the <strong>Catch</strong> screen to capture wild emojis and populate your cozy farm.
            </p>
          </div>
        )}
      </div>

      {/* Emoji Inspection Modal */}
      {selectedEmojiInstance && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="modal-content bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-2 border-purple-200 text-center space-y-4">
            {(() => {
              const cat = getCatalogEmoji(selectedEmojiInstance.emojiId);
              return (
                <>
                  <div className="text-6xl animate-bounce">{cat.symbol}</div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">{cat.name}</h3>
                    <span className="text-xs px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200 mt-1 inline-block">
                      {cat.rarity}
                    </span>
                    <p className="text-xs text-gray-500 mt-2">{cat.description}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2 text-xs font-medium text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Level:</span>
                      <span className="font-bold text-gray-800">Lv. {selectedEmojiInstance.level}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Happiness:</span>
                      <span className="font-bold text-pink-600">❤️ {selectedEmojiInstance.happiness}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hunger:</span>
                      <span className="font-bold text-emerald-600">🍖 {selectedEmojiInstance.hunger}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedEmojiInstance(null)}
                    className="w-full py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition-transform active:scale-95"
                  >
                    Close
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
