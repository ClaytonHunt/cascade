/**
 * RegistryManager - Manages work-item-registry.json operations
 *
 * Responsibilities:
 * - Read/write work-item-registry.json
 * - Validate registry structure
 * - Look up work items by ID
 * - Look up parent relationships
 * - Manage ID counters
 *
 * Spec reference: CASCADE-INTEGRATION-SPEC.md lines 245-306
 */

import * as fs from 'fs';
import * as path from 'path';
import { WorkItemRegistry, RegistryEntry, CascadeItemType } from './types';

export class RegistryManager {
  private cascadeDir: string;
  private registryPath: string;
  private cachedRegistry: WorkItemRegistry | null = null;

  constructor(cascadeDir: string) {
    this.cascadeDir = cascadeDir;
    this.registryPath = path.join(cascadeDir, 'work-item-registry.json');
  }

  /**
   * Load registry from disk (with caching)
   */
  async loadRegistry(): Promise<WorkItemRegistry> {
    // Return cached version if available
    if (this.cachedRegistry) {
      return this.cachedRegistry;
    }

    // Check if registry exists
    if (!fs.existsSync(this.registryPath)) {
      throw new Error(`Registry not found: ${this.registryPath}`);
    }

    try {
      const content = await fs.promises.readFile(this.registryPath, 'utf-8');
      const registry = JSON.parse(content) as WorkItemRegistry;

      // Validate structure
      this.validateRegistry(registry);

      // Cache and return
      this.cachedRegistry = registry;
      return registry;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Malformed registry JSON: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Write registry to disk and invalidate cache
   */
  async saveRegistry(registry: WorkItemRegistry): Promise<void> {
    // Update timestamp
    registry.last_updated = new Date().toISOString();

    // Validate before writing
    this.validateRegistry(registry);

    // Write atomically (write to temp file, then rename)
    const tempPath = `${this.registryPath}.tmp`;
    try {
      await fs.promises.writeFile(
        tempPath,
        JSON.stringify(registry, null, 2),
        'utf-8'
      );
      await fs.promises.rename(tempPath, this.registryPath);

      // Update cache
      this.cachedRegistry = registry;
    } catch (error) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        await fs.promises.unlink(tempPath);
      }
      throw error;
    }
  }

  /**
   * Invalidate cache (call after external registry changes)
   */
  invalidateCache(): void {
    this.cachedRegistry = null;
  }

  /**
   * Look up work item by ID
   */
  async getWorkItem(id: string): Promise<RegistryEntry | null> {
    const registry = await this.loadRegistry();
    return registry.work_items[id] || null;
  }

  /**
   * Look up parent ID for a given work item
   * Returns null if no parent (root project) or item not found
   */
  async getParentId(childId: string): Promise<string | null> {
    const item = await this.getWorkItem(childId);
    return item?.parent || null;
  }

  /**
   * Get all children of a work item
   */
  async getChildren(parentId: string): Promise<RegistryEntry[]> {
    const registry = await this.loadRegistry();
    return Object.values(registry.work_items).filter(
      item => item.parent === parentId && !item.deleted
    );
  }

  /**
   * Get registry entry for a work item with full path
   */
  async getWorkItemPath(id: string): Promise<string | null> {
    const item = await this.getWorkItem(id);
    if (!item) return null;

    return path.join(this.cascadeDir, item.path);
  }

  /**
   * Get state.json path for a work item
   * Returns null for Tasks (which don't have state.json)
   */
  async getStatePath(id: string): Promise<string | null> {
    const item = await this.getWorkItem(id);
    if (!item) return null;

    // Tasks don't have state.json (leaf nodes)
    if (item.type === 'Task') return null;

    // Project has state.json at root
    if (item.type === 'Project') {
      return path.join(this.cascadeDir, 'state.json');
    }

    // Other types: state.json in their directory
    // Path format: "E0001-epic-slug/E0001.md" → "E0001-epic-slug/state.json"
    const dirPath = path.dirname(item.path);
    return path.join(this.cascadeDir, dirPath, 'state.json');
  }

