import * as Phaser from 'phaser';
import type { ItemRarity } from '@/types';

interface RarityColors {
  primary: number;
  secondary: number;
  glow: number;
}

const RARITY_COLORS: Record<ItemRarity, RarityColors> = {
  Common: { primary: 0x9ca3af, secondary: 0x6b7280, glow: 0x9ca3af },
  Uncommon: { primary: 0x22c55e, secondary: 0x16a34a, glow: 0x4ade80 },
  Rare: { primary: 0x3b82f6, secondary: 0x2563eb, glow: 0x60a5fa },
  Epic: { primary: 0xa855f7, secondary: 0x9333ea, glow: 0xc084fc },
  Legendary: { primary: 0xfbbf24, secondary: 0xf59e0b, glow: 0xfcd34d }
};

export class RarityEffects {
  private scene: Phaser.Scene;
  private activeEffects: Map<Phaser.GameObjects.GameObject, Phaser.Tweens.Tween[]> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  getColors(rarity: ItemRarity): RarityColors {
    return RARITY_COLORS[rarity];
  }

  applyEffect(target: Phaser.GameObjects.GameObject, rarity: ItemRarity): void {
    this.removeEffect(target);

    switch (rarity) {
      case 'Legendary':
        this.applyLegendaryGlow(target);
        break;
      case 'Epic':
        this.applyEpicPulse(target);
        break;
      case 'Rare':
        this.applyRareShimmer(target);
        break;
      case 'Uncommon':
        this.applyUncommonShine(target);
        break;
    }
  }

  private applyLegendaryGlow(target: Phaser.GameObjects.GameObject): void {
    const tweens: Phaser.Tweens.Tween[] = [];
    const colors = RARITY_COLORS.Legendary;

    // Outer glow ring
    if ('x' in target && 'y' in target) {
      const glow = this.scene.add.circle(
        (target as any).x,
        (target as any).y,
        20,
        colors.glow,
        0.3
      );
      glow.setDepth((target as any).depth - 1 || 0);

      // Pulsing glow
      const glowTween = this.scene.tweens.add({
        targets: glow,
        scaleX: 1.3,
        scaleY: 1.3,
        alpha: 0.1,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      // Follow target
      const updateEvent = this.scene.events.on('update', () => {
        if (glow.active) {
          glow.setPosition((target as any).x, (target as any).y);
        }
      });

      tweens.push(glowTween);
      (glow as any)._updateEvent = updateEvent;
      (target as any)._glowEffect = glow;
    }

    // Color cycling on target if it has tint
    if ('setTint' in target) {
      const colorTween = this.scene.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 2000,
        repeat: -1,
        onUpdate: (tween) => {
          const value = tween.getValue() ?? 0;
          const hue = (value / 100) * 0.1 + 0.12; // Golden range
          const color = Phaser.Display.Color.HSLToColor(hue, 1, 0.6);
          (target as any).setTint(color.color);
        }
      });
      tweens.push(colorTween);
    }

    this.activeEffects.set(target, tweens);
  }

  private applyEpicPulse(target: Phaser.GameObjects.GameObject): void {
    const tweens: Phaser.Tweens.Tween[] = [];

    if ('setScale' in target && 'setAlpha' in target) {
      const originalScale = (target as any).scaleX || 1;

      const pulseTween = this.scene.tweens.add({
        targets: target,
        scaleX: originalScale * 1.1,
        scaleY: originalScale * 1.1,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      tweens.push(pulseTween);
    }

    if ('setTint' in target) {
      (target as any).setTint(RARITY_COLORS.Epic.primary);
    }

    this.activeEffects.set(target, tweens);
  }

  private applyRareShimmer(target: Phaser.GameObjects.GameObject): void {
    const tweens: Phaser.Tweens.Tween[] = [];

    if ('setAlpha' in target) {
      const shimmerTween = this.scene.tweens.add({
        targets: target,
        alpha: { from: 1, to: 0.7 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      tweens.push(shimmerTween);
    }

    if ('setTint' in target) {
      (target as any).setTint(RARITY_COLORS.Rare.primary);
    }

    this.activeEffects.set(target, tweens);
  }

  private applyUncommonShine(target: Phaser.GameObjects.GameObject): void {
    if ('setTint' in target) {
      (target as any).setTint(RARITY_COLORS.Uncommon.primary);
    }

    // Occasional shine flash
    const flashInterval = this.scene.time.addEvent({
      delay: 3000,
      callback: () => {
        if ('setAlpha' in target && (target as any).active) {
          this.scene.tweens.add({
            targets: target,
            alpha: 1.2,
            duration: 100,
            yoyo: true,
            ease: 'Power2'
          });
        }
      },
      loop: true
    });

    (target as any)._flashInterval = flashInterval;
    this.activeEffects.set(target, []);
  }

  removeEffect(target: Phaser.GameObjects.GameObject): void {
    const tweens = this.activeEffects.get(target);
    if (tweens) {
      tweens.forEach(tween => tween.destroy());
      this.activeEffects.delete(target);
    }

    // Clean up glow effect
    if ((target as any)._glowEffect) {
      const glow = (target as any)._glowEffect;
      if (glow._updateEvent) {
        this.scene.events.off('update', glow._updateEvent);
      }
      glow.destroy();
      delete (target as any)._glowEffect;
    }

    // Clean up flash interval
    if ((target as any)._flashInterval) {
      (target as any)._flashInterval.destroy();
      delete (target as any)._flashInterval;
    }

    // Reset tint
    if ('clearTint' in target) {
      (target as any).clearTint();
    }
  }

  createRarityBorder(
    x: number,
    y: number,
    width: number,
    height: number,
    rarity: ItemRarity
  ): Phaser.GameObjects.Rectangle {
    const colors = RARITY_COLORS[rarity];
    const border = this.scene.add.rectangle(x, y, width, height);
    border.setStrokeStyle(2, colors.primary, 1);
    border.setFillStyle(0x000000, 0);

    if (rarity === 'Legendary' || rarity === 'Epic') {
      this.scene.tweens.add({
        targets: border,
        alpha: 0.6,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return border;
  }

  destroy(): void {
    this.activeEffects.forEach((tweens, target) => {
      this.removeEffect(target);
    });
    this.activeEffects.clear();
  }
}
