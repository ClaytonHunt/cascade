/**
 * Path manipulation utilities for consistent file path handling.
 *
 * These utilities ensure consistent path formatting across Windows and Unix systems,
 * particularly important for Map keys where path variations could cause cache misses.
 */

/**
 * Normalizes file path for consistent cache keys.
 *
 * Handles Windows path variations:
 * - Converts backslashes to forward slashes
 * - Converts to lowercase (Windows is case-insensitive)
 *
 * Examples:
 * - 'D:\\Projects\\Lineage\\plans\\story-40.md' → 'd:/projects/lineage/plans/story-40.md'
 * - 'D:/Projects/Lineage/plans/story-40.md' → 'd:/projects/lineage/plans/story-40.md'
 *
 * @param filePath - Absolute file path (Windows or Unix style)
 * @returns Normalized path (lowercase, forward slashes)
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}
