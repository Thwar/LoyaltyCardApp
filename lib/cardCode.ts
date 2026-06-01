// Unique short numeric code per business-customer (carried over from the
// original app). Starts at 3 digits and grows only when that space fills up,
// so small businesses get memorable codes while large ones never run out.
const MAX_ATTEMPTS_PER_LENGTH = 10;
const START_LENGTH = 3;
const GLOBAL_MAX_ATTEMPTS = 50;

function randomCode(length: number): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

export async function generateUniqueCardCode(exists: (code: string) => Promise<boolean>): Promise<string> {
  let length = START_LENGTH;
  let total = 0;
  while (total < GLOBAL_MAX_ATTEMPTS) {
    for (let i = 0; i < MAX_ATTEMPTS_PER_LENGTH; i++) {
      const code = randomCode(length);
      if (!(await exists(code))) return code;
      total++;
      if (total >= GLOBAL_MAX_ATTEMPTS) break;
    }
    length++;
  }
  throw new Error("No se pudo generar un código único. Intenta de nuevo.");
}
