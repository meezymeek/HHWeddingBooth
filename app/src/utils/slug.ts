/**
 * Generate a URL-safe slug from a name and last initial
 * Example: "Sarah" + "M" -> "sarah-m"
 */
export function generateSlug(firstName: string, lastInitial: string): string {
  const cleanFirst = firstName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const cleanInitial = lastInitial
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
  
  return `${cleanFirst}-${cleanInitial}`;
}

/**
 * Generate a unique slug by adding a number suffix if needed
 */
export function generateUniqueSlug(
  firstName: string,
  lastInitial: string,
  existingSlugs: string[]
): string {
  const baseSlug = generateSlug(firstName, lastInitial);
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  // If base slug exists, try adding numbers
  let counter = 2;
  while (existingSlugs.includes(`${baseSlug}-${counter}`)) {
    counter++;
  }
  
  return `${baseSlug}-${counter}`;
}

/**
 * Validate slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
}

/**
 * Sanitize name input (remove special characters, limit length)
 */
export function sanitizeName(name: string): string {
  return name
    .trim()
    .replace(/[<>\/\\]/g, '')
    .substring(0, 50);
}
