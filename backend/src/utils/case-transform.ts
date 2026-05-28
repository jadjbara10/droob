/**
 * Maps snake_case object keys to camelCase.
 * Also handles numeric string coercion for fare fields.
 */
const NUMERIC_FIELDS = new Set(["baseFare", "fareMin", "fareMax"]);

const PRESERVE_SUFFIXES = /_(ar|en|AR|EN)$/;

function snakeToCamel(str: string): string {
  // Don't transform bilingual fields (name_ar, title_en, etc.)
  if (PRESERVE_SUFFIXES.test(str)) return str;
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export function toCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key);
    if (NUMERIC_FIELDS.has(camelKey) && value != null && typeof value === "string") {
      result[camelKey] = parseFloat(value);
    } else {
      result[camelKey] = value;
    }
  }
  return result;
}

export function mapArrayToCamelCase<T extends Record<string, unknown>>(arr: T[]): Record<string, unknown>[] {
  return arr.map(toCamelCase);
}