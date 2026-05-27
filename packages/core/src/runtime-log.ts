import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RuntimeLogEntry, RuntimeLogSummary } from "./types.js";

export class JsonRuntimeLogStore {
  constructor(
    private readonly filePath: string,
    private readonly maxEntries = 500
  ) {}

  async read(limit = this.maxEntries): Promise<RuntimeLogSummary> {
    try {
      const text = await readFile(this.filePath, "utf8");
      const entries = JSON.parse(text) as RuntimeLogEntry[];
      return summarizeLogs(entries.slice(-limit));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return summarizeLogs([]);
      throw error;
    }
  }

  async append(entry: Omit<RuntimeLogEntry, "id" | "createdAt">): Promise<RuntimeLogSummary> {
    const current = await this.read(this.maxEntries);
    const createdAt = new Date().toISOString();
    const nextEntry: RuntimeLogEntry = {
      id: `${createdAt.replace(/[^0-9]/g, "")}-${entry.service}-${entry.event}`,
      createdAt,
      ...entry
    };
    const entries = [...current.entries, nextEntry].slice(-this.maxEntries);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    return summarizeLogs(entries);
  }
}

function summarizeLogs(entries: RuntimeLogEntry[]): RuntimeLogSummary {
  return {
    updatedAt: new Date().toISOString(),
    entries
  };
}
