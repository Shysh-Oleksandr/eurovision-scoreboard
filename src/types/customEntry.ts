export interface CustomEntry {
  _id: string;
  name: string;
  flagUrl: string;
  userId: string;
  groupId?: string | null;
  /** Up to 3 letters or digits, upper-cased; absent = made from the name. */
  shortCode?: string;
  /** 1–3 `#rrggbb` colours; absent = read from the flag (entryColors.ts). */
  colors?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomEntryGroup {
  _id: string;
  name: string;
}
