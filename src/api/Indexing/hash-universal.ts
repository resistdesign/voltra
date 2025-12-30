import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

type HashEncoding = "hex";

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Create a hashing helper compatible with Node-style update/digest flow.
 * @param alg Hash algorithm name (only "sha256" is supported).
 * @returns Hashing helper with update and digest methods.
 */
export function createHash(alg: "sha256") {
  if (alg !== "sha256") {
    throw new Error(`Unsupported hash algorithm: ${alg}`);
  }

  const chunks: Uint8Array[] = [];

  return {
    update(value: string | ArrayBuffer | ArrayBufferView): typeof this {
      if (typeof value === "string") {
        chunks.push(utf8ToBytes(value));
      } else if (value instanceof Uint8Array) {
        chunks.push(value);
      } else if (ArrayBuffer.isView(value)) {
        chunks.push(
          new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
        );
      } else if (value instanceof ArrayBuffer) {
        chunks.push(new Uint8Array(value));
      } else {
        throw new TypeError("Unsupported value type for update()");
      }

      return this;
    },

    digest(encoding?: HashEncoding): string | Uint8Array {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);

      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }

      const out = sha256(merged);

      return encoding === "hex" ? toHex(out) : out;
    },
  };
}
