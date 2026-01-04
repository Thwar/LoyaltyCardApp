// Removed direct service import to avoid circular dependency (services -> utils -> services)
// The generator now accepts a lookup function so services can inject their own query logic.

const MAX_ATTEMPTS_PER_LENGTH = 10;
const START_LENGTH = 3;

/**
 * Generates a random numeric string of a given length.
 * e.g. length 3 => "100" to "999"
 */
const generateRandomCode = (length: number): string => {
  const min = Math.pow(10, length - 1); // e.g., 100
  const max = Math.pow(10, length) - 1; // e.g., 999
  // Range size: 900 for length 3 (100..999)
  const range = max - min + 1;
  return Math.floor(min + Math.random() * range).toString();
};

export type CustomerCardLookupFn = (code: string, businessId: string) => Promise<any | null>;

/**
 * Generate a unique numeric code for a business.
 * 
 * Scalability Strategy:
 * - Starts trying to generate 3-digit codes (100-999).
 * - If it fails to find a unique code after MAX_ATTEMPTS_PER_LENGTH (e.g., 10),
 *   it assumes the 3-digit space is crowded and automatically switches to 4 digits.
 * - Continues expanding length as needed (3 -> 4 -> 5...).
 * 
 * This ensures small businesses get short codes, while allowing infinite scaling
 * for larger businesses without running out of unique codes.
 */
export const generateUniqueCardCode = async (
  businessId: string,
  _customerId: string,
  findExisting: CustomerCardLookupFn
): Promise<string> => {
  let length = START_LENGTH;
  let totalAttempts = 0;
  const GLOBAL_MAX_ATTEMPTS = 50; // Safety valve to prevent infinite loops

  while (totalAttempts < GLOBAL_MAX_ATTEMPTS) {
    // Try a few times at the current length
    for (let i = 0; i < MAX_ATTEMPTS_PER_LENGTH; i++) {
        const code = generateRandomCode(length);
        const exists = await findExisting(code, businessId);
        
        if (!exists) {
          return code;
        }
        
        totalAttempts++;
        if (totalAttempts >= GLOBAL_MAX_ATTEMPTS) break;
    }
    
    // If we haven't found a code yet, the current length space is likely crowded.
    // Increase length and try again.
    length++;
  }

  throw new Error("Unable to generate unique card code. Please try again.");
};
