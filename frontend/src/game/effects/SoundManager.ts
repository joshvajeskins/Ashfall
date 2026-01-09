type SoundType =
  | 'attack' | 'hit' | 'critical' | 'playerHurt' | 'playerDeath' | 'enemyDeath'
  | 'itemPickup' | 'itemDrop' | 'itemEquip' | 'potionDrink'
  | 'levelUp' | 'victory' | 'doorOpen' | 'enemySpawn' | 'roomClear' | 'flee'
  | 'bossRoar' | 'bossDefeated'
  | 'buttonClick' | 'menuOpen' | 'error' | 'heal' | 'footstep';

type MusicTrack = 'mainMenu' | 'battle' | 'victory' | 'gameOver';

interface SoundConfig {
  volume: number;
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
}

// Sound file paths mapping
const SOUND_PATHS: Record<SoundType, string> = {
  attack: '/assets/audio/sfx/attack.mp3',
  hit: '/assets/audio/sfx/hit.mp3',
  critical: '/assets/audio/sfx/critical.mp3',
  playerHurt: '/assets/audio/sfx/player-hurt.mp3',
  playerDeath: '/assets/audio/sfx/player-death.mp3',
  enemyDeath: '/assets/audio/sfx/enemy-death.mp3',
  itemPickup: '/assets/audio/sfx/item-pickup.mp3',
  itemDrop: '/assets/audio/sfx/item-drop.mp3',
  itemEquip: '/assets/audio/sfx/item-equip.mp3',
  potionDrink: '/assets/audio/sfx/potion-drink.mp3',
  levelUp: '/assets/audio/sfx/level-up.mp3',
  victory: '/assets/audio/sfx/victory.mp3',
  doorOpen: '/assets/audio/sfx/door-open.mp3',
  enemySpawn: '/assets/audio/sfx/enemy-spawn.mp3',
  roomClear: '/assets/audio/sfx/room-clear.mp3',
  flee: '/assets/audio/sfx/flee.mp3',
  bossRoar: '/assets/audio/sfx/boss-roar.mp3',
  bossDefeated: '/assets/audio/sfx/boss-defeated.mp3',
  buttonClick: '/assets/audio/sfx/button-click.mp3',
  menuOpen: '/assets/audio/sfx/menu-open.mp3',
  error: '/assets/audio/sfx/error.mp3',
  heal: '/assets/audio/sfx/heal.mp3',
  footstep: '/assets/audio/sfx/footstep.mp3',
};

// Music file paths
const MUSIC_PATHS: Record<MusicTrack, string> = {
  mainMenu: '/assets/audio/music/menu.mp3',
  battle: '/assets/audio/music/battle.mp3',
  victory: '/assets/audio/music/victory.mp3',
  gameOver: '/assets/audio/music/gameover.mp3',
};

