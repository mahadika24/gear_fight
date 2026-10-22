export type GamePhase = 'BUILD' | 'FIGHT' | 'WAVE_CLEAR' | 'GAME_OVER' | 'VICTORY';

export type GearRole = 
  | 'BERSERKER'   // Red-bearded warrior on blue cog
  | 'ROGUE'       // Green-bandana warrior on green cog
  | 'GOLD_COG'    // Numbered golden cog that boosts speed & nuts
  | 'HAMMER'      // Heavy crushing warhammer cog
  | 'ARCHER'      // Crossbow marksman cog
  | 'KNIGHT'      // Shielded tank warrior
  | 'TESLA'       // Electric lightning coil
  | 'BOMB';       // Explosive sapper cog

export interface GearDef {
  role: GearRole;
  name: string;
  baseCost: number;
  teeth: number;
  color: string;
  borderColor: string;
  accentColor: string;
  description: string;
  type: 'character' | 'weapon' | 'utility';
  power: number; // e.g. 10, 12, 14
  hp: number;
  dmg: number;
  attackSpeed: number; // spawns/attacks per revolution
  trait: string;
}

export interface PlacedGear {
  id: string;
  slotIndex: number; // socket index (0 - 24)
  gridX: number;     // column (0 - 4)
  gridY: number;     // row (0 - 4)
  role: GearRole;
  tier: number;      // 1, 2, 3
  teeth: number;     // number of teeth for meshing ratio
  power: number;     // 10, 12, etc.
  angle: number;     // rotation in radians
  angularVelocity: number;
  connected: boolean;
  spawnProgress: number; // 0 to 1
}

export interface BoardSocket {
  index: number;
  x: number;
  y: number;
  isMotorPin: boolean; // Golden motor drive pin with tab
  motorAngle: number;
  gearId: string | null;
}

export interface Enemy {
  id: string;
  name: string;
  type: 'grunt' | 'scout' | 'brute' | 'mortar' | 'boss';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  state: 'walk' | 'attack' | 'hit' | 'dead';
  animTimer: number;
  attackCooldown: number;
}

export interface FriendlyUnit {
  id: string;
  role: GearRole;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  range: number;
  tier: number;
  state: 'walk' | 'attack' | 'hit' | 'dead';
  animTimer: number;
  attackCooldown: number;
  targetEnemyId: string | null;
}

export interface CombatParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'smoke' | 'fire' | 'text' | 'nut';
  text?: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  speed: number;
  dmg: number;
  type: 'arrow' | 'hammer_shock' | 'spark_arc' | 'bomb';
}

export interface BuffUpgrade {
  id: string;
  name: string;
  desc: string;
  costGems: number;
  level: number;
  maxLevel: number;
  icon: string;
}

export interface GameStats {
  nuts: number;       // yellow hexagon currency (e.g. 22)
  gems: number;       // pink diamond gems (e.g. 96)
  hearts: number;     // lives (e.g. 11)
  maxHearts: number;
  wave: number;       // 1 - 12
  maxWaves: number;   // 12
  isFighting: boolean;
  score: number;
}
