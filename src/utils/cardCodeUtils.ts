// Removed direct service import to avoid circular dependency (services -> utils -> services)
// The generator now accepts a lookup function so services can inject their own query logic.

const MAX_CODE_GENERATION_ATTEMPTS = 1000;

const generateRandomCode = (): string => Math.floor(100 + Math.random() * 900).toString();

export type CustomerCardLookupFn = (code: string, businessId: string) => Promise<any | null>;

/**
 * Generate a unique 3‑digit numeric code (100-999) for a business.
 * The caller provides a lookup function that returns an existing card (or null)
 * so we can test uniqueness without importing service layers here.
 */
export const generateUniqueCardCode = async (
  businessId: string,
  _customerId: string, // kept for backwards compatibility; not currently used in uniqueness check
  findExisting: CustomerCardLookupFn
): Promise<string> => {
  for (let attempts = 0; attempts < MAX_CODE_GENERATION_ATTEMPTS; attempts++) {
    const code = generateRandomCode();
    const exists = await findExisting(code, businessId);
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique card code. Please try again.");
};
