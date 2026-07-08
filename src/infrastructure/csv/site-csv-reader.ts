import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";
import type { Site } from "../../core/types/site.types.js";

export async function readSitesFromCsv(filePath: string): Promise<Site[]> {
  const csvContent = await readFile(filePath, "utf-8");

  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((record) => ({
    name: record.name,
    url: record.url,
  }));
}