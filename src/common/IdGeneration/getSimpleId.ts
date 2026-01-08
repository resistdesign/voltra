let LAST_HAST_ID: number = 0;

const textEncoder: TextEncoder = new TextEncoder();

const bytesToBinaryString = (bytes: Uint8Array): string => {
  let out: string = "";

  for (let i = 0; i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!);
  }

  return out;
};

const getBase64EncodedString = (input: string): string => {
  const bytes: Uint8Array = textEncoder.encode(input);

  let base64: string = "";

  if (typeof globalThis.btoa === "function") {
    const binary: string = bytesToBinaryString(bytes);

    base64 = globalThis.btoa(binary);
  } else {
    const anyGlobal: any = globalThis as any;

    if (typeof anyGlobal.Buffer === "function") {
      base64 = anyGlobal.Buffer.from(bytes).toString("base64");
    } else {
      throw new Error("No base64 encoder available (need btoa or Buffer).");
    }
  }

  return base64;
};

/**
 * Get a simple id, unique to the current run session.
 *
 * Includes a counter and timestamp so it stays unique within the same process.
 *
 * @returns A process-unique string id.
 */
export const getSimpleId = (): string => {
  const hashId: number = LAST_HAST_ID++;
  const base64Datetime: string = getBase64EncodedString(
    new Date().toISOString(),
  );
  const rand1: string = Math.random().toString(36).substring(2, 15);
  const rand2: string = Math.random().toString(36).substring(2, 15);

  return `${hashId}-${base64Datetime}-${rand1}-${rand2}`;
};
