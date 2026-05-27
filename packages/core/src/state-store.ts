import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { BotSnapshot } from "./types.js";

export class JsonStateStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<BotSnapshot | null> {
    try {
      const text = await readFile(this.filePath, "utf8");
      return JSON.parse(text) as BotSnapshot;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async write(snapshot: BotSnapshot): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  }
}

