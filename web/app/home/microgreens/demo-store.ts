import type { Rack } from "./types";

export const DEMO_RACKS_KEY = "smartagri-microgreens-demo-racks";

export function readDemoRacks(): Rack[] {
  try {
    const serialized = window.localStorage.getItem(DEMO_RACKS_KEY);
    if (!serialized) return [];
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) throw new Error("Saved demo rack data is invalid.");
    return value as Rack[];
  } catch (error) {
    console.error("Could not read local demo racks:", error);
    return [];
  }
}

export function writeDemoRacks(racks: Rack[]) {
  try {
    window.localStorage.setItem(DEMO_RACKS_KEY, JSON.stringify(racks));
  } catch (error) {
    console.error("Could not save local demo racks:", error);
    throw new Error("Browser storage is unavailable; the demo rack was not saved.");
  }
}
