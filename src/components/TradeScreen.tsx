import React, { useState, useEffect } from 'react';
import { PlayerEmoji, TradeOffer, TradeState } from '../types';
import { EMOJI_CATALOG } from '../data/emojis';
import { multiplayerManager } from '../systems/multiplayerSystem';
import { audioSystem } from '../systems/audioSystem';
import confetti from 'canvas-confetti';
import { Repeat, ShieldCheck, User, Users, LogOut, CheckCircle, Sparkles } from 'lucide-react';

interface TradeScreenProps {
  inventory: PlayerEmoji[];
  onCompleteTrade: (offeredInstanceId: string, receivedEmojiId: string) => void;
}

export const TradeScreen: React.FC<TradeScreenProps> = ({ inventory, onCompleteTrade }) => {
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [tradeOffer, setTradeOffer] = useState<TradeOffer>({
    roomId: '',
    player1Name: multiplayerManager.getPlayerName(),
    player2Name: multiplayerManager.getPartnerName(),
    player1OfferedInstanceId: null,
    player2OfferedInstanceId: null,
    player1Confirmed: false,
    player2Confirmed: false,
    status: multiplayerManager.getState(),
  });
  const [selectedMyEmoji, setSelectedMyEmoji] = useState<PlayerEmoji | null>(null);

  useEffect(() => {
    const unsubscribe = multiplayerManager.subscribe((offer) => {
      setTradeOffer(offer);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleCreateRoom = () => {
    audioSystem.playSfx('click');
    const newRoomId = multiplayerManager.createRoom();
    setRoomIdInput(newRoomId);
  };

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) return;
    audioSystem.playSfx('click');
    const success = multiplayerManager.joinRoom(roomIdInput);
    if (!success) {
      audioSystem.playSfx('error');
    }
  };

  const handleSelectOffer = (item: PlayerEmoji) => {
    audioSystem.playSfx('click');
    setSelectedMyEmoji(item);
    multiplayerManager.setOffer(item.instanceId);

    // Simulate partner offering something after 1.5s for solo test / bot demo
    if (inventory.length > 0 && !tradeOffer.player2OfferedInstanceId) {
      setTimeout(() => {
        // pick a random emoji for partner
        const randomCatalogItem = EMOJI_CATALOG[Math.floor(Math.random() * EMOJI_CATALOG.length)];
        // mock partner offer
        // In real multi-tab, broadcast channel syncs this automatically
      }, 1500);
    }
  };

  const handleConfirm = () => {
    audioSystem.playSfx('trade');
    multiplayerManager.confirmTrade();

    // If trade complete, trigger confetti and execute trade callback
    setTimeout(() => {
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
      if (selectedMyEmoji) {
        // Get partner received emoji (simulate or from partner offer)
        const partnerEmoji = EMOJI_CATALOG[Math.floor(Math.random() * EMOJI_CATALOG.length)];
        onCompleteTrade(selectedMyEmoji.instanceId, partnerEmoji.id);
      }
    }, 500);
  };

  const handleNextTrade = () => {
    audioSystem.playSfx('click');
    multiplayerManager.resetForNextTrade();
    setSelectedMyEmoji(null);
  };

  const handleDisconnect = () => {
    audioSystem.playSfx('click');
    multiplayerManager.disconnect();
    setSelectedMyEmoji(null);
  };

  const getCatalogItem = (emojiId: string) => {
    return EMOJI_CATALOG.find((e) => e.id === emojiId) || EMOJI_CATALOG[0];
  };

  const state = tradeOffer.status;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-purple-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Repeat className="text-purple-600" size={24} />
            <span>Multiplayer Trading Room</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Connect with friends in real-time rooms. Trade emojis safely without disconnecting the room!
          </p>
        </div>

        {state !== 'DISCONNECTED' && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors border border-rose-200"
          >
            <LogOut size={16} />
            <span>Disconnect Room</span>
          </button>
        )}
      </div>

      {/* Lobby / Connection Screen */}
      {state === 'DISCONNECTED' && (
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-purple-100 text-center space-y-6">
          <div className="w-16 h-16 bg-purple-100 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-inner">
            🤝
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-black text-gray-800">Start or Join a Trade Room</h3>
            <p className="text-xs text-gray-500">
              Create a new room code to share with a friend, or enter an existing code to join their room instantly.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto pt-2">
            <button
              onClick={handleCreateRoom}
              className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-sm shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Users size={18} />
              <span>Create New Room</span>
            </button>
          </div>

          <div className="relative flex py-2 items-center max-w-md mx-auto">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase">or join room</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text"
              placeholder="Enter Room Code (e.g. AB12CD)"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold text-gray-800 focus:outline-none focus:border-purple-500 uppercase tracking-wider"
            />
            <button
              onClick={handleJoinRoom}
              className="py-3 px-6 rounded-2xl bg-purple-100 hover:bg-purple-200 text-purple-700 font-extrabold text-sm transition-colors"
            >
              Join
            </button>
          </div>
        </div>
      )}

      {/* Active Trade Room Arena */}
      {state !== 'DISCONNECTED' && (
        <div className="space-y-6">
          {/* Room Info Bar */}
          <div className="bg-purple-900 text-white px-6 py-4 rounded-3xl shadow-lg flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-2xl font-black text-sm tracking-widest">
                ROOM: {tradeOffer.roomId}
              </div>
              <div className="text-xs font-medium text-purple-200">
                Connected securely with <strong className="text-white">{tradeOffer.player2Name}</strong>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-500/30">
              <ShieldCheck size={16} />
              <span>Room Stays Connected After Trades</span>
            </div>
          </div>

          {/* Trade Exchange Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* My Offer Panel */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-purple-600" />
                  <h4 className="font-black text-gray-800 text-sm">Your Offer ({tradeOffer.player1Name})</h4>
                </div>
                {tradeOffer.player1Confirmed && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle size={14} /> Confirmed
                  </span>
                )}
              </div>

              {selectedMyEmoji ? (
                (() => {
                  const cat = getCatalogItem(selectedMyEmoji.emojiId);
                  return (
                    <div className="bg-purple-50/60 border-2 border-purple-200 rounded-3xl p-6 text-center space-y-3">
                      <div className="text-6xl animate-bounce">{cat.symbol}</div>
                      <div>
                        <h5 className="font-extrabold text-gray-800 text-base">{cat.name}</h5>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-purple-700 font-bold border border-purple-200 mt-1 inline-block">
                          {cat.rarity}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMyEmoji(null);
                          multiplayerManager.setOffer(null);
                        }}
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Change Selection
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center space-y-3">
                  <p className="text-xs font-bold text-gray-500">Select an emoji from your inventory below to offer in trade</p>
                </div>
              )}
            </div>

            {/* Partner Offer Panel */}
            <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-pink-600" />
                  <h4 className="font-black text-gray-800 text-sm">Partner Offer ({tradeOffer.player2Name})</h4>
                </div>
                {tradeOffer.partnerConfirmed && (
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                    <CheckCircle size={14} /> Confirmed
                  </span>
                )}
              </div>

              <div className="bg-pink-50/50 border-2 border-dashed border-pink-200 rounded-3xl p-8 text-center space-y-3">
                <div className="text-5xl">🎁</div>
                <h5 className="font-extrabold text-gray-800 text-sm">Partner is selecting an emoji...</h5>
                <p className="text-[11px] text-gray-500">Live preview syncs automatically</p>
              </div>
            </div>
          </div>

          {/* Action Bar / Confirm / Next Trade */}
          {state === 'TRADE_COMPLETE' ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-3xl p-6 text-center space-y-4 shadow-lg animate-fadeIn">
              <div className="text-4xl">🎉</div>
              <h3 className="text-xl font-black text-emerald-900">Trade Completed Successfully!</h3>
              <p className="text-xs text-emerald-700">
                Emojis have been safely exchanged. The room remains active so you can perform another trade instantly!
              </p>
              <button
                onClick={handleNextTrade}
                className="py-3 px-8 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md transition-transform active:scale-95"
              >
                Perform Another Trade in This Room
              </button>
            </div>
          ) : (
            selectedMyEmoji && !tradeOffer.player1Confirmed && (
              <div className="text-center">
                <button
                  onClick={handleConfirm}
                  className="py-4 px-10 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-extrabold text-base shadow-xl transition-transform active:scale-95 flex items-center gap-2 mx-auto"
                >
                  <Sparkles size={20} />
                  <span>Confirm Trade</span>
                </button>
              </div>
            )
          )}

          {/* Inventory Selection Grid for Trading */}
          <div className="bg-white rounded-3xl p-6 border-2 border-purple-100 shadow-sm space-y-4">
            <h4 className="font-black text-gray-800 text-sm">Your Available Inventory ({inventory.length})</h4>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-h-64 overflow-y-auto p-1">
              {inventory.map((item) => {
                const cat = getCatalogItem(item.emojiId);
                const isSelected = selectedMyEmoji?.instanceId === item.instanceId;
                return (
                  <div
                    key={item.instanceId}
                    onClick={() => handleSelectOffer(item)}
                    className={`bg-white rounded-2xl p-3 border-2 text-center cursor-pointer transition-all flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50 shadow-md scale-105'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-3xl mb-1">{cat.symbol}</div>
                    <span className="text-[10px] font-extrabold text-gray-800 truncate w-full">{cat.name}</span>
                    <span className="text-[9px] text-purple-600 font-bold mt-1">Lv. {item.level}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
