import React from 'react';
import { GameEvent } from '../types';
import { audioSystem } from '../systems/audioSystem';
import { Calendar, Sparkles, Clock, Flame, Zap } from 'lucide-react';

interface EventsScreenProps {
  events: GameEvent[];
  onToggleEvent: (eventId: string) => void;
}

export const EventsScreen: React.FC<EventsScreenProps> = ({ events, onToggleEvent }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-purple-100 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Calendar className="text-purple-600" size={24} />
            <span>Temporary World Events</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            During active events, rare and legendary emojis experience significant rarity spawn boosts!
          </p>
        </div>
      </div>

      {/* Events List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {events.map((event) => {
          const isNowActive = event.active;
          return (
            <div
              key={event.id}
              className={`bg-white rounded-3xl p-6 border-2 shadow-lg transition-all flex flex-col justify-between ${
                isNowActive ? 'border-amber-400 bg-gradient-to-br from-amber-50/50 via-white to-orange-50/30' : 'border-purple-100'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{event.icon}</div>
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-extrabold ${
                      isNowActive
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {isNowActive ? 'ACTIVE NOW' : 'UPCOMING'}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-800">{event.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{event.description}</p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <div className="bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-500" />
                    <span>{event.rarityMultiplier}x Rarity Boost</span>
                  </div>
                  {event.biomeBonus && (
                    <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold text-emerald-700">
                      Biome: {event.biomeBonus}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex items-center justify-between mt-4">
                <div className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Clock size={14} />
                  <span>Duration: 15 mins</span>
                </div>
                <button
                  onClick={() => {
                    audioSystem.playSfx('event');
                    onToggleEvent(event.id);
                  }}
                  className={`py-2 px-4 rounded-2xl text-xs font-extrabold transition-all shadow-sm ${
                    isNowActive
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                  }`}
                >
                  {isNowActive ? 'Deactivate Event' : 'Trigger Event'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
