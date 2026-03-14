export interface CustomEntry {
  _id: string;
  name: string;
  flagUrl: string;
  userId: string;
  groupId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomEntryGroup {
  _id: string;
  name: string;
}
