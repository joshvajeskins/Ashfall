import * as Phaser from 'phaser';

interface ParticleConfig {
  x: number;
  y: number;
  count?: number;
  duration?: number;
}

export class ParticleEffects {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  hitSparks(config: ParticleConfig): void {
    const { x, y, count = 8 } = config;
    const colors = [0xffff00, 0xffa500, 0xff6600, 0xffffff];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const distance = 30 + Math.random() * 20;
      const spark = this.scene.add.circle(x, y, 3 + Math.random() * 2, colors[i % colors.length]);
      spark.setDepth(100);

      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.3,
        duration: 200 + Math.random() * 100,
        ease: 'Power2',
        onComplete: () => spark.destroy()
      });
    }
  }

  criticalHit(config: ParticleConfig): void {
    const { x, y } = config;

    // Larger sparks for critical hits
    this.hitSparks({ x, y, count: 16 });

    // Add starburst effect
    for (let i = 0; i < 4; i++) {
      const star = this.scene.add.star(x, y, 4, 5, 15, 0xffff00);
      star.setDepth(100);
      star.setAlpha(0.8);

      this.scene.tweens.add({
        targets: star,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        angle: 180,
        duration: 400,
        delay: i * 50,
        ease: 'Power2',
        onComplete: () => star.destroy()
      });
    }
  }

  lootSparkle(config: ParticleConfig): void {
    const { x, y, duration = 2000 } = config;
    const colors = [0xffd700, 0xffffff, 0xffec8b];
    const particles: Phaser.GameObjects.Arc[] = [];

    const createSparkle = () => {
      const offsetX = (Math.random() - 0.5) * 30;
      const offsetY = (Math.random() - 0.5) * 30;
      const sparkle = this.scene.add.circle(
        x + offsetX,
        y + offsetY,
        2 + Math.random() * 2,
        colors[Math.floor(Math.random() * colors.length)]
      );
      sparkle.setDepth(50);
      sparkle.setAlpha(0);
      particles.push(sparkle);

      this.scene.tweens.add({
        targets: sparkle,
        alpha: { from: 0, to: 1 },
        scale: { from: 0.5, to: 1.2 },
        duration: 200,
        yoyo: true,
        onComplete: () => {
          const index = particles.indexOf(sparkle);
          if (index > -1) particles.splice(index, 1);
          sparkle.destroy();
        }
      });
    };

    const interval = this.scene.time.addEvent({
      delay: 150,
      callback: createSparkle,
      loop: true
    });

    this.scene.time.delayedCall(duration, () => {
      interval.destroy();
      particles.forEach(p => p.destroy());
    });
  }

  levelUp(config: ParticleConfig): void {
    const { x, y } = config;
    const colors = [0x00ff00, 0x00ffff, 0xffff00, 0xffffff];

    // Rising particles
    for (let i = 0; i < 20; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const particle = this.scene.add.circle(
        x + offsetX,
        y + 30,
        4 + Math.random() * 4,
        colors[Math.floor(Math.random() * colors.length)]
      );
      particle.setDepth(100);
      particle.setAlpha(0.8);

      this.scene.tweens.add({
        targets: particle,
        y: y - 80 - Math.random() * 40,
        alpha: 0,
        scale: 0.2,
        duration: 800 + Math.random() * 400,
        delay: i * 30,
        ease: 'Power1',
        onComplete: () => particle.destroy()
      });
    }

    // Expanding ring
    const ring = this.scene.add.circle(x, y, 10, 0x00ff00, 0);
    ring.setStrokeStyle(3, 0x00ff00, 1);
    ring.setDepth(99);

    this.scene.tweens.add({
      targets: ring,
      radius: 80,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => ring.destroy()
    });

    // Text popup
    const levelText = this.scene.add.text(x, y - 20, 'LEVEL UP!', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#00ff00'
    }).setOrigin(0.5).setDepth(101);

    this.scene.tweens.add({
      targets: levelText,
      y: y - 60,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => levelText.destroy()
    });
  }

  deathSmoke(config: ParticleConfig): void {
    const { x, y, count = 15 } = config;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      const smoke = this.scene.add.circle(
        x + offsetX,
        y + offsetY,
        8 + Math.random() * 12,
        0x333333
      );
      smoke.setDepth(90);
      smoke.setAlpha(0);

      this.scene.tweens.add({
        targets: smoke,
        y: smoke.y - 30 - Math.random() * 20,
        scaleX: 2,
        scaleY: 2,
        alpha: { from: 0.6, to: 0 },
        duration: 800 + Math.random() * 400,
        delay: i * 50,
        ease: 'Power1',
        onComplete: () => smoke.destroy()
      });
    }
  }

  itemPickup(config: ParticleConfig): void {
    const { x, y } = config;

    // Swirling particles going up
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6;
      const particle = this.scene.add.circle(x, y, 4, 0x00ff00);
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: { value: x + Math.cos(angle + Math.PI) * 20, duration: 300 },
        y: y - 40,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Power2',
        onComplete: () => particle.destroy()
      });
    }

    // Plus sign
    const plus = this.scene.add.text(x, y - 10, '+', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00ff00'
    }).setOrigin(0.5).setDepth(101);

    this.scene.tweens.add({
      targets: plus,
      y: y - 40,
      alpha: 0,
      duration: 500,
      ease: 'Power2',
      onComplete: () => plus.destroy()
    });
  }

  bloodSplatter(config: ParticleConfig): void {
    const { x, y, count = 12 } = config;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 20 + Math.random() * 30;
      const blood = this.scene.add.circle(
        x,
        y,
        3 + Math.random() * 4,
        0x8b0000
      );
      blood.setDepth(5);

      this.scene.tweens.add({
        targets: blood,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0.7,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          // Blood stays on ground briefly
          this.scene.time.delayedCall(2000, () => {
            this.scene.tweens.add({
              targets: blood,
              alpha: 0,
              duration: 500,
              onComplete: () => blood.destroy()
            });
          });
        }
      });
    }
  }

  healEffect(config: ParticleConfig): void {
    const { x, y } = config;
    const colors = [0x00ff00, 0x7fff00, 0x32cd32];

    for (let i = 0; i < 8; i++) {
      const cross = this.scene.add.text(
        x + (Math.random() - 0.5) * 30,
        y + (Math.random() - 0.5) * 30,
        '+',
        {
          fontSize: '16px',
          fontFamily: 'monospace',
          color: Phaser.Display.Color.IntegerToColor(colors[i % colors.length]).rgba
        }
      ).setOrigin(0.5).setDepth(100);

      this.scene.tweens.add({
        targets: cross,
        y: cross.y - 30,
        alpha: 0,
        scale: 1.5,
        duration: 600,
        delay: i * 50,
        ease: 'Power2',
        onComplete: () => cross.destroy()
      });
    }
  }
}
