export interface RepoRecord {
  id: string;
  name: string;
  timestamp: Date;
  [key: string]: unknown;
}

export interface Repo {
  list(): RepoRecord[];
  get(id: string): RepoRecord | undefined;
  save(id: string, value: Record<string, unknown>): RepoRecord;
  remove(id: string): void;
}

const data: Record<string, RepoRecord> = {
  jon: { id: "jon", name: "Jón Grétar", timestamp: new Date("1980-05-04") },
  stu: { id: "stu", name: "Stuart Fiddlybody", timestamp: new Date("2001-02-03") },
};

export const users: Repo = {
  list(): RepoRecord[] {
    return Object.values(data);
  },
  get(id: string): RepoRecord | undefined {
    return data[id];
  },
  save(id: string, value: Record<string, unknown>): RepoRecord {
    const record = { ...value, id, timestamp: new Date() } as RepoRecord;
    data[id] = record;
    return record;
  },
  remove(id: string): void {
    delete data[id];
  },
};
