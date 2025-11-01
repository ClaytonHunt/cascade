import * as vscode from 'vscode';
import { FrontmatterCache } from '../cache';
import { PlanningTreeItem } from '../treeview/PlanningTreeItem';
import { Frontmatter } from '../types';

/**
 * Converts Frontmatter to PlanningTreeItem.
 *
 * @param frontmatter - Parsed frontmatter data
 * @param filePath - Absolute path to file
 * @returns PlanningTreeItem representation
 */
function convertToTreeItem(frontmatter: Frontmatter, filePath: string): PlanningTreeItem {
  return {
    item: frontmatter.item,
    title: frontmatter.title,
    type: frontmatter.type,
    status: frontmatter.status,
    priority: frontmatter.priority,
    filePath
  };
}

/**
 * Classification of file change types based on UI impact.
 *
 * STRUCTURE: Changes that affect tree structure (status, file add/delete)
 *           Requires full TreeView refresh.
 *
 * CONTENT:   Changes that affect display but not structure (title, priority)
 *           Can use partial TreeView refresh (single item update).
 *
 * BODY:      Changes to non-frontmatter content (description, acceptance criteria)
 *           No TreeView refresh needed (invisible to TreeView).
 */
export enum ChangeType {
  STRUCTURE = 'STRUCTURE',
  CONTENT = 'CONTENT',
  BODY = 'BODY'
}

/**
 * Result of change detection analysis.
 *
 * Contains change classification, before/after data, and list of
 * specific frontmatter fields that changed.
 */
export interface ChangeDetectionResult {
  /** Type of change detected */
  type: ChangeType;

  /** Frontmatter data before change (null if file created) */
  oldData?: PlanningTreeItem | null;

  /** Frontmatter data after change (null if file deleted) */
  newData?: PlanningTreeItem | null;

  /** List of frontmatter field names that changed */
  changedFields: string[];
}

/**
 * Detects the type of change made to a markdown file.
 *
 * Strategy:
 * 1. Use provided oldData (from previousDataStore) OR retrieve cached frontmatter
 * 2. Invalidate cache and re-parse file (newData)
 * 3. Compare frontmatter fields to determine change type
 * 4. Return ChangeDetectionResult with classification and metadata
 *
 * Performance: ~5ms per file (includes cache invalidation + re-parse)
 *
 * @param uri - URI of changed file
 * @param cache - FrontmatterCache instance
 * @param outputChannel - Output channel for logging
 * @param oldData - Optional previous state from previousDataStore (B1 fix)
 * @returns Promise<ChangeDetectionResult> with change classification
 */
