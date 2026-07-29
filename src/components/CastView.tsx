import React, { useEffect, useRef, useState } from 'react';
import { createClient, connectToHost, sendData } from '../network';
import { renderPOV } from '../game/Raycaster';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../game/constants';
import { initTextures } from '../game/Textures';
import { Joystick, Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export const CastView: React.FC = () => {
    const [status, setStatus] = useState<'init' | 'connecting' | 'connected' | 'error'>('init');
    const [pin, setPin] = useState('');
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const mapRef = useRef<number[][] | null>(null);
    const stateRef = useRef<any>(null);
    const reqRef = useRef<number>(0);
    const myIdRef = useRef<number | null>(null);

    const inputState = useRef({ up: false, down: false, left: false, right: false, attack: false });

    useEffect(() => {
        initTextures();
        createClient(() => {
            console.log('Client peer created');
        });

        const sendInputLoop = setInterval(() => {
            if (status === 'connected') {
                sendData('input', inputState.current);
            }
        }, 1000 / 20); // 20 times a second

        return () => clearInterval(sendInputLoop);
    }, [status]);

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;
        setStatus('connecting');

        connectToHost(
            pin,
            (data) => {
                if (data.type === 'init') {
                    mapRef.current = data.payload.map;
                    // Determine which player we are by checking which one is present first
                    // We don't strictly know our ID from the payload directly unless host sends it,
                    // but we can infer or Host should send it. Let's just render the first player we find that isn't assigned?
                    // Actually, let's just let the host send our state, but we don't know if we are P1 or P2.
                    // Let's assume Host sends { type: 'state', payload: { players: { '1': {...}, '2': {...} } } }
                    // We need to know our ID. The host adds us and we send input, the host applies input to the connected peer.
                    // For rendering the POV on Cast, Cast needs to know which player to render.
                    // Since we didn't send ID in init, let's just guess we are the one with the newest ID, or the highest ID.
                } else if (data.type === 'state') {
                    stateRef.current = data.payload;
                    // Auto-detect our ID if not set: just pick the first one, or the host could send { type: 'your_id', payload: id }
                    // We'll update the Host to send 'your_id' on connection.
                } else if (data.type === 'your_id') {
                    myIdRef.current = data.payload;
                }
            },
            () => {
                setStatus('connected');
                startGameLoop();
            },
            () => {
                setStatus('error');
            }
        );
    };

    const startGameLoop = () => {
        const loop = () => {
            if (canvasRef.current && mapRef.current && stateRef.current && myIdRef.current) {
                const ctx = canvasRef.current.getContext('2d')!;
                const me = stateRef.current.players[myIdRef.current];
                if (me) {
                    const sprites = [
                        ...stateRef.current.enemies.map((e: any) => ({ x: e.x, y: e.y, type: e.type })),
                        ...stateRef.current.items.map((i: any) => ({ x: i.x, y: i.y, type: i.type })),
                        ...Object.entries(stateRef.current.players)
                            .filter(([id]) => Number(id) !== myIdRef.current)
                            .map(([, p]: any) => ({ x: p.x, y: p.y, type: p.spriteType }))
                    ];
                    renderPOV(ctx, mapRef.current, me, sprites, true);
                    
                    // Draw HUD
                    ctx.fillStyle = 'red';
                    ctx.font = '16px monospace';
                    ctx.fillText(`HP: ${me.hp}`, 10, 20);
                    ctx.fillStyle = 'yellow';
                    ctx.fillText(`SCORE: ${me.score}`, 10, 40);
                }
            }
            reqRef.current = requestAnimationFrame(loop);
        };
        reqRef.current = requestAnimationFrame(loop);
    };

    // Controller handlers
    const handleBtn = (btn: keyof typeof inputState.current, val: boolean) => (e: any) => {
        e.preventDefault();
        inputState.current[btn] = val;
    };

    if (status !== 'connected') {
        return (
            <div className="w-full h-screen bg-zinc-950 flex items-center justify-center text-white font-mono">
                <form onSubmit={handleConnect} className="bg-zinc-900 p-8 rounded-lg border border-zinc-800 flex flex-col gap-4 max-w-sm w-full shadow-2xl">
                    <h1 className="text-2xl font-bold text-red-500 text-center mb-4">CAST CONTROLLER</h1>
                    {status === 'error' && <div className="text-red-500 text-sm">Connection failed. Check PIN.</div>}
                    <div>
                        <label className="block text-sm text-zinc-400 mb-1">Enter Host PIN</label>
                        <input 
                            type="text" 
                            value={pin}
                            onChange={e => setPin(e.target.value.toUpperCase())}
                            className="w-full bg-black border border-zinc-700 rounded p-3 text-2xl tracking-widest text-center text-white outline-none focus:border-red-500 transition-colors"
                            placeholder="1234"
                            maxLength={4}
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={status === 'connecting' || pin.length < 4}
                        className="bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-3 rounded transition-colors mt-2"
                    >
                        {status === 'connecting' ? 'CONNECTING...' : 'CONNECT'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black text-white flex flex-col font-mono select-none overflow-hidden touch-none">
            {/* POV Viewfinder */}
            <div className="flex-1 w-full bg-zinc-900 relative">
                <canvas 
                    ref={canvasRef} 
                    width={SCREEN_WIDTH} 
                    height={SCREEN_HEIGHT} 
                    className="w-full h-full object-cover pixelated"
                />
            </div>
            
            {/* Digital Controller */}
            <div className="h-64 bg-zinc-900 border-t border-zinc-800 p-6 flex justify-between items-center pb-12">
                {/* D-PAD */}
                <div className="relative w-40 h-40">
                    <button 
                        className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-16 bg-zinc-800 active:bg-zinc-700 rounded-t-lg flex items-center justify-center"
                        onPointerDown={handleBtn('up', true)} onPointerUp={handleBtn('up', false)} onPointerLeave={handleBtn('up', false)}
                    ><ArrowUp size={24} /></button>
                    <button 
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-16 bg-zinc-800 active:bg-zinc-700 rounded-b-lg flex items-center justify-center"
                        onPointerDown={handleBtn('down', true)} onPointerUp={handleBtn('down', false)} onPointerLeave={handleBtn('down', false)}
                    ><ArrowDown size={24} /></button>
                    <button 
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-16 h-12 bg-zinc-800 active:bg-zinc-700 rounded-l-lg flex items-center justify-center"
                        onPointerDown={handleBtn('left', true)} onPointerUp={handleBtn('left', false)} onPointerLeave={handleBtn('left', false)}
                    ><ArrowLeft size={24} /></button>
                    <button 
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-16 h-12 bg-zinc-800 active:bg-zinc-700 rounded-r-lg flex items-center justify-center"
                        onPointerDown={handleBtn('right', true)} onPointerUp={handleBtn('right', false)} onPointerLeave={handleBtn('right', false)}
                    ><ArrowRight size={24} /></button>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-zinc-900 rounded-full" />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button 
                        className="w-24 h-24 bg-red-600 active:bg-red-500 rounded-full flex flex-col items-center justify-center shadow-lg shadow-red-900/50"
                        onPointerDown={handleBtn('attack', true)} onPointerUp={handleBtn('attack', false)} onPointerLeave={handleBtn('attack', false)}
                    >
                        <Crosshair size={32} />
                        <span className="text-xs font-bold mt-1">FIRE</span>
                    </button>
                </div>
            </div>

            <style>{`
                .pixelated { image-rendering: pixelated; }
            `}</style>
        </div>
    );
};
