import * as Phaser from 'phaser';

interface ShakeConfig {
  duration?: number;
  intensity?: number;
}

interface FlashConfig {
  duration?: number;
  color?: number;
  alpha?: number;
}

export class ScreenEffects {
  private scene: Phaser.Scene;
  private flashOverlay: Phaser.GameObjects.Rectangle | null = null;
  private vignetteOverlay: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shake(config: ShakeConfig = {}): void {
    const { duration = 200, intensity = 0.01 } = config;
    this.scene.cameras.main.shake(duration, intensity);
  }

  heavyShake(): void {
    this.shake({ duration: 300, intensity: 0.03 });
  }

  lightShake(): void {
    this.shake({ duration: 100, intensity: 0.005 });
  }

  flash(config: FlashConfig = {}): void {
    const { duration = 200, color = 0xffffff, alpha = 0.5 } = config;
    const { width, height } = this.scene.cameras.main;

    this.flashOverlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 2,
      height * 2,
      color,
      alpha
    );
    this.flashOverlay.setDepth(999);
    this.flashOverlay.setScrollFactor(0);

    this.scene.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration,
      ease: 'Power2',
      onComplete: () => {
        this.flashOverlay?.destroy();
        this.flashOverlay = null;
      }
    });
  }

  redFlash(): void {
    this.flash({ color: 0xff0000, alpha: 0.4, duration: 300 });
  }

  greenFlash(): void {
    this.flash({ color: 0x00ff00, alpha: 0.3, duration: 200 });
  }

  whiteFlash(): void {
    this.flash({ color: 0xffffff, alpha: 0.6, duration: 150 });
  }

  damageEffect(): void {
    this.redFlash();
    this.lightShake();
  }

  criticalDamageEffect(): void {
    this.redFlash();
    this.heavyShake();
  }

  healEffect(): void {
    this.greenFlash();
  }

  showVignette(intensity: number = 0.5): void {
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
    }

    const { width, height } = this.scene.cameras.main;
    this.vignetteOverlay = this.scene.add.graphics();
    this.vignetteOverlay.setDepth(998);
    this.vignetteOverlay.setScrollFactor(0);

    // Create vignette effect with concentric rectangles
    for (let i = 0; i < 10; i++) {
      const alpha = (i / 10) * intensity;
      const inset = i * 30;
      this.vignetteOverlay.lineStyle(30, 0x000000, alpha);
      this.vignetteOverlay.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }
  }

  hideVignette(): void {
    if (this.vignetteOverlay) {
      this.scene.tweens.add({
        targets: this.vignetteOverlay,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.vignetteOverlay?.destroy();
          this.vignetteOverlay = null;
        }
      });
    }
  }

  lowHealthVignette(): void {
    if (this.vignetteOverlay) {
      this.vignetteOverlay.destroy();
    }

    const { width, height } = this.scene.cameras.main;
    this.vignetteOverlay = this.scene.add.graphics();
    this.vignetteOverlay.setDepth(998);
    this.vignetteOverlay.setScrollFactor(0);

    for (let i = 0; i < 8; i++) {
      const alpha = (i / 8) * 0.4;
      const inset = i * 25;
      this.vignetteOverlay.lineStyle(25, 0x8b0000, alpha);
      this.vignetteOverlay.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    }

    // Pulsing effect
    this.scene.tweens.add({
      targets: this.vignetteOverlay,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  zoomPulse(scale: number = 1.02, duration: number = 200): void {
    const camera = this.scene.cameras.main;
    const originalZoom = camera.zoom;

    this.scene.tweens.add({
      targets: camera,
      zoom: originalZoom * scale,
      duration: duration / 2,
      yoyo: true,
      ease: 'Power2'
    });
  }

  slowMotion(duration: number = 500, timeScale: number = 0.3): void {
    this.scene.time.timeScale = timeScale;

    this.scene.time.delayedCall(duration * timeScale, () => {
      this.scene.tweens.add({
        targets: this.scene.time,
        timeScale: 1,
        duration: 200,
        ease: 'Power2'
      });
    });
  }

  chromatic(offset: number = 5, duration: number = 200): void {
    // Simulate chromatic aberration with colored overlays
    const { width, height } = this.scene.cameras.main;

    const red = this.scene.add.rectangle(
      width / 2 - offset,
      height / 2,
      width,
      height,
      0xff0000,
      0.1
    );
    red.setDepth(997);
    red.setScrollFactor(0);
    red.setBlendMode(Phaser.BlendModes.ADD);

    const blue = this.scene.add.rectangle(
      width / 2 + offset,
      height / 2,
      width,
      height,
      0x0000ff,
      0.1
    );
    blue.setDepth(997);
    blue.setScrollFactor(0);
    blue.setBlendMode(Phaser.BlendModes.ADD);

    this.scene.tweens.add({
      targets: [red, blue],
      alpha: 0,
      duration,
      onComplete: () => {
        red.destroy();
        blue.destroy();
      }
    });
  }

  impactFreeze(duration: number = 50): void {
    this.scene.time.timeScale = 0;
    this.scene.time.delayedCall(1, () => {
      setTimeout(() => {
        this.scene.time.timeScale = 1;
      }, duration);
    });
  }

  destroy(): void {
    this.flashOverlay?.destroy();
    this.vignetteOverlay?.destroy();
    this.flashOverlay = null;
    this.vignetteOverlay = null;
  }
}