export async function detectChangeType(
  uri: vscode.Uri,
  cache: FrontmatterCache,
  outputChannel: vscode.OutputChannel,
  oldData?: PlanningTreeItem | null  // NEW PARAMETER (B1)
): Promise<ChangeDetectionResult> {
  const startTime = Date.now();
  const filePath = uri.fsPath;

  // Step 1: Get old data from parameter OR cache
  let oldFrontmatter: Frontmatter | null;
  let providedOldData = false;

  if (oldData !== undefined) {
    // Use provided oldData (from previousDataStore)
    providedOldData = true;
    outputChannel.appendLine('[ChangeDetect] Using previous data from store');

    // Convert PlanningTreeItem back to minimal Frontmatter for comparison
    // (We only need fields that exist in PlanningTreeItem)
    oldFrontmatter = oldData ? {
      item: oldData.item,
      title: oldData.title,
      type: oldData.type,
      status: oldData.status,
      priority: oldData.priority,
      created: '',  // Not needed for comparison
      updated: ''   // Not needed for comparison
    } as Frontmatter : null;
  } else {
    // Fallback: Get from cache (old behavior for backward compatibility)
    outputChannel.appendLine('[ChangeDetect] ⚠️  Using cache for old data (fallback mode)');
    oldFrontmatter = await cache.get(filePath);
  }

  // Step 2: Invalidate cache and re-parse (get new data)
  cache.invalidate(filePath);
  const newFrontmatter = await cache.get(filePath);

  // Convert Frontmatter to PlanningTreeItem
  const oldTreeItem = oldFrontmatter ? convertToTreeItem(oldFrontmatter, filePath) : null;
  const newTreeItem = newFrontmatter ? convertToTreeItem(newFrontmatter, filePath) : null;

  const duration = Date.now() - startTime;
  outputChannel.appendLine(`[ChangeDetect] Analyzed in ${duration}ms: ${filePath}`);

  // Step 3: Handle file creation
  if (!oldTreeItem && newTreeItem) {
    outputChannel.appendLine(`[ChangeDetect] File created (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      newData: newTreeItem,
      changedFields: ['created']
    };
  }

  // Step 4: Handle file deletion
  if (oldTreeItem && !newTreeItem) {
    outputChannel.appendLine(`[ChangeDetect] File deleted (STRUCTURE)`);
    return {
      type: ChangeType.STRUCTURE,
      oldData: oldTreeItem,
      changedFields: ['deleted']
    };
  }

  // Step 5: Handle error state (both null)
  if (!oldTreeItem && !newTreeItem) {
    outputChannel.appendLine(`[ChangeDetect] ⚠️  No data (STRUCTURE fallback)`);
    return {
      type: ChangeType.STRUCTURE,
      changedFields: []
    };
  }

  // Step 6: Compare frontmatter fields to detect changes
  const changedFields: string[] = [];

  // Critical fields that affect structure/display
  if (oldTreeItem!.status !== newTreeItem!.status) {
    changedFields.push('status');
  }
  if (oldTreeItem!.priority !== newTreeItem!.priority) {
    changedFields.push('priority');
  }
  if (oldTreeItem!.title !== newTreeItem!.title) {
    changedFields.push('title');
  }
  if (oldTreeItem!.item !== newTreeItem!.item) {
    changedFields.push('item');
  }

  outputChannel.appendLine(
    `[ChangeDetect] Changed fields: ${changedFields.length > 0 ? changedFields.join(', ') : 'none'}`
  );

  // Step 7: Classify change based on which fields changed

  // STRUCTURE: Status change (affects status group membership)
  if (changedFields.includes('status')) {
    outputChannel.appendLine(
      `[ChangeDetect] Status changed: ${oldTreeItem!.status} → ${newTreeItem!.status} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData: oldTreeItem,
      newData: newTreeItem,
      changedFields
    };
  }

  // STRUCTURE: Item number change (affects hierarchy position)
  if (changedFields.includes('item')) {
    outputChannel.appendLine(
      `[ChangeDetect] Item number changed: ${oldTreeItem!.item} → ${newTreeItem!.item} (STRUCTURE)`
    );
    return {
      type: ChangeType.STRUCTURE,
      oldData: oldTreeItem,
      newData: newTreeItem,
      changedFields
    };
  }

  // CONTENT: Title or priority change (affects display only)
  if (changedFields.includes('title') || changedFields.includes('priority')) {
    outputChannel.appendLine(
      `[ChangeDetect] Display fields changed: ${changedFields.join(', ')} (CONTENT)`
    );
    return {
      type: ChangeType.CONTENT,
      oldData: oldTreeItem,
      newData: newTreeItem,
      changedFields
    };
  }

  // BODY: No frontmatter changes (description, acceptance criteria, etc.)
  if (changedFields.length === 0) {
    outputChannel.appendLine(`[ChangeDetect] Body-only change (BODY)`);
    return {
      type: ChangeType.BODY,
      oldData: oldTreeItem,
      newData: newTreeItem,
      changedFields: []
    };
  }

  // Unknown change → STRUCTURE (safe fallback)
  outputChannel.appendLine(
    `[ChangeDetect] ⚠️  Unknown changes: ${changedFields.join(', ')} (STRUCTURE fallback)`
  );
  return {
    type: ChangeType.STRUCTURE,
    oldData: oldTreeItem,
    newData: newTreeItem,
    changedFields
  };
}