  /**
   * Generate next ID for a given type
   */
  async getNextId(type: CascadeItemType): Promise<string> {
    const registry = await this.loadRegistry();

    // Get prefix for type
    const prefix = this.getTypePrefix(type);

    // Increment counter
    const counter = registry.id_counters[prefix] + 1;
    registry.id_counters[prefix] = counter;

    // Save updated registry
    await this.saveRegistry(registry);

    // Return formatted ID (e.g., "E0001")
    return `${prefix}${String(counter).padStart(4, '0')}`;
  }

  /**
   * Add work item to registry
   */
  async addWorkItem(entry: RegistryEntry): Promise<void> {
    const registry = await this.loadRegistry();

    // Check for duplicate ID
    if (registry.work_items[entry.id]) {
      throw new Error(`Work item ${entry.id} already exists in registry`);
    }

    // Add entry
    registry.work_items[entry.id] = entry;

    // Save registry
    await this.saveRegistry(registry);
  }

  /**
   * Update work item in registry
   */
  async updateWorkItem(id: string, updates: Partial<RegistryEntry>): Promise<void> {
    const registry = await this.loadRegistry();

    // Check item exists
    if (!registry.work_items[id]) {
      throw new Error(`Work item ${id} not found in registry`);
    }

    // Update entry
    registry.work_items[id] = {
      ...registry.work_items[id],
      ...updates,
      updated: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };

    // Save registry
    await this.saveRegistry(registry);
  }

  /**
   * Soft delete work item (mark as deleted, don't remove)
   */
  async deleteWorkItem(id: string): Promise<void> {
    await this.updateWorkItem(id, { deleted: true });
  }

  /**
   * Get all work items (excluding deleted)
   */
  async getAllWorkItems(): Promise<RegistryEntry[]> {
    const registry = await this.loadRegistry();
    return Object.values(registry.work_items).filter(item => !item.deleted);
  }

  /**
   * Get type prefix for ID generation
   */
  private getTypePrefix(type: CascadeItemType): 'P' | 'E' | 'F' | 'S' | 'B' | 'PH' | 'T' {
    const prefixMap: Record<CascadeItemType, 'P' | 'E' | 'F' | 'S' | 'B' | 'PH' | 'T'> = {
      'Project': 'P',
      'Epic': 'E',
      'Feature': 'F',
      'Story': 'S',
      'Bug': 'B',
      'Phase': 'PH',
      'Task': 'T'
    };
    return prefixMap[type];
  }

  /**
   * Validate registry structure
   */
  private validateRegistry(registry: WorkItemRegistry): void {
    // Check required fields
    if (!registry.version) {
      throw new Error('Registry missing version field');
    }
    if (!registry.last_updated) {
      throw new Error('Registry missing last_updated field');
    }
    if (!registry.work_items) {
      throw new Error('Registry missing work_items field');
    }
    if (!registry.id_counters) {
      throw new Error('Registry missing id_counters field');
    }

    // Validate id_counters has all required keys
    const requiredCounters = ['P', 'E', 'F', 'S', 'B', 'PH', 'T'];
    for (const key of requiredCounters) {
      if (!(key in registry.id_counters)) {
        throw new Error(`Registry id_counters missing ${key}`);
      }
    }

    // Validate each work item entry
    for (const [id, entry] of Object.entries(registry.work_items)) {
      if (!entry.id || !entry.type || !entry.path || !entry.title ||
          entry.status === undefined || entry.parent === undefined ||
          !entry.created || !entry.updated) {
        throw new Error(`Registry entry ${id} missing required fields`);
      }
      if (entry.id !== id) {
        throw new Error(`Registry entry key ${id} doesn't match entry.id ${entry.id}`);
      }
    }
  }

  /**
   * Create initial registry structure (for bootstrapping)
   */
  static createInitialRegistry(): WorkItemRegistry {
    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      work_items: {},
      id_counters: {
        P: 0,
        E: 0,
        F: 0,
        S: 0,
        B: 0,
        PH: 0,
        T: 0
      }
    };
  }

  /**
   * Check if registry exists
   */
  registryExists(): boolean {
    return fs.existsSync(this.registryPath);
  }

  /**
   * Initialize registry if it doesn't exist
   */
  async initializeIfNeeded(): Promise<void> {
    if (!this.registryExists()) {
      const initialRegistry = RegistryManager.createInitialRegistry();
      await this.saveRegistry(initialRegistry);
    }
  }
}
