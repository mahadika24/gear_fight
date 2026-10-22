import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gameEngine } from './game/engine';
import { GameRenderer } from './game/renderer';
import { sound } from './game/sound';
import { MobileGameOverlay } from './components/MobileGameOverlay';
import { ShopCard } from './game/engine';
import { PlacedGear } from './game/types';
import { RotateCcw, Volume2, VolumeX, X, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  const [, setTick] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Dragging state
  const dragRef = useRef<{
    gear: PlacedGear;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);

  const syncUI = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    const unsub = gameEngine.subscribe(syncUI);
    return () => unsub();
  }, [syncUI]);

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new GameRenderer(canvas, gameEngine);
    rendererRef.current = renderer;

    const loop = (now: number) => {
      const rawDt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      gameEngine.update(rawDt);
      renderer.render();

      // Render dragging gear if any
      const dragging = dragRef.current;
      if (dragging) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.translate(dragging.curX, dragging.curY);
          ctx.globalAlpha = 0.85;

          // Drag shadow & ring
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(3, 4, 30, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(dragging.gear.role.substring(0, 5), 0, 0);

          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Map mouse / touch coordinates to canvas virtual coordinates (420 x 860)
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 420 / rect.width;
    const scaleY = 860 / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (gameEngine.phase === 'FIGHT') return;
    const { x, y } = getCanvasCoords(e);
    const renderer = rendererRef.current;
    if (!renderer) return;

    for (const g of gameEngine.gears) {
      const gx = renderer.boardOriginX + g.gridX * renderer.socketSpacing;
      const gy = renderer.boardOriginY + g.gridY * renderer.socketSpacing;
      const dist = Math.hypot(x - gx, y - gy);

      if (dist <= 30) {
        dragRef.current = {
          gear: g,
          startX: gx,
          startY: gy,
          curX: x,
          curY: y
        };
        sound.gearTick();
        break;
      }
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const { x, y } = getCanvasCoords(e);
    dragRef.current.curX = x;
    dragRef.current.curY = y;
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const dragging = dragRef.current;
    if (!dragging) return;
    dragRef.current = null;

    const { x, y } = getCanvasCoords(e);
    const renderer = rendererRef.current;
    if (!renderer) return;

    // Calculate nearest socket
    let nearestIndex = -1;
    let minDist = 9999;

    for (const s of gameEngine.sockets) {
      const sx = renderer.boardOriginX + s.x * renderer.socketSpacing;
      const sy = renderer.boardOriginY + s.y * renderer.socketSpacing;
      const d = Math.hypot(x - sx, y - sy);
      if (d < minDist) {
        minDist = d;
        nearestIndex = s.index;
      }
    }

    if (minDist <= 38 && nearestIndex !== -1) {
      gameEngine.moveOrMergeGear(dragging.gear.id, nearestIndex);
    }
  };

  const handleBuyCard = (card: ShopCard) => {
    gameEngine.buyShopCard(card);
  };

  const handleReroll = () => {
    gameEngine.rerollShop();
  };

  const handleFight = () => {
    gameEngine.startFight();
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleRestart = () => {
    gameEngine.stats.wave = 1;
    gameEngine.stats.hearts = 11;
    gameEngine.stats.nuts = 22;
    gameEngine.stats.gems = 96;
    gameEngine.phase = 'BUILD';
    gameEngine.initBoard();
    gameEngine.refreshShop();
    setShowSettings(false);
    gameEngine.notify();
  };

  // Victory Confetti trigger
  useEffect(() => {
    if (gameEngine.phase === 'VICTORY') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.5 }
      });
    }
  }, [gameEngine.phase]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center font-sans">
      {/* Mobile Device Frame Container (Exact 420px max width matching mobile screenshot) */}
      <div className="relative w-full h-full max-w-[420px] max-h-[920px] aspect-[9/19] flex items-center justify-center shadow-2xl overflow-hidden rounded-none md:rounded-3xl border-0 md:border-4 md:border-slate-800 bg-slate-900">
        {/* The 60FPS Game Canvas */}
        <canvas
          ref={canvasRef}
          width={420}
          height={860}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="w-full h-full object-cover select-none cursor-pointer"
        />

        {/* The Exact Screenshot Mobile Game Overlay */}
        <MobileGameOverlay
          engine={gameEngine}
          onOpenSettings={() => setShowSettings(true)}
          onFight={handleFight}
          onReroll={handleReroll}
          onBuyCard={handleBuyCard}
        />

        {/* Wave Clear Celebration Banner */}
        {gameEngine.phase === 'WAVE_CLEAR' && (
          <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 border-4 border-white rounded-3xl p-6 text-center shadow-2xl">
              <div className="text-3xl font-black text-slate-950 tracking-wide uppercase drop-shadow">
                WAVE {gameEngine.stats.wave} CLEARED!
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                +12 Nuts · +6 Gems Rewarded
              </div>
            </div>
          </div>
        )}

        {/* Game Over Modal */}
        {gameEngine.phase === 'GAME_OVER' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md">
            <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-6 text-center shadow-2xl w-full max-w-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mb-3">
                <RotateCcw className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">DEFEAT!</h2>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                Your clockwork fortress fell at Wave {gameEngine.stats.wave}/12.
              </p>
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/40 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Victory Modal */}
        {gameEngine.phase === 'VICTORY' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md">
            <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl p-6 text-center shadow-2xl w-full max-w-xs flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400 flex items-center justify-center mb-3">
                <Trophy className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white">ALL 12 WAVES CLEARED!</h2>
              <p className="text-xs text-slate-400 mt-1 mb-6">
                You defeated the Steam Colossus and conquered Gear Fight!
              </p>
              <button
                onClick={handleRestart}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all shadow-lg shadow-amber-500/40 cursor-pointer"
              >
                Play Again
              </button>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border-2 border-sky-500 rounded-3xl p-5 shadow-2xl w-full max-w-xs flex flex-col gap-4 text-white">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-black text-base text-sky-400">SETTINGS</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleToggleMute}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs flex items-center justify-between"
                >
                  <span>Sound Effects</span>
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
                </button>

                <button
                  onClick={handleRestart}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs flex items-center justify-between text-amber-300"
                >
                  <span>Restart Match</span>
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-black text-xs uppercase"
              >
                Resume
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
