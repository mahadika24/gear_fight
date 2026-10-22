import {
  GamePhase,
  GearRole,
  PlacedGear,
  BoardSocket,
  Enemy,
  FriendlyUnit,
  CombatParticle,
  Projectile,
  GameStats,
  BuffUpgrade
} from './types';
import { GEAR_DEFINITIONS, INITIAL_BUFFS } from './gearDefs';
import { sound } from './sound';

export const BOARD_COLS = 5;
export const BOARD_ROWS = 5;

export interface ShopCard {
  id: string;
  role: GearRole;
  tier: number;
  cost: number;
}

export class GameEngine {
  public phase: GamePhase = 'BUILD';

  public stats: GameStats = {
    nuts: 22,        // Starting nuts as shown in screenshot!
    gems: 96,        // Starting gems as shown in screenshot!
    hearts: 11,      // Starting hearts as shown in screenshot!
    maxHearts: 11,
    wave: 1,         // 1 / 12
    maxWaves: 12,
    isFighting: false,
    score: 0
  };

  // Grid Sockets
  public sockets: BoardSocket[] = [];
  public gears: PlacedGear[] = [];

  // Shop Cards (3 cards as in screenshot)
  public shopCards: ShopCard[] = [];

  // Combat Entities
  public enemies: Enemy[] = [];
  public friendlyUnits: FriendlyUnit[] = [];
  public projectiles: Projectile[] = [];
  public particles: CombatParticle[] = [];

  // Buff Upgrades
  public buffs: BuffUpgrade[] = JSON.parse(JSON.stringify(INITIAL_BUFFS));

  // Selected gear for dragging or inspect
  public selectedGearId: string | null = null;

  // Wave spawn timer
  public waveTimer: number = 0;
  public waveSpawnQueue: { type: 'grunt' | 'scout' | 'brute' | 'mortar' | 'boss'; delay: number }[] = [];

  // Shake & Speed
  public screenShake: number = 0;
  public gameSpeed: number = 1.0;

  private listeners: (() => void)[] = [];

  constructor() {
    this.initBoard();
    this.refreshShop();
  }

  public subscribe(fn: () => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  public notify() {
    for (const fn of this.listeners) {
      fn();
    }
  }

  // Initialize board sockets and default starting gear (like the screenshot!)
  public initBoard() {
    this.sockets = [];
    this.gears = [];

    // Create 5x5 sockets
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const index = r * BOARD_COLS + c;
        // Motor pins at specific strategic positions (similar to screenshot golden pins)
        const isMotorPin = (c === 1 && r === 2) || (c === 2 && r === 3);

        this.sockets.push({
          index,
          x: c,
          y: r,
          isMotorPin,
          motorAngle: 0,
          gearId: null
        });
      }
    }

    // Default starting gear as seen in screenshot:
    // A Hammer gear with power 10 placed at (c: 2, r: 1) near the top-left motor pin
    const startGear: PlacedGear = {
      id: 'gear_start_hammer',
      slotIndex: 1 * BOARD_COLS + 2,
      gridX: 2,
      gridY: 1,
      role: 'HAMMER',
      tier: 1,
      teeth: 10,
      power: 10,
      angle: 0,
      angularVelocity: 0,
      connected: true,
      spawnProgress: 0.2
    };

    this.gears.push(startGear);
    this.sockets[startGear.slotIndex].gearId = startGear.id;

