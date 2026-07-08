import type { Site } from "../types/site.types.js";

export function checkHttps(site: Site): boolean {
  return site.url.startsWith("https://");
}