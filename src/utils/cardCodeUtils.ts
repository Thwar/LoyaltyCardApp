import { CustomerCardService } from "../services";

// Maximum number of attempts to generate a unique card code
const MAX_CODE_GENERATION_ATTEMPTS = 1000;

/**
 * Generates a random 3-digit code (100-999)
 */
const generateRandomCode = (): string => {
  return Math.floor(100 + Math.random() * 900).toString();
};

/**
 * Generates a unique card code for a customer in a specific business
 * @param businessId - The business ID
 * @param customerId - The customer ID
 * @returns Promise<string> - A unique 3-digit card code
 * @throws Error if unable to generate unique code after max attempts
 */
export const generateUniqueCardCode = async (businessId: string, customerId: string): Promise<string> => {
  let attempts = 0;

  do {
    const code = generateRandomCode();
    attempts++;

    // Check if this code already exists for this business where reward is not claimed
    const existingCard = await CustomerCardService.getUnclaimedCustomerCardByCodeAndBusiness(code, businessId);

    if (!existingCard) {
      return code;
    }
  } while (attempts < MAX_CODE_GENERATION_ATTEMPTS);

  throw new Error("Unable to generate unique card code. Please try again.");
};
