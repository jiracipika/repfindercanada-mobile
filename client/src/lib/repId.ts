// src/lib/repId.ts
export type IdInput = {
  source?: string;
  representative_set_name?: string;
  elected_office?: string;
  name?: string;
  district_name?: string;
  ocd_id?: string;
  party_name?: string;
  email?: string;
};

function canonicalString(input: IdInput): string {
  const parts = [
    input.source ?? "",
    input.representative_set_name ?? "",
    input.elected_office ?? "",
    input.name ?? "",
    input.district_name ?? "",
    input.ocd_id ?? "",
    input.party_name ?? "",
    input.email ?? "",
  ]
    .map(s => (s || "").toLowerCase().replace(/\s+/g, " ").trim())
    .join("|");
  return parts;
}

async function sha256Hex(msg: string): Promise<string> {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const enc = new TextEncoder().encode(msg);
    const buf = await window.crypto.subtle.digest("SHA-256", enc);
    const bytes = Array.from(new Uint8Array(buf));
    return bytes.map(b => b.toString(16).padStart(2, "0")).join("");
  } else {
    // Node / SSR fallback
    const { createHash } = await import("crypto");
    return createHash("sha256").update(msg).digest("hex");
  }
}

export async function makeRepresentativeId(input: IdInput): Promise<string> {
  const base = canonicalString(input);
  const hex = await sha256Hex(base);
  return `rep_${hex.slice(0, 16)}`;
}

export function __debugCheckRepId(id: string): void {
  if (import.meta.env?.DEV) {
    if (!/^rep_[0-9a-f]{16}$/.test(id)) {
      // eslint-disable-next-line no-console
      console.warn("Representative id not in expected format:", id);
    }
  }
}
