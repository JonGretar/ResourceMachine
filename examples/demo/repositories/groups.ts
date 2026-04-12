import type { Repo, RepoRecord } from "./users.js";

const data: Record<string, RepoRecord> = {
  admins: { id: "admins", name: "Administrator", timestamp: new Date("2011-01-01") },
  users: { id: "users", name: "Users", timestamp: new Date("2012-06-01") },
};

export const groups: Repo = {
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
