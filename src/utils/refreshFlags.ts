/**
 * Refresh Flags Manager
 *
 * Manages flags in AsyncStorage to trigger data refresh across screens
 * when certain actions occur (like card deletion, stamp addition, etc.)
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const REFRESH_FLAGS_KEY = "@loyalty_app_refresh_flags";

interface RefreshFlags {
  businessDiscoveryRefresh: boolean;
  customerHomeRefresh: boolean;
  timestamp: number;
}

class RefreshFlagsManager {
  private flags: RefreshFlags = {
    businessDiscoveryRefresh: false,
    customerHomeRefresh: false,
    timestamp: Date.now(),
  };

  /**
   * Load flags from AsyncStorage
   */
  private async loadFlags(): Promise<RefreshFlags> {
    try {
      const flagsData = await AsyncStorage.getItem(REFRESH_FLAGS_KEY);
      if (flagsData) {
        const parsed = JSON.parse(flagsData);
        this.flags = { ...this.flags, ...parsed };
        return this.flags;
      }
    } catch (error) {
      console.warn("Failed to load refresh flags:", error);
    }
    return this.flags;
  }

  /**
   * Save flags to AsyncStorage
   */
  private async saveFlags(): Promise<void> {
    try {
      await AsyncStorage.setItem(REFRESH_FLAGS_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.warn("Failed to save refresh flags:", error);
    }
  }

  /**
   * Set a refresh flag for BusinessDiscoveryScreen
   */
  async setBusinessDiscoveryRefresh(): Promise<void> {
    console.log("🚩 Setting BusinessDiscovery refresh flag");
    await this.loadFlags();
    this.flags.businessDiscoveryRefresh = true;
    this.flags.timestamp = Date.now();
    await this.saveFlags();
  }

  /**
   * Set a refresh flag for CustomerHomeScreen
   */
  async setCustomerHomeRefresh(): Promise<void> {
    console.log("🚩 Setting CustomerHome refresh flag");
    await this.loadFlags();
    this.flags.customerHomeRefresh = true;
    this.flags.timestamp = Date.now();
    await this.saveFlags();
  }

  /**
   * Check if BusinessDiscoveryScreen should refresh
   */
  async shouldRefreshBusinessDiscovery(): Promise<boolean> {
    await this.loadFlags();
    return this.flags.businessDiscoveryRefresh;
  }

  /**
   * Check if CustomerHomeScreen should refresh
   */
  async shouldRefreshCustomerHome(): Promise<boolean> {
    await this.loadFlags();
    return this.flags.customerHomeRefresh;
  }

  /**
   * Clear BusinessDiscoveryScreen refresh flag
   */
  async clearBusinessDiscoveryRefresh(): Promise<void> {
    console.log("🚩 Clearing BusinessDiscovery refresh flag");
    await this.loadFlags();
    this.flags.businessDiscoveryRefresh = false;
    await this.saveFlags();
  }

  /**
   * Clear CustomerHomeScreen refresh flag
   */
  async clearCustomerHomeRefresh(): Promise<void> {
    console.log("🚩 Clearing CustomerHome refresh flag");
    await this.loadFlags();
    this.flags.customerHomeRefresh = false;
    await this.saveFlags();
  }

  /**
   * Clear all refresh flags
   */
  async clearAllFlags(): Promise<void> {
    console.log("🚩 Clearing all refresh flags");
    this.flags = {
      businessDiscoveryRefresh: false,
      customerHomeRefresh: false,
      timestamp: Date.now(),
    };
    await this.saveFlags();
  }

  /**
   * Set refresh flags for both screens - useful for operations that affect both
   */
  async setRefreshForBothScreens(): Promise<void> {
    console.log("🚩 Setting refresh flags for both screens");
    await this.loadFlags();
    this.flags.businessDiscoveryRefresh = true;
    this.flags.customerHomeRefresh = true;
    this.flags.timestamp = Date.now();
    await this.saveFlags();
  }
}

export const refreshFlags = new RefreshFlagsManager();
