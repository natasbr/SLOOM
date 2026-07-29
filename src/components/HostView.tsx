import React, { useEffect, useRef, useState } from 'react';
import { createHost, hostBroadcast } from '../network';
import { GameEngine } from '../game/GameEngine';
import { renderPOV } from '../game/Raycaster';
import { SCREEN_WIDTH, SCREEN_HEIGHT, SpriteType } from '../game/constants';
import { initTextures } from '../game/Textures';
import { audioEngine } from '../game/AudioEngine';

interface BagCoin {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export const HostView: React.FC = () => {
    const [pins, setPins] = useState<{p1: string, p2: string} | null>(null);
    const [connectedPlayers, setConnectedPlayers] = useState<number[]>([]);
    
    const pov1Ref = useRef<HTMLCanvasElement>(null);
    const pov2Ref = useRef<HTMLCanvasElement>(null);
    const bagRef = useRef<HTMLCanvasElement>(null);
    const mapRef = useRef<HTMLCanvasElement>(null);

    const engineRef = useRef<GameEngine | null>(null);
    const bagCoinsRef = useRef<BagCoin[]>([]);
    const reqRef = useRef<number>(0);

    useEffect(() => {
        initTextures();
        
        const engine = new GameEngine((playerId: number) => {
            // Spawn a coin in the bag
            bagCoinsRef.current.push({
                x: Math.random() * 200 + 50,
                y: -20,
                vx: (Math.random() - 0.5) * 5,
                vy: Math.random() * 2
            });
        });
        engineRef.current = engine;

        createHost(
            (pin1, pin2) => {
                setPins({ p1: pin1, p2: pin2 });
            },
            (playerId, data) => {
                if (data.type === 'input') {
                    engine.handleInput(playerId, data.payload);
                }
            },
            (playerId) => {
                setConnectedPlayers(prev => [...prev, playerId]);
                engine.addPlayer(playerId, playerId === 1 ? SpriteType.PLAYER_CRIA : SpriteType.PLAYER_MOTOBOY);
                // Send map to new player
                setTimeout(() => {
                    hostBroadcast('init', { map: engine.map });
                    audioEngine.start();
                }, 500);
            },
            (playerId) => {
                setConnectedPlayers(prev => prev.filter(id => id !== playerId));
                engine.removePlayer(playerId);
            }
        );

        const loop = () => {
            engine.update();

            // Broadcast state to casts
            const statePayload = {
                players: engine.players,
                enemies: engine.enemies,
                items: engine.items
            };
            hostBroadcast('state', statePayload);

            // Render POVs
            const sprites = [
                ...engine.enemies.map(e => ({ x: e.x, y: e.y, type: e.type })),
                ...engine.items.map(i => ({ x: i.x, y: i.y, type: i.type })),
                ...Object.entries(engine.players).map(([id, p]) => ({ x: p.x, y: p.y, type: p.spriteType }))
            ];

            if (engine.players[1] && pov1Ref.current) {
                const ctx = pov1Ref.current.getContext('2d')!;
                const p1Sprites = sprites.filter(s => s.x !== engine.players[1].x || s.y !== engine.players[1].y);
                renderPOV(ctx, engine.map, engine.players[1], p1Sprites);
            }
            if (engine.players[2] && pov2Ref.current) {
                const ctx = pov2Ref.current.getContext('2d')!;
                const p2Sprites = sprites.filter(s => s.x !== engine.players[2].x || s.y !== engine.players[2].y);
                renderPOV(ctx, engine.map, engine.players[2], p2Sprites);
            }

            // Render Mini Map
            if (mapRef.current) {
                const ctx = mapRef.current.getContext('2d')!;
                ctx.clearRect(0, 0, mapRef.current.width, mapRef.current.height);
                const s = 4;
                for (let y = 0; y < engine.map.length; y++) {
                    for (let x = 0; x < engine.map[0].length; x++) {
                        if (engine.map[y][x] > 0) {
                            ctx.fillStyle = '#666';
                            ctx.fillRect(x*s, y*s, s, s);
                        }
                    }
                }
                Object.values(engine.players).forEach(p => {
                    ctx.fillStyle = '#0f0';
                    ctx.fillRect(p.x*s-1, p.y*s-1, 3, 3);
                });
                engine.enemies.forEach(e => {
                    ctx.fillStyle = '#f00';
                    ctx.fillRect(e.x*s-1, e.y*s-1, 2, 2);
                });
            }

            // Update & Render Bag physics
            if (bagRef.current) {
                const ctx = bagRef.current.getContext('2d')!;
                ctx.clearRect(0, 0, bagRef.current.width, bagRef.current.height);
                ctx.font = '20px Arial';
                ctx.fillStyle = '#FFD700';
                
                const coins = bagCoinsRef.current;
                for (let i = 0; i < coins.length; i++) {
                    const c = coins[i];
                    c.vy += 0.5; // gravity
                    c.x += c.vx;
                    c.y += c.vy;
                    if (c.y > bagRef.current.height - 20) {
                        c.y = bagRef.current.height - 20;
                        c.vy *= -0.5; // bounce
                        c.vx *= 0.8; // friction
                    }
                    if (c.x < 0 || c.x > bagRef.current.width) c.vx *= -1;
                    
                    ctx.fillText('💰', c.x, c.y);
                }
            }

            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(reqRef.current);
            audioEngine.stop();
        };
    }, []);

    const totalScore = engineRef.current ? Object.values(engineRef.current.players).reduce((sum, p: any) => sum + p.score, 0) : 0;

    return (
        <div className="w-full h-screen bg-black text-white flex flex-col font-mono">
            {/* Header */}
            <div className="p-4 flex justify-between bg-zinc-900 border-b border-zinc-800">
                <div>
                    <h1 className="text-2xl font-bold text-red-500">FAVELA DOOM HOST</h1>
                    <div className="text-sm mt-2 text-zinc-400">
                        P1 PIN: <span className="text-white font-bold">{pins?.p1 || '...'}</span> | 
                        P2 PIN: <span className="text-white font-bold">{pins?.p2 || '...'}</span>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl text-yellow-500 font-bold">SCORE: {totalScore}</div>
                    <div className="text-sm text-zinc-400">
                        {connectedPlayers.length} / 2 Players Connected
                    </div>
                </div>
            </div>

            {/* Main Display */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                {/* POVs */}
                <div className="flex-1 flex gap-4">
                    <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded overflow-hidden relative">
                        <canvas ref={pov1Ref} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="w-full h-full object-contain pixelated" />
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 text-xs">P1 POV</div>
                    </div>
                    <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded overflow-hidden relative">
                        <canvas ref={pov2Ref} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="w-full h-full object-contain pixelated" />
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 text-xs">P2 POV</div>
                    </div>
                </div>

                {/* Bottom Stats */}
                <div className="h-48 flex gap-4">
                    <div className="w-48 bg-zinc-900 border border-zinc-700 rounded overflow-hidden relative">
                        <canvas ref={mapRef} width={120} height={120} className="w-full h-full object-contain pixelated p-2" />
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 text-xs">MINIMAP</div>
                    </div>
                    <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded overflow-hidden relative">
                        <canvas ref={bagRef} width={800} height={200} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/50 px-2 py-1 text-xs">LOOT BAG</div>
                    </div>
                </div>
            </div>
            
            <style>{`
                .pixelated { image-rendering: pixelated; }
            `}</style>
        </div>
    );
};
