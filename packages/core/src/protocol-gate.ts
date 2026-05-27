import { readFile } from "node:fs/promises";
import type { ProtocolGate } from "./types.js";

interface ProtocolReportFile {
  generatedAt?: string;
  liveReady?: boolean;
  checks?: Array<{ severity?: string; summary?: string; id?: string }>;
}

export async function loadProtocolGate(path: string): Promise<ProtocolGate> {
  try {
    const text = await readFile(path, "utf8");
    const report = JSON.parse(text) as ProtocolReportFile;
    const checks = report.checks ?? [];
    const fail = checks.filter((check) => check.severity === "fail").length;
    const warn = checks.filter((check) => check.severity === "warn").length;
    const pass = checks.filter((check) => check.severity === "pass").length;
    const reasons = checks
      .filter((check) => check.severity !== "pass")
      .map((check) => `${check.id ?? "unknown"}: ${check.summary ?? check.severity}`);

    return {
      liveReady: report.liveReady === true,
      generatedAt: report.generatedAt,
      pass,
      warn,
      fail,
      reasons
    };
  } catch (error) {
    return {
      liveReady: false,
      pass: 0,
      warn: 0,
      fail: 1,
      reasons: [`protocol verification report unavailable: ${error instanceof Error ? error.message : "unknown error"}`]
    };
  }
}
