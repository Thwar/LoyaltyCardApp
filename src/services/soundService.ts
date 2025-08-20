import { Audio } from "expo-av";
import { Platform } from "react-native";

// Queue for thread-safe audio operations
const audioQueue: (() => void)[] = [];
let isProcessingQueue = false;

export class SoundService {
  private static sounds: { [key: string]: Audio.Sound } = {};

  // Process audio queue on main thread
  private static processAudioQueue(): void {
    if (isProcessingQueue || audioQueue.length === 0) return;

    isProcessingQueue = true;
    const operation = audioQueue.shift();

    if (operation) {
      setTimeout(() => {
        operation();
        isProcessingQueue = false;
        // Process next item in queue
        if (audioQueue.length > 0) {
          this.processAudioQueue();
        }
      }, 0);
    } else {
      isProcessingQueue = false;
    }
  }

  // Queue audio operation for main thread execution
  private static queueAudioOperation(operation: () => void): void {
    audioQueue.push(operation);
    this.processAudioQueue();
  }

  // Initialize audio mode
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false, // Changed to false to prevent audio focus issues
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  // Load a sound file (with better error handling)
  static async loadSound(soundName: string, soundFile: any): Promise<void> {
    try {
      // Unload existing sound if any
      if (this.sounds[soundName]) {
        await this.sounds[soundName].unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(soundFile, {
        shouldPlay: false,
        isLooping: false,
        volume: 1.0,
      });
      this.sounds[soundName] = sound;
    } catch (error) {
      console.error(`Error loading sound ${soundName}:`, error);
    }
  }

  // Play a sound (ensuring main thread execution)
  static playSound(soundName: string): void {
    this.queueAudioOperation(async () => {
      try {
        const sound = this.sounds[soundName];
        if (sound) {
          await sound.setPositionAsync(0); // Reset to beginning
          await sound.playAsync();
        } else {
          console.warn(`Sound ${soundName} not found`);
        }
      } catch (error) {
        console.error(`Error playing sound ${soundName}:`, error);
      }
    });
  }

  // Preload common sounds
  static async preloadSounds(): Promise<void> {
    try {
      await this.initializeAudio();

      // Load actual MP3 sound files from assets
      await this.loadSound("success", require("../../assets/sounds/success.mp3"));
      await this.loadSound("complete", require("../../assets/sounds/complete.mp3"));
    } catch (error) {
      console.error("Error preloading sounds:", error);
    }
  }

  // Play success sound
  static playSuccessSound(): void {
    this.playSound("success");
  }

  // Play completion sound
  static playCompleteSound(): void {
    this.playSound("complete");
  }

  // Cleanup sounds
  static async cleanup(): Promise<void> {
    try {
      for (const soundName in this.sounds) {
        const sound = this.sounds[soundName];
        await sound.unloadAsync();
      }
      this.sounds = {};
    } catch (error) {
      console.error("Error cleaning up sounds:", error);
    }
  }
}