    this.recalculateGearMeshing();
  }

  // Refresh 3 Shop Cards (matching screenshot cards: Berserker 12, Rogue 11, Gold Cog 10)
  public refreshShop() {
    // If first wave, guarantee the screenshot card lineup!
    if (this.stats.wave === 1 && this.shopCards.length === 0) {
      this.shopCards = [
        { id: 'card_1', role: 'BERSERKER', tier: 1, cost: 12 },
        { id: 'card_2', role: 'ROGUE', tier: 1, cost: 11 },
        { id: 'card_3', role: 'GOLD_COG', tier: 1, cost: 10 }
      ];
      this.notify();
      return;
    }

    const availableRoles: GearRole[] = [
      'BERSERKER',
      'ROGUE',
      'GOLD_COG',
      'HAMMER',
      'ARCHER',
      'KNIGHT',
      'TESLA',
      'BOMB'
    ];

    this.shopCards = [];
    for (let i = 0; i < 3; i++) {
      const chosenRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      const def = GEAR_DEFINITIONS[chosenRole];
      this.shopCards.push({
        id: `card_${Date.now()}_${i}_${Math.random()}`,
        role: chosenRole,
        tier: 1,
        cost: def.baseCost
      });
    }
    this.notify();
  }

  // Reroll Shop (costs 5 nuts as in screenshot)
  public rerollShop(): boolean {
    if (this.stats.nuts < 5 || this.phase === 'FIGHT') return false;
    this.stats.nuts -= 5;
    this.refreshShop();
    sound.goldDing();
    return true;
  }

  // Buy a shop card and place it in the first empty socket (or target socket)
  public buyShopCard(card: ShopCard, targetSocketIndex?: number): boolean {
    if (this.stats.nuts < card.cost || this.phase === 'FIGHT') return false;

    // Find available socket if not specified
    let targetIndex = targetSocketIndex;
    if (targetIndex === undefined || this.sockets[targetIndex].gearId) {
      const emptySocket = this.sockets.find((s) => !s.gearId && !s.isMotorPin);
      if (!emptySocket) return false; // Board full
      targetIndex = emptySocket.index;
    }

    const socket = this.sockets[targetIndex];
    if (socket.isMotorPin) return false;

    this.stats.nuts -= card.cost;
    const def = GEAR_DEFINITIONS[card.role];

    const newGear: PlacedGear = {
      id: `gear_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      slotIndex: targetIndex,
      gridX: socket.x,
      gridY: socket.y,
      role: card.role,
      tier: card.tier,
      teeth: def.teeth,
      power: def.power,
      angle: 0,
      angularVelocity: 0,
      connected: false,
      spawnProgress: 0
    };

    socket.gearId = newGear.id;
    this.gears.push(newGear);

    sound.gearSnap();
    this.recalculateGearMeshing();

    // Remove bought card from shop & replenish
    this.shopCards = this.shopCards.filter((c) => c.id !== card.id);
    if (this.shopCards.length < 3) {
      const availableRoles: GearRole[] = ['BERSERKER', 'ROGUE', 'GOLD_COG', 'HAMMER', 'ARCHER', 'KNIGHT', 'TESLA'];
      const chosenRole = availableRoles[Math.floor(Math.random() * availableRoles.length)];
      const nextDef = GEAR_DEFINITIONS[chosenRole];
      this.shopCards.push({
        id: `card_${Date.now()}_${Math.random()}`,
        role: chosenRole,
        tier: 1,
        cost: nextDef.baseCost
      });
    }

    this.notify();
    return true;
  }

  // Move or Merge Gear
  public moveOrMergeGear(gearId: string, targetIndex: number): boolean {
    if (this.phase === 'FIGHT') return false;
    if (targetIndex < 0 || targetIndex >= this.sockets.length) return false;

    const targetSocket = this.sockets[targetIndex];
    if (targetSocket.isMotorPin) return false; // Cannot place directly over gold motor pins

    const movingGear = this.gears.find((g) => g.id === gearId);
    if (!movingGear) return false;

    // Check if target socket has a gear
    if (targetSocket.gearId && targetSocket.gearId !== movingGear.id) {
      const targetGear = this.gears.find((g) => g.id === targetSocket.gearId);
      if (targetGear) {
        // MERGE CONDITION: same role & tier
        if (targetGear.role === movingGear.role && targetGear.tier === movingGear.tier && targetGear.tier < 3) {
          targetGear.tier += 1;
          targetGear.power = Math.round(targetGear.power * 1.5);

          // Clear moving gear
          const oldSocket = this.sockets[movingGear.slotIndex];
          if (oldSocket) oldSocket.gearId = null;
          this.gears = this.gears.filter((g) => g.id !== movingGear.id);

          sound.mergeSuccess();
          this.recalculateGearMeshing();
          this.notify();
          return true;
        } else {
          // SWAP positions
          const oldIndex = movingGear.slotIndex;
          this.sockets[oldIndex].gearId = targetGear.id;
          targetGear.slotIndex = oldIndex;
          targetGear.gridX = this.sockets[oldIndex].x;
          targetGear.gridY = this.sockets[oldIndex].y;

          targetSocket.gearId = movingGear.id;
          movingGear.slotIndex = targetIndex;
          movingGear.gridX = targetSocket.x;
          movingGear.gridY = targetSocket.y;

          sound.gearSnap();
          this.recalculateGearMeshing();
          this.notify();
          return true;
        }
      }
    }

    // Empty target socket
    const oldSocket = this.sockets[movingGear.slotIndex];
    if (oldSocket) oldSocket.gearId = null;

    targetSocket.gearId = movingGear.id;
    movingGear.slotIndex = targetIndex;
    movingGear.gridX = targetSocket.x;
    movingGear.gridY = targetSocket.y;

    sound.gearSnap();
    this.recalculateGearMeshing();
    this.notify();
    return true;
  }

  // Sell / Dismantle gear
  public sellGear(gearId: string): boolean {
    if (this.phase === 'FIGHT') return false;
    const gear = this.gears.find((g) => g.id === gearId);
    if (!gear) return false;

    const def = GEAR_DEFINITIONS[gear.role];
    const refund = Math.floor(def.baseCost * (gear.tier === 1 ? 0.6 : gear.tier === 2 ? 1.2 : 2.4));
    this.stats.nuts += refund;

    const socket = this.sockets[gear.slotIndex];
    if (socket) socket.gearId = null;
    this.gears = this.gears.filter((g) => g.id !== gearId);

    sound.goldDing();
    this.recalculateGearMeshing();
    this.notify();
    return true;
  }

  // Recalculate Gear Network & Speed Propagation from Golden Motor Pins
  public recalculateGearMeshing() {
    // Reset all gears
    for (const g of this.gears) {
      g.connected = false;
      g.angularVelocity = 0;
    }

    // Base Motor speed
    const motorBuff = this.buffs.find((b) => b.id === 'motor_rpm')?.level || 0;
    const baseRpm = 25 * (1 + motorBuff * 0.12);
    const motorOmega = (baseRpm * (2 * Math.PI)) / 60;

    // Grid map of gears: key = `${x},${y}`
    const gearMap = new Map<string, PlacedGear>();
    for (const g of this.gears) {
      gearMap.set(`${g.gridX},${g.gridY}`, g);
    }

    // Find all motor pins
    const motorPins = this.sockets.filter((s) => s.isMotorPin);

    // BFS queue
    interface QueueItem {
      gear: PlacedGear;
      omega: number;
    }
    const queue: QueueItem[] = [];
    const visited = new Set<string>();

    // Initial pass: any gear touching a motor pin connects directly!
    for (const pin of motorPins) {
      // Adjacent cells (orthogonal & diagonal contact for gears)
      const neighbors = [
        { x: pin.x + 1, y: pin.y },
        { x: pin.x - 1, y: pin.y },
        { x: pin.x, y: pin.y + 1 },
        { x: pin.x, y: pin.y - 1 },
        { x: pin.x + 1, y: pin.y - 1 },
        { x: pin.x - 1, y: pin.y + 1 },
        { x: pin.x + 1, y: pin.y + 1 },
        { x: pin.x - 1, y: pin.y - 1 }
      ];

      for (const n of neighbors) {
        const gear = gearMap.get(`${n.x},${n.y}`);
        if (gear && !visited.has(gear.id)) {
          visited.add(gear.id);
          gear.connected = true;
          gear.angularVelocity = motorOmega;
          queue.push({ gear, omega: motorOmega });
        }
      }
    }

    // Propagate rotation through interconnected gears
    while (queue.length > 0) {
      const current = queue.shift()!;
      const curGear = current.gear;
      const curOmega = current.omega;

      const directions = [
        { dx: 1, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 0, dy: -1 },
        { dx: 1, dy: 1 },
        { dx: -1, dy: 1 },
        { dx: 1, dy: -1 },
        { dx: -1, dy: -1 }
      ];

      for (const d of directions) {
        const nx = curGear.gridX + d.dx;
        const ny = curGear.gridY + d.dy;
        const neighbor = gearMap.get(`${nx},${ny}`);

        if (neighbor && !visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          neighbor.connected = true;

          // Meshing teeth ratio & reverse rotation direction
          let nextOmega = -curOmega * (curGear.teeth / neighbor.teeth);

          // If adjacent to Gold Cog, get boost
          if (curGear.role === 'GOLD_COG' || neighbor.role === 'GOLD_COG') {
            nextOmega *= 1.3;
          }

          neighbor.angularVelocity = nextOmega;
          queue.push({ gear: neighbor, omega: nextOmega });
        }
      }
    }
  }

  // Start the FIGHT wave! (Triggered by the big green FIGHT! button)
  public startFight() {
    if (this.phase === 'FIGHT') return;

    this.phase = 'FIGHT';
    this.stats.isFighting = true;
    sound.overclockBoost();

    // Clean field
    this.enemies = [];
    this.friendlyUnits = [];
    this.projectiles = [];
    this.particles = [];
    this.waveTimer = 0;

    // Build wave spawn schedule based on wave number (1 - 12)
    const waveNum = this.stats.wave;
    this.waveSpawnQueue = [];

    const isBossWave = waveNum === 12;
    const isMiniBossWave = waveNum === 6;

    if (isBossWave) {
      // MEGA BOSS
      this.waveSpawnQueue.push({ type: 'boss', delay: 1.0 });
      this.waveSpawnQueue.push({ type: 'mortar', delay: 3.5 });
      this.waveSpawnQueue.push({ type: 'mortar', delay: 5.0 });
      this.waveSpawnQueue.push({ type: 'scout', delay: 7.0 });
      this.waveSpawnQueue.push({ type: 'brute', delay: 9.0 });
    } else if (isMiniBossWave) {
      this.waveSpawnQueue.push({ type: 'brute', delay: 1.0 });
      this.waveSpawnQueue.push({ type: 'brute', delay: 3.0 });
      this.waveSpawnQueue.push({ type: 'mortar', delay: 5.0 });
      this.waveSpawnQueue.push({ type: 'scout', delay: 6.5 });
    } else {
      const enemyCount = 3 + waveNum * 2;
      for (let i = 0; i < enemyCount; i++) {
        const typeRoll = Math.random();
        const type = typeRoll < 0.5 ? 'grunt' : typeRoll < 0.8 ? 'scout' : 'brute';
        this.waveSpawnQueue.push({
          type,
          delay: 0.8 + i * (2.2 - Math.min(1.2, waveNum * 0.08))
        });
      }
    }

    this.recalculateGearMeshing();
    this.notify();
  }

  // Buy a Buff Upgrade using Gems
  public buyBuff(buffId: string): boolean {
    const buff = this.buffs.find((b) => b.id === buffId);
    if (!buff || buff.level >= buff.maxLevel) return false;
    if (this.stats.gems < buff.costGems) return false;

    this.stats.gems -= buff.costGems;
    buff.level += 1;
    buff.costGems = Math.round(buff.costGems * 1.5);

    if (buff.id === 'base_hearts') {
      this.stats.maxHearts += 3;
      this.stats.hearts += 3;
    }

    sound.mergeSuccess();
    this.recalculateGearMeshing();
    this.notify();
    return true;
  }

  // Main 60fps Loop Update
  public update(rawDt: number) {
    const dt = Math.min(rawDt, 0.05) * this.gameSpeed;

    // Decay screen shake
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 25);
    }

    // Always rotate connected gears & motor pins smoothly
    for (const pin of this.sockets.filter((s) => s.isMotorPin)) {
      pin.motorAngle += (2.5 * dt * (this.phase === 'FIGHT' ? 2.0 : 1.0));
    }

    for (const g of this.gears) {
      if (g.connected && g.angularVelocity !== 0) {
        const mult = this.phase === 'FIGHT' ? 2.2 : 0.8;
        g.angle += g.angularVelocity * dt * mult;

        if (this.phase === 'FIGHT') {
          // Accumulate spawn/attack progress
          const revsPerSec = Math.abs(g.angularVelocity * mult) / (2 * Math.PI);
          g.spawnProgress += revsPerSec * dt * 0.85;

          if (g.spawnProgress >= 1.0) {
            g.spawnProgress -= 1.0;
            this.triggerGearEffect(g);
          }
        }
      }
    }

    // IF FIGHT PHASE
    if (this.phase === 'FIGHT') {
      this.waveTimer += dt;

      // 1. Spawn Wave Enemies
      for (let i = this.waveSpawnQueue.length - 1; i >= 0; i--) {
        const item = this.waveSpawnQueue[i];
        if (this.waveTimer >= item.delay) {
          this.spawnEnemy(item.type);
          this.waveSpawnQueue.splice(i, 1);
        }
      }

      // 2. Update Friendly Units
      for (const unit of this.friendlyUnits) {
        if (unit.state === 'dead') continue;
        unit.animTimer += dt * 5;
        if (unit.attackCooldown > 0) unit.attackCooldown -= dt;

        // Find nearest enemy ahead
        const target = this.enemies.find((e) => e.state !== 'dead' && Math.abs(e.x - unit.x) < unit.range);

        if (target) {
          unit.state = 'attack';
          unit.targetEnemyId = target.id;
          if (unit.attackCooldown <= 0) {
            unit.attackCooldown = 1.0;
            target.hp -= unit.dmg;
            sound.swordClash();
            this.screenShake = 4;

            // Damage text particle
            this.particles.push({
              x: target.x,
              y: target.y - 15,
              vx: 0,
              vy: -35,
              alpha: 1,
              life: 0,
              maxLife: 0.6,
              color: '#FFFFFF',
              size: 14,
              type: 'text',
              text: `-${unit.dmg}`
            });
          }
        } else {
          unit.state = 'walk';
          unit.x += unit.speed * 60 * dt;
        }
      }

      // 3. Update Enemies
      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        enemy.animTimer += dt * 5;
        if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;

        // Check if friendly unit blocks path
        const opponent = this.friendlyUnits.find(
          (u) => u.state !== 'dead' && Math.abs(u.x - enemy.x) < 30
        );

        if (opponent) {
          enemy.state = 'attack';
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = 1.2;
            opponent.hp -= enemy.dmg;
            sound.swordClash();
          }
        } else {
          // Walk left toward player's base line (at x = 60)
          enemy.state = 'walk';
          enemy.x -= enemy.speed * 50 * dt;

          // Breached player defense line!
          if (enemy.x <= 70) {
            enemy.state = 'dead';
            this.stats.hearts = Math.max(0, this.stats.hearts - 1);
            this.screenShake = 12;
            sound.swordClash();

            // Heart lost particle
            this.particles.push({
              x: 80,
              y: enemy.y,
              vx: 0,
              vy: -40,
              alpha: 1,
              life: 0,
              maxLife: 0.8,
              color: '#F43F5E',
              size: 16,
              type: 'text',
              text: '-1 ❤️'
            });

            if (this.stats.hearts <= 0) {
              this.phase = 'GAME_OVER';
              sound.playDefeat();
              this.notify();
              return;
            }
          }
        }

        // Check enemy death
        if (enemy.hp <= 0 && enemy.state !== 'dead') {
          enemy.state = 'dead';
          this.stats.nuts += enemy.type === 'boss' ? 25 : 3;
          this.stats.gems += enemy.type === 'boss' ? 15 : 2;
          this.stats.score += 50;
          sound.goldDing();

          for (let p = 0; p < 8; p++) {
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 80,
              vy: (Math.random() - 0.5) * 80,
              alpha: 1,
              life: 0,
              maxLife: 0.5,
              color: '#F59E0B',
              size: 5,
              type: 'spark'
            });
          }
        }
      }

      // 4. Update Projectiles
      for (let p = this.projectiles.length - 1; p >= 0; p--) {
        const proj = this.projectiles[p];
        proj.progress += proj.speed * dt;
        if (proj.progress >= 1.0) {
          // Impact
          this.executeProjectileImpact(proj);
          this.projectiles.splice(p, 1);
        } else {
          proj.x = proj.startX + (proj.targetX - proj.startX) * proj.progress;
          proj.y = proj.startY + (proj.targetY - proj.startY) * proj.progress;
        }
      }

      // Clean dead entities
      this.enemies = this.enemies.filter((e) => e.state !== 'dead');
      this.friendlyUnits = this.friendlyUnits.filter((u) => u.hp > 0);

      // Check Wave Victory
      if (this.waveSpawnQueue.length === 0 && this.enemies.length === 0) {
        this.handleWaveClear();
      }
    }

    // 5. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }

  // Trigger effect when gear completes a revolution
  private triggerGearEffect(gear: PlacedGear) {
    const def = GEAR_DEFINITIONS[gear.role];

    if (gear.role === 'GOLD_COG') {
      const bonus = gear.tier * 2;
      this.stats.nuts += bonus;
      sound.goldDing();
      this.particles.push({
        x: 140 + gear.gridX * 65,
        y: 200 + gear.gridY * 65,
        vx: 0,
        vy: -40,
        alpha: 1,
        life: 0,
        maxLife: 0.6,
        color: '#EAB308',
        size: 13,
        type: 'text',
        text: `+${bonus} 🔩`
      });
      return;
    }

    if (gear.role === 'HAMMER') {
      sound.hammerSlam();
      this.screenShake = 8;
      // AOE shockwave damage to nearby enemies
      for (const e of this.enemies) {
        if (Math.abs(e.x - 320) < 160) {
          e.hp -= def.dmg * gear.tier;
          e.x += 15; // knockback
        }
      }
      this.particles.push({
        x: 320,
        y: 160,
        vx: 0,
        vy: -20,
        alpha: 1,
        life: 0,
        maxLife: 0.5,
        color: '#F59E0B',
        size: 16,
        type: 'text',
        text: 'SLAM!'
      });
      return;
    }

    if (gear.role === 'TESLA') {
      sound.arrowShot();
      // Zap up to 3 enemies
      const targets = this.enemies.slice(0, 3);
      for (const t of targets) {
        t.hp -= def.dmg * gear.tier;
        this.particles.push({
          x: t.x,
          y: t.y - 10,
          vx: 0,
          vy: -25,
          alpha: 1,
          life: 0,
          maxLife: 0.4,
          color: '#EC4899',
          size: 12,
          type: 'text',
          text: `-${def.dmg}`
        });
      }
      return;
    }

    // SPAWN WARRIOR (Berserker, Rogue, Archer, Knight)
    const warriorBuff = this.buffs.find((b) => b.id === 'warrior_dmg')?.level || 0;
    const dmgMult = 1 + warriorBuff * 0.15;

    const unit: FriendlyUnit = {
      id: `unit_${Date.now()}_${Math.random()}`,
      role: gear.role,
      name: def.name,
      x: 100,
      y: 110 + (Math.random() - 0.5) * 60,
      hp: Math.round(def.hp * (gear.tier === 1 ? 1 : gear.tier === 2 ? 1.5 : 2.2)),
      maxHp: Math.round(def.hp * (gear.tier === 1 ? 1 : gear.tier === 2 ? 1.5 : 2.2)),
      dmg: Math.round(def.dmg * dmgMult * (gear.tier === 1 ? 1 : gear.tier === 2 ? 1.4 : 2.0)),
      speed: gear.role === 'ROGUE' ? 1.4 : 1.0,
      range: gear.role === 'ARCHER' ? 200 : 35,
      tier: gear.tier,
      state: 'walk',
      animTimer: Math.random() * 2,
      attackCooldown: 0,
      targetEnemyId: null
    };

    this.friendlyUnits.push(unit);
    sound.gearTick();
  }

  private spawnEnemy(type: 'grunt' | 'scout' | 'brute' | 'mortar' | 'boss') {
    let hp = 70 + this.stats.wave * 18;
    let dmg = 12 + this.stats.wave * 2;
    let speed = 0.9;
    let name = 'Goblin Grunt';

    if (type === 'scout') {
      hp = 50 + this.stats.wave * 12;
      dmg = 10 + this.stats.wave * 2;
      speed = 1.4;
      name = 'Quick Scout';
    } else if (type === 'brute') {
      hp = 180 + this.stats.wave * 35;
      dmg = 24 + this.stats.wave * 4;
      speed = 0.65;
      name = 'Iron Brute';
    } else if (type === 'boss') {
      hp = 900;
      dmg = 45;
      speed = 0.45;
      name = 'Colossus Titan';
    }

    const enemy: Enemy = {
      id: `enemy_${Date.now()}_${Math.random()}`,
      name,
      type,
      x: 480,
      y: 110 + (Math.random() - 0.5) * 60,
      hp,
      maxHp: hp,
      dmg,
      speed,
      state: 'walk',
      animTimer: Math.random() * 2,
      attackCooldown: 0
    };

    this.enemies.push(enemy);
  }

  private executeProjectileImpact(proj: Projectile) {
    sound.swordClash();
    for (const e of this.enemies) {
      if (Math.abs(e.x - proj.targetX) < 40) {
        e.hp -= proj.dmg;
      }
    }
  }

  private handleWaveClear() {
    this.phase = 'WAVE_CLEAR';
    sound.playVictory();

    // Nut bonus
    const nutBuff = this.buffs.find((b) => b.id === 'nut_income')?.level || 0;
    const waveRewardNuts = 10 + this.stats.wave * 2 + nutBuff * 3;
    const waveRewardGems = 5 + this.stats.wave;

    this.stats.nuts += waveRewardNuts;
    this.stats.gems += waveRewardGems;

    if (this.stats.wave >= this.stats.maxWaves) {
      this.phase = 'VICTORY';
    } else {
      setTimeout(() => {
        this.stats.wave += 1;
        this.phase = 'BUILD';
        this.stats.isFighting = false;
        this.refreshShop();
        this.notify();
      }, 1600);
    }

    this.notify();
  }
}

export const gameEngine = new GameEngine();
