import React, { useState } from 'react';
import { GameEngine } from '../game/engine';
import { ShopCard } from '../game/engine';
import { Settings, RefreshCw, Heart, X, Check, ArrowUp } from 'lucide-react';
import { sound } from '../game/sound';

interface MobileGameOverlayProps {
  engine: GameEngine;
  onOpenSettings: () => void;
  onFight: () => void;
  onReroll: () => void;
  onBuyCard: (card: ShopCard) => void;
}

export const MobileGameOverlay: React.FC<MobileGameOverlayProps> = ({
  engine,
  onOpenSettings,
  onFight,
  onReroll,
  onBuyCard
}) => {
  const stats = engine.stats;
  const [showBuffsModal, setShowBuffsModal] = useState<boolean>(false);

  const waveProgress = Math.min(100, (stats.wave / stats.maxWaves) * 100);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none z-30 font-sans">
      {/* 1. TOP BAR (Exact Screenshot Layout) */}
      <div className="w-full flex items-center justify-between gap-2 pointer-events-auto">
        {/* Settings Blue Gear Button */}
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 border-2 border-sky-400 shadow-lg flex items-center justify-center text-white transition-all cursor-pointer"
          title="Settings"
        >
          <Settings className="w-6 h-6 stroke-[2.5]" />
        </button>

        {/* Wave Tracker Pill */}
        <div className="flex-1 max-w-[210px] bg-indigo-950/90 border-2 border-indigo-700/80 rounded-2xl px-3 py-1.5 shadow-xl flex flex-col items-center">
          <div className="text-xs font-black tracking-wider text-white">
            Wave {stats.wave}/{stats.maxWaves}
          </div>
          {/* Progress track */}
          <div className="relative w-full h-2.5 bg-indigo-900 rounded-full mt-1 overflow-hidden p-0.5 border border-indigo-800">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-300"
              style={{ width: `${waveProgress}%` }}
            />
          </div>
          {/* Milestone markers */}
          <div className="w-full flex items-center justify-between text-[9px] font-bold text-indigo-300 mt-0.5 px-0.5">
            <span className="text-amber-400">●</span>
            <span className="text-sky-300">?</span>
            <span className="text-pink-400">🏁</span>
          </div>
        </div>

        {/* Gems Counter (Pink Diamond) */}
        <div className="flex items-center gap-1.5 bg-indigo-950/90 border-2 border-indigo-700/80 rounded-2xl px-3 py-1.5 shadow-xl">
          {/* Pink faceted gem SVG */}
          <svg className="w-5 h-5 drop-shadow-[0_2px_4px_rgba(236,72,153,0.6)]" viewBox="0 0 24 24" fill="none">
            <polygon points="6,3 18,3 22,9 12,22 2,9" fill="#F472B6" />
            <polygon points="6,3 18,3 12,9" fill="#FBCFE8" />
            <polygon points="12,9 22,9 12,22" fill="#DB2777" />
            <polygon points="2,9 12,9 12,22" fill="#BE185D" />
          </svg>
          <span className="font-mono text-sm font-black text-white tabular-nums">
            {stats.gems}
          </span>
        </div>
      </div>

      {/* 2. UPPER LEFT: BUFFS BUTTON (As shown in screenshot) */}
      <div className="pointer-events-auto flex flex-col items-start mt-2">
        <button
          onClick={() => setShowBuffsModal(true)}
          className="flex flex-col items-center group cursor-pointer active:scale-95 transition-transform"
        >
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Golden Nut Icon */}
            <svg className="w-7 h-7 text-yellow-400 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
              <circle cx="12" cy="12" r="4" fill="#78350F" />
            </svg>
            {/* Pink Heart badge */}
            <div className="absolute -top-1 -right-1">
              <Heart className="w-5 h-5 fill-pink-500 text-pink-300" />
            </div>
            {/* Green Up Arrow */}
            <div className="absolute -bottom-1 -left-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
              <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <span className="text-[10px] font-black tracking-wider text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            BUFFS
          </span>
        </button>
      </div>

      {/* 3. BOTTOM HALF: SHOP PANEL & CONTROLS (Exact Screenshot Layout) */}
      <div className="w-full flex flex-col gap-2 pointer-events-auto mt-auto">
        {/* The Blue Shop Card Box */}
        <div className="relative bg-sky-500 border-4 border-sky-600 rounded-3xl p-2.5 shadow-2xl flex flex-col gap-2">
          {/* Yellow Hexagon Nut Currency Badge (top-left, as in screenshot) */}
          <div className="absolute -top-4 left-3 flex items-center gap-1.5 bg-indigo-950 border-2 border-yellow-400 rounded-xl px-2.5 py-1 shadow-lg">
            <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
              <circle cx="12" cy="12" r="4.5" fill="#78350F" />
            </svg>
            <span className="font-mono text-base font-black text-white tabular-nums">
              {stats.nuts}
            </span>
          </div>

          {/* 3 Shop Cards Container */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {engine.shopCards.map((card) => {
              const canAfford = stats.nuts >= card.cost;
              return (
                <button
                  key={card.id}
                  onClick={() => onBuyCard(card)}
                  disabled={!canAfford || engine.phase === 'FIGHT'}
                  className={`relative flex flex-col items-center justify-between rounded-2xl p-1.5 border-2 transition-all cursor-pointer ${
                    canAfford && engine.phase !== 'FIGHT'
                      ? 'bg-sky-400/90 hover:bg-sky-300 border-sky-200 shadow-md hover:scale-[1.02] active:scale-95'
                      : 'bg-sky-700/60 border-sky-800 opacity-60 cursor-not-allowed'
                  }`}
                >
                  {/* Card Character / Cog Art */}
                  <div className="w-full aspect-square flex items-center justify-center p-1">
                    {card.role === 'BERSERKER' && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Blue Cog Frame */}
                        <svg className="w-16 h-16 drop-shadow" viewBox="0 0 100 100">
                          <polygon
                            points="50,5 60,18 78,10 82,28 98,34 92,50 98,66 82,72 78,90 60,82 50,95 40,82 22,90 18,72 2,66 8,50 2,34 18,28 22,10 40,18"
                            fill="#3B82F6"
                            stroke="#1D4ED8"
                            strokeWidth="4"
                          />
                          <circle cx="50" cy="50" r="30" fill="#FDBA74" />
                          {/* Red hair & beard */}
                          <path d="M 25 35 Q 50 15 75 35 Q 85 45 75 60 Q 50 75 25 60 Z" fill="#EF4444" />
                          <circle cx="50" cy="50" r="20" fill="#FDBA74" />
                          {/* Face details */}
                          <rect x="34" y="44" width="10" height="4" fill="#2563EB" />
                          <rect x="56" y="44" width="10" height="4" fill="#2563EB" />
                          <circle cx="40" cy="50" r="3" fill="#000" />
                          <circle cx="60" cy="50" r="3" fill="#000" />
                          <path d="M 32 60 Q 50 82 68 60 Q 50 68 32 60" fill="#DC2626" />
                        </svg>
                      </div>
                    )}

                    {card.role === 'ROGUE' && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Green Cog Frame */}
                        <svg className="w-16 h-16 drop-shadow" viewBox="0 0 100 100">
                          <polygon
                            points="50,5 60,18 78,10 82,28 98,34 92,50 98,66 82,72 78,90 60,82 50,95 40,82 22,90 18,72 2,66 8,50 2,34 18,28 22,10 40,18"
                            fill="#22C55E"
                            stroke="#15803D"
                            strokeWidth="4"
                          />
                          <circle cx="50" cy="50" r="30" fill="#FDBA74" />
                          {/* Topknot & bandana */}
                          <circle cx="50" cy="24" r="9" fill="#78350F" />
                          <rect x="25" y="36" width="50" height="10" fill="#15803D" />
                          <circle cx="42" cy="52" r="3.5" fill="#000" />
                          <circle cx="58" cy="52" r="3.5" fill="#000" />
                          <path d="M 45 64 Q 50 67 55 64" stroke="#78350F" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                    )}

                    {card.role === 'GOLD_COG' && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {/* Golden Number Cog */}
                        <svg className="w-16 h-16 drop-shadow" viewBox="0 0 100 100">
                          <polygon
                            points="50,5 60,18 78,10 82,28 98,34 92,50 98,66 82,72 78,90 60,82 50,95 40,82 22,90 18,72 2,66 8,50 2,34 18,28 22,10 40,18"
                            fill="#FACC15"
                            stroke="#CA8A04"
                            strokeWidth="4"
                          />
                          <circle cx="50" cy="50" r="28" fill="#FEF08A" stroke="#CA8A04" strokeWidth="3" />
                          <text x="50" y="62" textAnchor="middle" fontSize="36" fontWeight="900" fill="#854D0E">
                            1
                          </text>
                        </svg>
                      </div>
                    )}

                    {card.role !== 'BERSERKER' && card.role !== 'ROGUE' && card.role !== 'GOLD_COG' && (
                      <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center text-xs font-black text-amber-300">
                        {card.role.substring(0, 4)}
                      </div>
                    )}
                  </div>

                  {/* Yellow Cost Badge Strip (as seen in screenshot: e.g. "12 🔩", "11 🔩", "10 🔩") */}
                  <div className="w-full bg-yellow-400 border border-yellow-500 rounded-lg py-1 flex items-center justify-center gap-1 mt-1 shadow-inner">
                    <span className="font-mono text-sm font-black text-slate-900 leading-none">
                      {card.cost}
                    </span>
                    <svg className="w-3.5 h-3.5 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
                      <circle cx="12" cy="12" r="4.5" fill="#FACC15" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons Row: Reroll (5 nuts) + Big Green FIGHT! Button */}
        <div className="grid grid-cols-2 gap-3">
          {/* Blue Reroll Button (5 nuts) */}
          <button
            onClick={onReroll}
            disabled={stats.nuts < 5 || engine.phase === 'FIGHT'}
            className={`py-3 px-4 rounded-2xl font-black text-base tracking-wider flex items-center justify-center gap-2 border-b-4 transition-all cursor-pointer ${
              stats.nuts >= 5 && engine.phase !== 'FIGHT'
                ? 'bg-sky-500 hover:bg-sky-400 active:translate-y-1 active:border-b-0 border-sky-700 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-700 border-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-5 h-5 stroke-[2.5]" />
            <span>5</span>
            <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
              <circle cx="12" cy="12" r="4.5" fill="#0284C7" />
            </svg>
          </button>

          {/* Big Green FIGHT! Button */}
          <button
            onClick={onFight}
            disabled={engine.phase === 'FIGHT'}
            className={`py-3 px-4 rounded-2xl font-black text-xl tracking-wider uppercase flex items-center justify-center gap-2 border-b-4 transition-all cursor-pointer ${
              engine.phase !== 'FIGHT'
                ? 'bg-emerald-500 hover:bg-emerald-400 active:translate-y-1 active:border-b-0 border-emerald-700 text-white shadow-lg shadow-emerald-600/40 animate-pulse'
                : 'bg-emerald-700 border-emerald-800 text-emerald-200 cursor-not-allowed'
            }`}
          >
            FIGHT!
          </button>
        </div>
      </div>

      {/* 4. BOTTOM LEFT: PINK HEART LIVES (Screenshot: Heart 11) */}
      <div className="absolute bottom-4 left-4 pointer-events-auto flex items-center gap-2 bg-indigo-950/80 border-2 border-pink-500/80 rounded-2xl px-3 py-1.5 shadow-xl">
        <Heart className="w-6 h-6 fill-pink-500 text-pink-300 drop-shadow" />
        <span className="font-mono text-lg font-black text-white tabular-nums">
          {stats.hearts}
        </span>
      </div>

      {/* BUFFS MODAL (Opens when clicking BUFFS button) */}
      {showBuffsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm pointer-events-auto">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-3xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-yellow-500 text-slate-950">
                  <ArrowUp className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-yellow-400">WORKSHOP BUFFS</h3>
                  <p className="text-xs text-slate-400">Upgrade permanent combat traits</p>
                </div>
              </div>
              <button
                onClick={() => setShowBuffsModal(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Buff list */}
            <div className="flex flex-col gap-2.5">
              {engine.buffs.map((buff) => {
                const canAfford = stats.gems >= buff.costGems;
                const isMax = buff.level >= buff.maxLevel;

                return (
                  <div
                    key={buff.id}
                    className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {buff.name}
                        <span className="text-[10px] font-mono text-yellow-400">
                          Lv.{buff.level}/{buff.maxLevel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{buff.desc}</div>
                    </div>

                    <button
                      onClick={() => engine.buyBuff(buff.id)}
                      disabled={!canAfford || isMax}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                        isMax
                          ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                          : canAfford
                          ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer shadow-md'
                          : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? (
                        'MAX'
                      ) : (
                        <>
                          <span>{buff.costGems}</span>
                          <span className="text-pink-300">💎</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowBuffsModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs uppercase tracking-wider text-slate-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
