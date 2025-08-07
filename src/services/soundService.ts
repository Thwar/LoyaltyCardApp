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
      // We'll create a simple success sound using system sounds for now
      // In a real app, you would load actual sound files here
      await this.initializeAudio();

      // Create a simple beep sound programmatically
      const { sound: successSound } = await Audio.Sound.createAsync(
        // Use a simple success sound - we'll create this as a simple beep
        { uri: this.generateSimpleBeepDataUri() },
        { shouldPlay: false }
      );
      this.sounds["success"] = successSound;

      const { sound: completeSound } = await Audio.Sound.createAsync({ uri: this.generateCompleteChimeDataUri() }, { shouldPlay: false });
      this.sounds["complete"] = completeSound;
    } catch (error) {
      console.error("Error preloading sounds:", error);
    }
  }

  // Generate a simple beep sound data URI (for success)
  private static generateSimpleBeepDataUri(): string {
    // This creates a simple sine wave beep sound
    const sampleRate = 44100;
    const duration = 0.3; // 300ms
    const frequency = 800; // 800Hz
    const samples = Math.floor(sampleRate * duration);

    // Create audio buffer
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples * 2, true);

    // Generate sine wave
    for (let i = 0; i < samples; i++) {
      const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3;
      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    // Convert to base64
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return "data:audio/wav;base64," + btoa(binary);
  }

  // Generate a completion chime sound data URI
  private static generateCompleteChimeDataUri(): string {
    // This creates a pleasant two-tone chime
    const sampleRate = 44100;
    const duration = 0.6; // 600ms
    const samples = Math.floor(sampleRate * duration);

    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);

    // WAV header (same as above)
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, samples * 2, true);

    // Generate two-tone chime (C and E notes)
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      if (t < 0.3) {
        // First tone (C note - 523.25 Hz)
        sample = Math.sin(2 * Math.PI * 523.25 * t) * 0.4 * (1 - t / 0.3);
      } else {
        // Second tone (E note - 659.25 Hz)
        sample = Math.sin(2 * Math.PI * 659.25 * t) * 0.4 * (1 - (t - 0.3) / 0.3);
      }

      view.setInt16(44 + i * 2, sample * 32767, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return "data:audio/wav;base64," + btoa(binary);
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
