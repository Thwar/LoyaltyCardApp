import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

// Lightweight wrapper migrating from expo-av to expo-audio while preserving API.
// expo-audio exposes a player-centric API; we’ll preload small UI sounds and reuse them.

interface LoadedSound {
  player: ReturnType<typeof createAudioPlayer>;
}

export class SoundService {
  private static sounds: Record<string, LoadedSound> = {};
  private static initialized = false;

  private static async ensureAudioMode() {
    if (this.initialized) return;
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        // background playback not needed for short UI sounds
        shouldPlayInBackground: false,
      });
      this.initialized = true;
    } catch (e) {
      console.warn("SoundService: audio mode init failed", e);
    }
  }

  static async loadSound(name: string, asset: any) {
    try {
      await this.ensureAudioMode();
      // If already loaded, unload before reloading
      if (this.sounds[name]) {
        try {
          this.sounds[name].player.remove();
        } catch {}
      }
      const player = createAudioPlayer(asset);
      try {
        player.volume = 1;
      } catch {}
      this.sounds[name] = { player };
    } catch (e) {
      console.error(`SoundService: failed to load ${name}`, e);
    }
  }

  static async preloadSounds() {
    await this.loadSound("success", require("../../assets/sounds/success.mp3"));
    await this.loadSound("complete", require("../../assets/sounds/complete.mp3"));
  }

  static async playSound(name: string) {
    const entry = this.sounds[name];
    if (!entry) return console.warn(`SoundService: sound ${name} not loaded`);
    try {
      try {
        await entry.player.seekTo(0);
      } catch {}
      entry.player.play();
    } catch (e) {
      console.error(`SoundService: play error for ${name}`, e);
    }
  }

  static playSuccessSound() {
    this.playSound("success");
  }
  static playCompleteSound() {
    this.playSound("complete");
  }

  static async cleanup() {
    const unloads = Object.values(this.sounds).map(async ({ player }) => {
      try {
        player.remove();
      } catch {}
    });
    await Promise.all(unloads);
    this.sounds = {};
    this.initialized = false;
  }
}
