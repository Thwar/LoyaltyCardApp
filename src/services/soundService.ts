import { Audio } from "expo-av";
import { Platform } from "react-native";

export class SoundService {
  private static sounds: { [key: string]: Audio.Sound } = {};

  // Initialize audio mode
  static async initializeAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  // Load a sound file
  static async loadSound(soundName: string, soundFile: any): Promise<void> {
    try {
      const { sound } = await Audio.Sound.createAsync(soundFile);
      this.sounds[soundName] = sound;
    } catch (error) {
      console.error(`Error loading sound ${soundName}:`, error);
    }
  }

  // Play a sound
  static async playSound(soundName: string): Promise<void> {
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
  static async playSuccessSound(): Promise<void> {
    await this.playSound("success");
  }

  // Play completion sound
  static async playCompleteSound(): Promise<void> {
    await this.playSound("complete");
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
