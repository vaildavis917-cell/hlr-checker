/**
 * Phone number normalization and validation utilities
 * Helps save money by filtering invalid numbers before API calls
 */

export interface NormalizedNumber {
  original: string;
  normalized: string;
  isValid: boolean;
  invalidReason?: string;
}

export interface BatchAnalysis {
  valid: NormalizedNumber[];
  invalid: NormalizedNumber[];
  duplicates: string[];
  totalOriginal: number;
  totalValid: number;
  totalInvalid: number;
  totalDuplicates: number;
  estimatedSavings: number; // EUR saved by not checking invalid numbers
}

/**
 * Normalize a phone number to E.164 format
 * Removes spaces, brackets, dashes, and standardizes country codes
 */
export function normalizePhoneNumber(phone: string): NormalizedNumber {
  const original = phone.trim();
  
  if (!original) {
    return { original, normalized: "", isValid: false, invalidReason: "empty" };
  }

  // Remove all non-digit characters except leading +
  let cleaned = original.replace(/[^\d+]/g, "");
  
  // Handle different formats
  // 8XXXXXXXXXX -> +7XXXXXXXXXX (Russia)
  if (cleaned.startsWith("8") && cleaned.length === 11) {
    cleaned = "+7" + cleaned.slice(1);
  }
  // 00XX... -> +XX... (International)
  else if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  }
  // Add + if missing and starts with country code
  else if (!cleaned.startsWith("+") && cleaned.length >= 10) {
    // Assume it's a full number with country code
    cleaned = "+" + cleaned;
  }

  // Extract only digits for validation
  const digitsOnly = cleaned.replace(/\D/g, "");

  // Validation rules
  if (digitsOnly.length < 7) {
    return { original, normalized: cleaned, isValid: false, invalidReason: "too_short" };
  }
  
  if (digitsOnly.length > 15) {
    return { original, normalized: cleaned, isValid: false, invalidReason: "too_long" };
  }

  // Check for letters (shouldn't be any after cleaning, but double-check original)
  if (/[a-zA-Zа-яА-Я]/.test(original)) {
    return { original, normalized: cleaned, isValid: false, invalidReason: "contains_letters" };
  }

  // Check for obviously invalid patterns
  if (/^[+]?0+$/.test(cleaned)) {
    return { original, normalized: cleaned, isValid: false, invalidReason: "all_zeros" };
  }

  // Check for repeated digits (like 1111111111)
  if (/^[+]?(\d)\1{6,}$/.test(cleaned)) {
    return { original, normalized: cleaned, isValid: false, invalidReason: "repeated_digits" };
  }

  return { original, normalized: cleaned, isValid: true };
}

/**
 * Analyze a batch of phone numbers
 * Returns valid, invalid, and duplicate numbers with statistics
 */
export function analyzeBatch(phoneNumbers: string[]): BatchAnalysis {
  const seen = new Set<string>();
  const valid: NormalizedNumber[] = [];
  const invalid: NormalizedNumber[] = [];
  const duplicates: string[] = [];

  for (const phone of phoneNumbers) {
    const normalized = normalizePhoneNumber(phone);
    
    if (!normalized.isValid) {
      invalid.push(normalized);
      continue;
    }

    // Check for duplicates using normalized number
    if (seen.has(normalized.normalized)) {
      duplicates.push(normalized.original);
      continue;
    }

    seen.add(normalized.normalized);
    valid.push(normalized);
  }

  const costPerCheck = 0.01; // EUR
  const estimatedSavings = (invalid.length + duplicates.length) * costPerCheck;

  return {
    valid,
    invalid,
    duplicates,
    totalOriginal: phoneNumbers.length,
    totalValid: valid.length,
    totalInvalid: invalid.length,
    totalDuplicates: duplicates.length,
    estimatedSavings,
  };
}

/**
 * Get human-readable reason for invalid number
 */
export function getInvalidReasonText(reason: string, lang: "ru" | "uk" | "en" = "ru"): string {
  const reasons: Record<string, Record<string, string>> = {
    empty: { ru: "Пустой номер", uk: "Порожній номер", en: "Empty number" },
    too_short: { ru: "Слишком короткий (менее 7 цифр)", uk: "Занадто короткий (менше 7 цифр)", en: "Too short (less than 7 digits)" },
    too_long: { ru: "Слишком длинный (более 15 цифр)", uk: "Занадто довгий (більше 15 цифр)", en: "Too long (more than 15 digits)" },
    contains_letters: { ru: "Содержит буквы", uk: "Містить літери", en: "Contains letters" },
    all_zeros: { ru: "Только нули", uk: "Тільки нулі", en: "All zeros" },
    repeated_digits: { ru: "Повторяющиеся цифры", uk: "Повторювані цифри", en: "Repeated digits" },
  };

  return reasons[reason]?.[lang] || reason;
}
