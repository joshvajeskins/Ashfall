import * as Phaser from 'phaser';

export type TransitionType = 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom';

interface TransitionConfig {
  type: TransitionType;
  duration?: number;
  ease?: string;
  color?: number;
}

export class TransitionManager {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isTransitioning: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get transitioning(): boolean {
    return this.isTransitioning;
  }

  fadeIn(duration: number = 500, color: number = 0x000000): Promise<void> {
    return new Promise((resolve) => {
      this.createOverlay(color, 1);
      this.isTransitioning = true;

      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.destroyOverlay();
          this.isTransitioning = false;
          resolve();
        }
      });
    });
  }

  fadeOut(duration: number = 500, color: number = 0x000000): Promise<void> {
    return new Promise((resolve) => {
      this.createOverlay(color, 0);
      this.isTransitioning = true;

      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration,
        ease: 'Power2',
        onComplete: () => {
          this.isTransitioning = false;
          resolve();
        }
      });
    });
  }

  async fadeToScene(targetScene: string, duration: number = 500): Promise<void> {
    await this.fadeOut(duration / 2);
    this.scene.scene.start(targetScene);
  }

  slideIn(direction: 'left' | 'right' | 'up' | 'down', duration: number = 400): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scene.cameras.main;
      this.createOverlay(0x000000, 1);
      this.isTransitioning = true;

      const startPos = this.getSlideStartPosition(direction, width, height);
      const endPos = { x: 0, y: 0 };

      if (this.overlay) {
        this.overlay.setPosition(startPos.x + width / 2, startPos.y + height / 2);

        this.scene.tweens.add({
          targets: this.overlay,
          x: endPos.x + width / 2,
          y: endPos.y + height / 2,
          alpha: 0,
          duration,
          ease: 'Power2',
          onComplete: () => {
            this.destroyOverlay();
            this.isTransitioning = false;
            resolve();
          }
        });
      }
    });
  }

  slideOut(direction: 'left' | 'right' | 'up' | 'down', duration: number = 400): Promise<void> {
    return new Promise((resolve) => {
      const { width, height } = this.scene.cameras.main;
      this.createOverlay(0x000000, 0);
      this.isTransitioning = true;

      const endPos = this.getSlideStartPosition(direction, width, height);

      if (this.overlay) {
        this.scene.tweens.add({
          targets: this.overlay,
          x: endPos.x + width / 2,
          y: endPos.y + height / 2,
          alpha: 1,
          duration,
          ease: 'Power2',
          onComplete: () => {
            this.isTransitioning = false;
            resolve();
          }
        });
      }
    });
  }

  async transition(config: TransitionConfig): Promise<void> {
    const { type, duration = 500, color = 0x000000 } = config;

    switch (type) {
      case 'fade':
        await this.fadeOut(duration / 2, color);
        break;
      case 'slide-left':
        await this.slideOut('left', duration);
        break;
      case 'slide-right':
        await this.slideOut('right', duration);
        break;
      case 'slide-up':
        await this.slideOut('up', duration);
        break;
      case 'slide-down':
        await this.slideOut('down', duration);
        break;
      case 'zoom':
        await this.zoomOut(duration, color);
        break;
    }
  }

  private zoomOut(duration: number, color: number): Promise<void> {
    return new Promise((resolve) => {
      this.createOverlay(color, 0);
      this.isTransitioning = true;

      if (this.overlay) {
        this.overlay.setScale(0.1);
        this.scene.tweens.add({
          targets: this.overlay,
          scaleX: 2,
          scaleY: 2,
          alpha: 1,
          duration,
          ease: 'Power2',
          onComplete: () => {
            this.isTransitioning = false;
            resolve();
          }
        });
      }
    });
  }

  private getSlideStartPosition(
    direction: string,
    width: number,
    height: number
  ): { x: number; y: number } {
    switch (direction) {
      case 'left': return { x: -width, y: 0 };
      case 'right': return { x: width, y: 0 };
      case 'up': return { x: 0, y: -height };
      case 'down': return { x: 0, y: height };
      default: return { x: 0, y: 0 };
    }
  }

  private createOverlay(color: number, alpha: number): void {
    const { width, height } = this.scene.cameras.main;
    this.overlay = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 2,
      height * 2,
      color,
      alpha
    );
    this.overlay.setDepth(1000);
  }

  private destroyOverlay(): void {
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
  }

  destroy(): void {
    this.destroyOverlay();
  }
}
