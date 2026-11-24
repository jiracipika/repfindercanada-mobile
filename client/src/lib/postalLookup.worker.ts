/**
 * Owns the bundled postal index and coordinates so the main thread never
 * parses them. Protocol (plain objects over postMessage):
 *   { type: "load" }              → { type: "loaded", total } | { type: "failed", message }
 *   { type: "lookup", id, code }  → { type: "result", id, result }
 */
import { fetchPostalStore, PostalLookup } from "./postalLookupCore";

// Typed narrowly: the DOM lib describes `self` as a Window, which has a
// different postMessage signature.
const ctx = self as unknown as {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent) => void) | null;
};

let lookup: PostalLookup | null = null;

async function handle(message: { type: string; id?: number; code?: string }): Promise<void> {
  if (message.type === "load") {
    lookup = new PostalLookup(await fetchPostalStore());
    ctx.postMessage({ type: "loaded", total: lookup.size });
    return;
  }
  if (message.type === "lookup" && lookup) {
    ctx.postMessage({ type: "result", id: message.id, result: lookup.get(message.code ?? "") });
  }
}

ctx.onmessage = (event) => {
  const message = event.data as { type: string; id?: number };
  handle(message).catch((error: unknown) => {
    // Report, never throw: an uncaught error here surfaces as an opaque
    // "Script error" in the parent.
    ctx.postMessage({
      type: "failed",
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    });
  });
};
