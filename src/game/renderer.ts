import { GameEngine, BOARD_COLS, BOARD_ROWS } from './engine';
import { GEAR_DEFINITIONS } from './gearDefs';
import { PlacedGear, BoardSocket, Enemy, FriendlyUnit } from './types';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: GameEngine;

  // Virtual resolution (standard vertical mobile view: 420 x 860)
  public readonly vWidth = 420;
  public readonly vHeight = 860;

  // Board socket layout
  public readonly boardOriginX = 70;
  public readonly boardOriginY = 320;
  public readonly socketSpacing = 70;
  public readonly cogRadius = 26;

  constructor(canvas: HTMLCanvasElement, engine: GameEngine) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2D context');
    this.ctx = context;
    this.engine = engine;
  }

  public render() {
    const ctx = this.ctx;
    const engine = this.engine;

    ctx.save();

    // Screen Shake
    if (engine.screenShake > 0) {
      const sx = (Math.random() - 0.5) * engine.screenShake;
      const sy = (Math.random() - 0.5) * engine.screenShake;
      ctx.translate(sx, sy);
    }

    // 1. LAVA FORGE BACKGROUND
    this.drawLavaBackground(ctx);

    // 2. BATTLEFIELD COMBAT ARENA (Visible during fight phase)
    if (engine.phase === 'FIGHT') {
      this.drawBattlefield(ctx);
    }

    // 3. GEAR GRID SOCKETS (The dark cog socket notches)
    this.drawBoardSockets(ctx);

    // 4. GOLD MOTOR PINS
    this.drawMotorPins(ctx);

    // 5. PLACED GEARS
    this.drawPlacedGears(ctx);

    // 6. UNITS (During fight phase)
    if (engine.phase === 'FIGHT') {
      this.drawCombatEntities(ctx);
    }

    // 7. PARTICLES & COMBAT FLOATING TEXT
    this.drawParticles(ctx);

    ctx.restore();
  }

  // Draw the warm molten cavern backdrop from the screenshot
  private drawLavaBackground(ctx: CanvasRenderingContext2D) {
    // Gradient: dark reddish brown at top, molten orange glow in middle/bottom
    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.vHeight);
    bgGrad.addColorStop(0, '#1E0505');    // deep dark crimson/brown
    bgGrad.addColorStop(0.2, '#380B0B');
    bgGrad.addColorStop(0.5, '#7C1D06');  // glowing magma cavern
    bgGrad.addColorStop(0.75, '#C2410C'); // bright fiery orange
    bgGrad.addColorStop(0.95, '#450A0A'); // dark floor
    bgGrad.addColorStop(1, '#1A0404');

    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.vWidth, this.vHeight);

    // Lava falls in background (as seen in screenshot)
    const lavaGrad = ctx.createLinearGradient(0, 0, 0, this.vHeight * 0.7);
    lavaGrad.addColorStop(0, 'rgba(254, 215, 170, 0.1)');
    lavaGrad.addColorStop(0.5, 'rgba(251, 146, 60, 0.25)');
    lavaGrad.addColorStop(1, 'rgba(234, 88, 12, 0)');

    ctx.fillStyle = lavaGrad;
    ctx.fillRect(180, 100, 60, 480);
    ctx.fillRect(260, 140, 40, 420);

    // Giant warhammer silhouette with "25" in background (from screenshot!)
    ctx.save();
    ctx.translate(60, 420);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.fillStyle = 'rgba(154, 52, 18, 0.35)';
    ctx.fillRect(-40, -180, 80, 220); // hammer head
    // Inscribed runes / "25"
    ctx.fillStyle = 'rgba(254, 215, 170, 0.4)';
    ctx.font = '900 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('25', 0, -60);
    ctx.restore();

    // Distant background rotating silhouette gear
    const time = performance.now() * 0.0004;
    ctx.save();
    ctx.translate(240, 580);
    ctx.rotate(time);
    ctx.strokeStyle = 'rgba(124, 45, 18, 0.3)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.stroke();
    // gear teeth
    for (let i = 0; i < 10; i++) {
      ctx.rotate((Math.PI * 2) / 10);
      ctx.fillStyle = 'rgba(124, 45, 18, 0.3)';
      ctx.fillRect(-8, 65, 16, 20);
    }
    ctx.restore();
  }

  // Draw battlefield lane where summoned warriors battle
  private drawBattlefield(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.beginPath();
    ctx.roundRect(40, 70, 340, 100, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Combat line divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(50, 120);
    ctx.lineTo(370, 120);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw the grid of dark cog-shaped socket notches on the wall (from screenshot)
  private drawBoardSockets(ctx: CanvasRenderingContext2D) {
    for (const socket of this.engine.sockets) {
      const px = this.boardOriginX + socket.x * this.socketSpacing;
      const py = this.boardOriginY + socket.y * this.socketSpacing;

      ctx.save();
      ctx.translate(px, py);

      // Dark cog silhouette socket
      ctx.fillStyle = 'rgba(30, 10, 5, 0.45)';
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.3)';
      ctx.lineWidth = 1.5;

      const teeth = 8;
      const rOuter = 20;
      const rInner = 16;

      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i * 2 * Math.PI) / teeth;
        const a2 = ((i + 0.3) * 2 * Math.PI) / teeth;
        const a3 = ((i + 0.7) * 2 * Math.PI) / teeth;
        const a4 = ((i + 1.0) * 2 * Math.PI) / teeth;

        ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
        ctx.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
        ctx.lineTo(Math.cos(a3) * rOuter, Math.sin(a3) * rOuter);
        ctx.lineTo(Math.cos(a4) * rInner, Math.sin(a4) * rInner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center hole
      ctx.fillStyle = 'rgba(20, 5, 5, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Draw the Golden Motor Pins with directional tabs (exactly as shown in screenshot!)
  private drawMotorPins(ctx: CanvasRenderingContext2D) {
    const motorSockets = this.engine.sockets.filter((s) => s.isMotorPin);

    for (const pin of motorSockets) {
      const px = this.boardOriginX + pin.x * this.socketSpacing;
      const py = this.boardOriginY + pin.y * this.socketSpacing;

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pin.motorAngle);

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(2, 3, 24, 0, Math.PI * 2);
      ctx.fill();

      // Outer gold rim
      const goldGrad = ctx.createLinearGradient(-22, -22, 22, 22);
      goldGrad.addColorStop(0, '#FEF08A');
      goldGrad.addColorStop(0.5, '#EAB308');
      goldGrad.addColorStop(1, '#854D0E');

      ctx.fillStyle = goldGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Directional pointer tab (as seen in screenshot: golden pin with protruding tab!)
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(18, -6);
      ctx.lineTo(29, 0);
      ctx.lineTo(18, 6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Inner dark bronze core with slot
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      // Center horizontal drive slot
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-9, -2.5, 18, 5);

      ctx.restore();
    }
  }

  // Draw Placed Gears (e.g. Warhammer gear with 10 💎 and electrical sparks, Berserker, Rogue)
  private drawPlacedGears(ctx: CanvasRenderingContext2D) {
    for (const gear of this.engine.gears) {
      const px = this.boardOriginX + gear.gridX * this.socketSpacing;
      const py = this.boardOriginY + gear.gridY * this.socketSpacing;

      ctx.save();
      ctx.translate(px, py);

      // Rotating Gear Body
      ctx.save();
      ctx.rotate(gear.angle);

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.arc(3, 4, this.cogRadius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Teeth
      const def = GEAR_DEFINITIONS[gear.role];
      const teeth = def.teeth;
      const rOuter = this.cogRadius + 5;
      const rInner = this.cogRadius - 2;

      ctx.fillStyle = def.color;
      ctx.strokeStyle = def.borderColor;
      ctx.lineWidth = 2;

      ctx.beginPath();
      for (let i = 0; i < teeth; i++) {
        const a1 = (i * 2 * Math.PI) / teeth;
        const a2 = ((i + 0.3) * 2 * Math.PI) / teeth;
        const a3 = ((i + 0.7) * 2 * Math.PI) / teeth;
        const a4 = ((i + 1.0) * 2 * Math.PI) / teeth;

        ctx.lineTo(Math.cos(a1) * rInner, Math.sin(a1) * rInner);
        ctx.lineTo(Math.cos(a2) * rOuter, Math.sin(a2) * rOuter);
        ctx.lineTo(Math.cos(a3) * rOuter, Math.sin(a3) * rOuter);
        ctx.lineTo(Math.cos(a4) * rInner, Math.sin(a4) * rInner);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner Hub Circle
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Draw Gear Graphic (Hammer, Berserker face, Rogue face, or Gold Number)
      if (gear.role === 'HAMMER') {
        this.drawHammerGraphic(ctx);
      } else if (gear.role === 'BERSERKER') {
        this.drawBerserkerGraphic(ctx);
      } else if (gear.role === 'ROGUE') {
        this.drawRogueGraphic(ctx);
      } else if (gear.role === 'GOLD_COG') {
        this.drawGoldCogGraphic(ctx, gear.tier);
      } else {
        this.drawGenericGraphic(ctx, gear.role);
      }

      ctx.restore(); // Restore gear rotation

      // Electric sparks around connected gear (as seen in screenshot around Hammer gear!)
      if (gear.connected) {
        ctx.strokeStyle = '#BAE6FD';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sparkTime = performance.now() * 0.01;
        for (let s = 0; s < 3; s++) {
          const sa = (s * Math.PI * 2) / 3 + sparkTime;
          const sx1 = Math.cos(sa) * 28;
          const sy1 = Math.sin(sa) * 28;
          const sx2 = Math.cos(sa + 0.2) * 36;
          const sy2 = Math.sin(sa + 0.2) * 36;
          ctx.moveTo(sx1, sy1);
          ctx.lineTo(sx2, sy2);
        }
        ctx.stroke();
      }

      // POWER BADGE WITH PINK GEM (as seen in screenshot: "10 💎"!)
      const badgeY = 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-22, badgeY - 11, 44, 22, 6);
      ctx.fill();
      ctx.strokeStyle = '#F472B6';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Power Number
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${gear.power}`, 5, badgeY);

      // Pink Diamond Gem
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.moveTo(10, badgeY - 5);
      ctx.lineTo(15, badgeY - 5);
      ctx.lineTo(17, badgeY);
      ctx.lineTo(12.5, badgeY + 6);
      ctx.lineTo(8, badgeY);
      ctx.closePath();
      ctx.fill();

      // Tier Stars on bottom if tier > 1
      if (gear.tier > 1) {
        ctx.fillStyle = '#FACC15';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(gear.tier === 2 ? '★★' : '★★★', 0, 24);
      }

      ctx.restore();
    }
  }

  private drawHammerGraphic(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.rotate((35 * Math.PI) / 180);
    // Handle
    ctx.fillStyle = '#92400E';
    ctx.fillRect(-2.5, -4, 5, 20);
    // Heavy head
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.roundRect(-10, -14, 20, 11, 3);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  private drawBerserkerGraphic(ctx: CanvasRenderingContext2D) {
    // Red-bearded cartoon face
    // Face skin
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Red hair & beard
    ctx.fillStyle = '#EF4444';
    // Hair on top
    ctx.beginPath();
    ctx.arc(0, -5, 12, Math.PI, Math.PI * 2);
    ctx.fill();
    // Bushy beard below
    ctx.beginPath();
    ctx.arc(0, 5, 10, 0, Math.PI);
    ctx.fill();

    // Fierce eyes with blue paint
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(-7, -4, 5, 3);
    ctx.fillRect(2, -4, 5, 3);
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-4, -2, 1.5, 0, Math.PI * 2);
    ctx.arc(4, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRogueGraphic(ctx: CanvasRenderingContext2D) {
    // Green topknot warrior
    // Face skin
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();

    // Topknot hair
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.arc(0, -11, 5, 0, Math.PI * 2);
    ctx.fill();

    // Green bandana
    ctx.fillStyle = '#22C55E';
    ctx.fillRect(-10, -6, 20, 5);

    // Determined eyes
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(-4, 0, 1.5, 0, Math.PI * 2);
    ctx.arc(4, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGoldCogGraphic(ctx: CanvasRenderingContext2D, tier: number) {
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#854D0E';
    ctx.font = '900 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${tier}`, 0, 1);
  }

  private drawGenericGraphic(ctx: CanvasRenderingContext2D, role: string) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(role.substring(0, 4), 0, 0);
  }

  // Draw Units & Enemies during Fight Phase
  private drawCombatEntities(ctx: CanvasRenderingContext2D) {
    // Draw Friendly Units
    for (const unit of this.engine.friendlyUnits) {
      ctx.save();
      ctx.translate(unit.x, unit.y);

      // Walk bob
      const bob = Math.sin(unit.animTimer * 8) * 2;
      ctx.translate(0, bob);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const hpPct = Math.max(0, Math.min(1, unit.hp / unit.maxHp));
      ctx.fillStyle = '#000000';
      ctx.fillRect(-12, -22, 24, 3);
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(-12, -22, 24 * hpPct, 3);

      // Body sprite
      if (unit.role === 'BERSERKER') {
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.roundRect(-8, -12, 16, 18, 4);
        ctx.fill();
        // Red hair
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(0, -12, 6, 0, Math.PI * 2);
        ctx.fill();
        // Sword swing
        ctx.fillStyle = '#E2E8F0';
        ctx.fillRect(8, -8, 10, 3);
      } else {
        ctx.fillStyle = '#22C55E';
        ctx.beginPath();
        ctx.roundRect(-7, -12, 14, 18, 4);
        ctx.fill();
        ctx.fillStyle = '#78350F';
        ctx.beginPath();
        ctx.arc(0, -12, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw Enemies
    for (const enemy of this.engine.enemies) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);

      // Walk bob
      const bob = Math.sin(enemy.animTimer * 8) * 2;
      ctx.translate(0, bob);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 8, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const hpPct = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
      ctx.fillStyle = '#000000';
      ctx.fillRect(-14, -24, 28, 4);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-14, -24, 28 * hpPct, 4);

      if (enemy.type === 'boss') {
        // Boss Golem
        ctx.fillStyle = '#7F1D1D';
        ctx.beginPath();
        ctx.roundRect(-16, -24, 32, 30, 6);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(0, -10, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Goblin Grunt / Scout
        ctx.fillStyle = '#991B1B';
        ctx.beginPath();
        ctx.roundRect(-8, -14, 16, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, -14, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Draw Particles & Floating Combat Text
  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.engine.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'text' && p.text) {
        ctx.fillStyle = p.color;
        ctx.font = `900 ${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(p.text, p.x, p.y);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
