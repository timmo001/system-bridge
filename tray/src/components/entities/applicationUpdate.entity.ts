export interface ApplicationUpdate {
  available: boolean;
  newer: boolean;
  url: string;
  version: { current: string; new: string };
}
