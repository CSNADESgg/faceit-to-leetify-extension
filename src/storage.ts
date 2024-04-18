export interface ProcessedMatch {
  faceitId: string;
  leetifyId: string;
  timestamp: number;
  isOldDemo?: boolean;
}

export const PROCESSED_MATCHES_STORAGE_KEY = "PROCESSED_MATCHES";
export const INTRO_SHOWN_STORAGE_KEY = "INTRO_SHOWN";
export const AUTO_UPLOAD_STORAGE_KEY = "AUTO_UPLOAD";
