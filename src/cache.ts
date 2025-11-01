import { Frontmatter } from './types';
import { parseFrontmatter } from './parser';
import * as fs from 'fs/promises';
import { normalizePath } from './utils/pathUtils';

/**
 * Cache entry storing parsed frontmatter with metadata
 */
interface CacheEntry {
  /** Parsed frontmatter data */
  frontmatter: Frontmatter;

  /** File modification time in milliseconds since epoch */
  mtime: number;

  /** Timestamp when entry was cached (for debugging) */
  cachedAt: number;
}

/**
 * Cache statistics for monitoring and debugging
 */
export interface CacheStats {
  /** Number of cache hits (data found and fresh) */
  hits: number;

  /** Number of cache misses (not found or stale) */
  misses: number;

  /** Number of LRU evictions */
  evictions: number;

  /** Current number of cached entries */
  size: number;
}


/**
 * Retrieves file modification time (mtime) in milliseconds.
 *
 * Uses Node.js fs.stat() to get file metadata without reading file content.
 * Returns 0 if file doesn't exist or stat fails (indicates invalid cache entry).
 *
 * @param filePath - Absolute path to file
 * @returns File modification time in milliseconds since epoch, or 0 if file doesn't exist
 */
async function getFileMtime(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.mtimeMs; // Microsecond precision
  } catch (error) {
    // File doesn't exist or permission denied
    return 0;
  }
}

/**
 * In-memory cache for parsed frontmatter data with automatic staleness detection.
 *
 * The cache stores parsed frontmatter by file path, avoiding redundant file parsing.
 * Staleness is detected by comparing cached mtime vs current file mtime.
 *
 * Usage:
 * ```typescript
 * const cache = new FrontmatterCache();
 * const frontmatter = await cache.get('/path/to/file.md');
 * if (frontmatter) {
 *   console.log(`Item: ${frontmatter.item}`);
 * }
 * ```
 */
export class FrontmatterCache {
  /** Internal cache storage (path → entry) */
  private cache: Map<string, CacheEntry>;

  /** Maximum cache size (LRU eviction when exceeded) */
  private maxSize: number = 1000;

  /** Cache statistics */
  private stats: CacheStats;

  /**
   * Creates a new frontmatter cache instance.
   *
   * @param maxSize - Maximum number of cached entries (default: 1000)
   *                  Must be positive integer. Values < 1 will use default.
   */
  constructor(maxSize?: number) {
    this.cache = new Map<string, CacheEntry>();

    // Set maxSize with validation
    if (maxSize !== undefined && maxSize > 0 && Number.isInteger(maxSize)) {
      this.maxSize = maxSize;
    } else if (maxSize !== undefined) {
      // Log warning if invalid value provided
      console.warn(`[CACHE] Invalid maxSize: ${maxSize}. Using default: 1000`);
    }
    // Default maxSize = 1000 set by property initializer

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Retrieves frontmatter from cache or parses file on cache miss.
   *
   * Cache hit: Returns cached data if mtime matches (data is fresh)
   * Cache miss: Parses file and caches result
   * Stale data: Invalidates cache entry and re-parses file
   *
   * @param filePath - Absolute path to markdown file
   * @returns Parsed frontmatter, or null if file doesn't exist or parsing fails
   */
  async get(filePath: string): Promise<Frontmatter | null> {
    const normalizedPath = normalizePath(filePath);

    // Check cache for existing entry
    const cached = this.cache.get(normalizedPath);

    if (cached) {
      // Verify freshness by comparing mtime
      const currentMtime = await getFileMtime(filePath);

      if (currentMtime === cached.mtime && currentMtime !== 0) {
        // Cache hit: Data is fresh
        this.stats.hits++;
        return cached.frontmatter;
      } else {
        // Stale data: mtime mismatch or file deleted
        this.cache.delete(normalizedPath);
        // Fall through to cache miss logic
      }
    }

    // Cache miss: Parse file and cache result
    this.stats.misses++;

    try {
      // Read file content
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter using S39 parser
      const parseResult = parseFrontmatter(content);

      if (parseResult.success && parseResult.frontmatter) {
        // Cache the result
        await this.set(normalizedPath, parseResult.frontmatter);
        return parseResult.frontmatter;
      } else {
        // Parse failed - return null (don't cache errors)
        return null;
      }
    } catch (error) {
      // File read failed (doesn't exist, permission denied, etc.)
      return null;
    }
  }

  /**
   * Stores frontmatter in cache with current file mtime.
   *
   * LRU eviction: Removes oldest entry if cache is full.
   *
   * @param filePath - Absolute path to markdown file (pre-normalized)
   * @param frontmatter - Parsed frontmatter data
   */
  private async set(filePath: string, frontmatter: Frontmatter): Promise<void> {
    // LRU eviction: Remove oldest entry if cache is full
    if (this.cache.size >= this.maxSize) {
      // Get first key (oldest entry due to Map insertion order)
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    // Get current file mtime for staleness detection
    const mtime = await getFileMtime(filePath);

    // Create cache entry
    const entry: CacheEntry = {
      frontmatter,
      mtime,
      cachedAt: Date.now()
    };

    // Store in cache (new entries added at end due to Map insertion order)
    this.cache.set(filePath, entry);
  }

  /**
   * Invalidates (removes) a cached entry by file path.
   *
   * Called by FileSystemWatcher when file changes or is deleted.
   * Safe to call even if entry doesn't exist (no-op).
   *
   * @param filePath - Absolute path to markdown file
   */
  invalidate(filePath: string): void {
    const normalizedPath = normalizePath(filePath);
    this.cache.delete(normalizedPath);
  }

  /**
   * Clears all cached entries and resets statistics.
   *
   * Called when extension deactivates or for testing purposes.
   */
  clear(): void {
    this.cache.clear();

    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0
    };
  }

  /**
   * Returns current cache statistics.
   *
   * Used for logging and debugging cache performance.
   *
   * @returns Copy of cache statistics (hits, misses, evictions, size)
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size  // Use current Map size (accurate count)
    };
  }
}