export class SoundManager {
  private sounds: Map<string, HTMLAudioElement[]> = new Map();
  private music: HTMLAudioElement | null = null;
  private currentMusicTrack: MusicTrack | null = null;
  private pendingMusicTrack: MusicTrack | null = null;
  private config: SoundConfig = {
    volume: 0.5,
    muted: false,
    musicVolume: 0.3,
    sfxVolume: 0.7
  };
  private isInitialized = false;
  private hasUserInteracted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.preloadSounds();
      this.setupUserInteractionListener();
    }
  }

  private setupUserInteractionListener(): void {
    const handleInteraction = () => {
      if (this.hasUserInteracted) return;
      this.hasUserInteracted = true;
      console.log('[SoundManager] User interaction detected, audio unlocked');

      // If there's a pending music track that failed due to autoplay, play it now
      if (this.pendingMusicTrack && (!this.music || this.music.paused)) {
        console.log(`[SoundManager] Resuming pending music: ${this.pendingMusicTrack}`);
        this.playMusic(this.pendingMusicTrack);
      }

      // Remove listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
  }

  private preloadSounds(): void {
    // Preload all sound effects with audio pool for concurrent playback
    Object.entries(SOUND_PATHS).forEach(([key, path]) => {
      const pool: HTMLAudioElement[] = [];
      // Create 3 instances per sound for overlapping plays
      for (let i = 0; i < 3; i++) {
        const audio = new Audio(path);
        audio.preload = 'auto';
        audio.volume = this.config.sfxVolume * this.config.volume;
        pool.push(audio);
      }
      this.sounds.set(key, pool);
    });
    this.isInitialized = true;
  }

  play(type: SoundType): void {
    if (this.config.muted || !this.isInitialized) return;
    if (typeof window === 'undefined') return;

    const pool = this.sounds.get(type);
    if (!pool) return;

    // Find an available audio element in the pool
    const audio = pool.find(a => a.paused || a.ended) || pool[0];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = this.config.sfxVolume * this.config.volume;
      audio.play().catch(() => {
        // Silently handle autoplay restrictions
      });
    }
  }

  playMusic(track: MusicTrack): void {
    if (typeof window === 'undefined') return;
    if (this.currentMusicTrack === track && this.music && !this.music.paused) {
      console.log(`[SoundManager] Music '${track}' already playing, skipping`);
      return;
    }

    console.log(`[SoundManager] Playing music: ${track}`);

    // Stop current music
    this.stopMusic();

    const path = MUSIC_PATHS[track];
    if (!path) {
      console.error(`[SoundManager] Music track not found: ${track}`);
      return;
    }

    this.music = new Audio(path);
    this.music.loop = true;
    this.music.volume = this.config.muted ? 0 : this.config.musicVolume * this.config.volume;
    this.currentMusicTrack = track;

    this.music.play()
      .then(() => {
        console.log(`[SoundManager] Music '${track}' started successfully`);
        this.pendingMusicTrack = null;
      })
      .catch((err) => {
        console.warn(`[SoundManager] Music '${track}' blocked by browser (autoplay policy). Error:`, err.message);
        console.warn('[SoundManager] Will auto-play after user interaction (click/tap/keypress)');
        this.pendingMusicTrack = track;
      });
  }

  stopMusic(): void {
    if (this.music) {
      this.music.pause();
      this.music.currentTime = 0;
      this.music = null;
      this.currentMusicTrack = null;
    }
  }

  fadeOutMusic(duration: number = 1000): void {
    if (!this.music) return;

    const startVolume = this.music.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeStep = startVolume / steps;

    let currentStep = 0;
    const fadeInterval = setInterval(() => {
      currentStep++;
      if (this.music) {
        this.music.volume = Math.max(0, startVolume - (volumeStep * currentStep));
      }
      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        this.stopMusic();
      }
    }, stepDuration);
  }

  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setSfxVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  setMusicVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.music) {
      this.music.volume = this.config.muted ? 0 : this.config.musicVolume * this.config.volume;
    }
  }

  private updateAllVolumes(): void {
    // Update all sound pools
    this.sounds.forEach(pool => {
      pool.forEach(audio => {
        audio.volume = this.config.sfxVolume * this.config.volume;
      });
    });
    // Update music
    if (this.music) {
      this.music.volume = this.config.muted ? 0 : this.config.musicVolume * this.config.volume;
    }
  }

  setMuted(muted: boolean): void {
    this.config.muted = muted;
    if (this.music) {
      this.music.volume = muted ? 0 : this.config.musicVolume * this.config.volume;
    }
  }

  toggleMute(): boolean {
    this.config.muted = !this.config.muted;
    if (this.music) {
      this.music.volume = this.config.muted ? 0 : this.config.musicVolume * this.config.volume;
    }
    return this.config.muted;
  }

  isMuted(): boolean {
    return this.config.muted;
  }

  getCurrentTrack(): MusicTrack | null {
    return this.currentMusicTrack;
  }

  destroy(): void {
    this.stopMusic();
    this.sounds.clear();
    this.isInitialized = false;
  }
}

export const soundManager = new SoundManager();
