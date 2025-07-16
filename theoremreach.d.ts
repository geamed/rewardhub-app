// Ambient type declarations for TheoremReach SDK

export interface TheoremReachRewardData {
  earnedThisSession: number;
  // other potential properties from TheoremReach data object
}

export interface TheoremReachConfig {
  apiKey: string;
  userId: string; // This is critical
  onReward?: (data: TheoremReachRewardData) => void;
  onRewardCenterOpened?: () => void;
  onRewardCenterClosed?: () => void;
  userAttributes?: { [key: string]: string | number };
  // idfa?: string; // Optional, for iOS
  // gpsId?: string; // Optional, for Android
  // placementId?: string; // Optional for specific placements
}

export interface TheoremReachInstance {
  showRewardCenter: () => void;
  isSurveyAvailable: () => boolean;
  config?: TheoremReachConfig; // Expose config for checking current userId
  // any other methods the instance might have
}

declare global {
  interface Window {
    TheoremReach: new (config: TheoremReachConfig) => TheoremReachInstance;
    TR?: TheoremReachInstance; // The global instance after initialization, make it optional
  }
}

// This export is necessary to treat this file as a module by TypeScript.
export {};
