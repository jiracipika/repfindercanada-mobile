import { Preferences } from "@capacitor/preferences";
import type { Representative } from "@shared/schema";

const KEY = "activityLog";
const EVT = "activityLogChanged";

export type ActivityItem = {
  id: string;
  type: "search";
  query: string;
  searchType: "postalCode" | "name" | "location" | "locationComplete";
  ts: number;
  representatives?: Representative[]; // Store representatives found in this search
};

function emitActivityChange() {
  window.dispatchEvent(new CustomEvent(EVT));
}

export async function logActivity(item: Omit<ActivityItem, "id">) {
  const { value } = await Preferences.get({ key: KEY });
  const list: ActivityItem[] = value ? JSON.parse(value) : [];
  const entry: ActivityItem = { id: crypto.randomUUID(), ...item };
  list.unshift(entry);
  await Preferences.set({
    key: KEY,
    value: JSON.stringify(list.slice(0, 500)),
  }); // cap to 500
  emitActivityChange();
}

export async function getActivity(): Promise<ActivityItem[]> {
  const { value } = await Preferences.get({ key: KEY });
  return value ? JSON.parse(value) : [];
}

export async function getSearchCount(): Promise<number> {
  const list = await getActivity();
  return list.filter(i => i.type === "search").length;
}

export async function getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
  const all = await getActivity();
  return all.slice(0, limit);
}

export async function clearActivity(): Promise<void> {
  await Preferences.remove({ key: KEY });
  emitActivityChange();
}

export function subscribeActivityChanges(cb: () => void) {
  const handler = () => cb();
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}
