type HashEncoding = "hex";

const textEncoder = new TextEncoder();

const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

const getSubtleCrypto = (): SubtleCrypto => {
  const crypto = globalThis.crypto;

  if (!crypto?.subtle) {
    throw new Error("Web Crypto API is not available in this environment.");
  }

  return crypto.subtle;
};

type Hash = {
  update(value: string | ArrayBuffer | ArrayBufferView): Hash;
  digest(): Promise<Uint8Array>;
  digest(encoding: HashEncoding): Promise<string>;
};

/**
 * Create a hashing helper compatible with Node-style update/digest flow.
 * @param alg Hash algorithm name (only "sha256" is supported).
 * @returns Hashing helper with update and digest methods.
 */
export function createHash(alg: "sha256"): Hash {
  if (alg !== "sha256") {
    throw new Error(`Unsupported hash algorithm: ${alg}`);
  }

  const chunks: Uint8Array[] = [];

  const hash: Hash = {
    update(value: string | ArrayBuffer | ArrayBufferView): Hash {
      if (typeof value === "string") {
        chunks.push(textEncoder.encode(value));
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

      return hash;
    },

    async digest(encoding?: HashEncoding): Promise<string | Uint8Array> {
      const total = chunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);

      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }

      const out = new Uint8Array(
        await getSubtleCrypto().digest("SHA-256", merged),
      );

      return encoding === "hex" ? toHex(out) : out;
    },
  };

  return hash;
}
