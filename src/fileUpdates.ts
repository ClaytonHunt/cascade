/**
 * File Update Module
 *
 * Provides functions for updating frontmatter status fields in planning markdown files.
 * Used by drag-and-drop controller (S60/S61) to persist status changes.
 *
 * ## File Update Strategy
 *
 * Updates use a read-parse-modify-write cycle:
 * 1. Read file content using VSCode Workspace FS API
 * 2. Parse frontmatter using existing parser module
 * 3. Update status and updated fields (preserve all other fields)
 * 4. Serialize frontmatter back to YAML
 * 5. Write file atomically
 *
 * ## Auto-Refresh Integration
 *
 * File writes trigger FileSystemWatcher (S38):
 * - Watcher detects change after 300ms debounce
 * - Cache invalidation occurs (S40)
 * - TreeView refresh happens automatically
 * - No manual refresh needed
 *
 * @module fileUpdates
 */

import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { parseFrontmatter } from './parser';
import { Status, Frontmatter } from './types';

/**
 * Regular expression to extract frontmatter delimiters.
 * Matches the pattern: ---\n{content}\n---\n
 */
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

/**
 * YAML serialization options for consistent formatting.
 */
const YAML_DUMP_OPTIONS: yaml.DumpOptions = {
  indent: 2,           // Standard YAML indentation
  lineWidth: -1,       // Don't wrap long lines
  noRefs: true,        // Don't use YAML anchors/references
  quotingType: '"',    // Use double quotes for strings
  forceQuotes: false   // Only quote when necessary
};

/**
 * Converts a date value (Date object or string) to YYYY-MM-DD format string.
 *
 * js-yaml may auto-parse YYYY-MM-DD strings as Date objects during parsing.
 * This helper ensures dates are always output as strings for consistent formatting.
 *
 * @param dateValue - Date object or string in YYYY-MM-DD format
 * @returns Date string in YYYY-MM-DD format
 */
function normalizeDateField(dateValue: string | Date): string {
  if (dateValue instanceof Date) {
    return dateValue.toISOString().split('T')[0];
  }
  return dateValue;
}

/**
 * Updates the status field in a planning item's frontmatter.
 *
 * Performs atomic file update:
 * 1. Read file content
 * 2. Parse frontmatter
 * 3. Update status and updated fields
 * 4. Serialize frontmatter back to YAML
 * 5. Write file atomically
 *
 * ## Field Updates
 *
 * - `status`: Set to newStatus parameter
 * - `updated`: Set to current date (YYYY-MM-DD)
 * - All other fields: Preserved exactly as-is
 *
 * ## File Write Behavior
 *
 * Uses VSCode Workspace FS API for atomic writes:
 * - Temp file created
 * - Content written to temp
 * - Temp renamed to target (atomic operation)
 * - Prevents corruption on crash/timeout
 *
 * ## Auto-Refresh Trigger
 *
 * File write triggers FileSystemWatcher (S38):
 * - Watcher detects change after 300ms debounce
 * - Cache invalidation occurs (S40)
 * - TreeView refresh happens automatically
 * - No manual refresh needed
 *
 * @param filePath - Absolute path to markdown file
 * @param newStatus - New status value to set
 * @param outputChannel - Output channel for logging
 *
 * @throws Error if file read fails
 * @throws Error if frontmatter parse fails
 * @throws Error if file write fails
 *
 * @example
 * ```typescript
 * try {
 *   await updateItemStatus(
 *     'D:\\projects\\lineage\\plans\\story-49.md',
 *     'In Progress',
 *     outputChannel
 *   );
 *   outputChannel.appendLine('✅ Status updated successfully');
 * } catch (error) {
 *   outputChannel.appendLine(`❌ Update failed: ${error.message}`);
 * }
 * ```
 */
export async function updateItemStatus(
  filePath: string,
  newStatus: Status,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    // Step 1: Read file content
    const uri = vscode.Uri.file(filePath);
    let content: Uint8Array;
    try {
      content = await vscode.workspace.fs.readFile(uri);
    } catch (readError) {
      throw new Error(`Failed to read file: ${readError instanceof Error ? readError.message : 'Unknown error'}`);
    }

    // Convert buffer to string
    const contentStr = Buffer.from(content).toString('utf-8');

    // Step 2: Parse frontmatter using existing parser
    const parseResult = parseFrontmatter(contentStr);
    if (!parseResult.success) {
      throw new Error(`Failed to parse frontmatter: ${parseResult.error}`);
    }

    const frontmatter = parseResult.frontmatter!;
    const oldStatus = frontmatter.status;

    // Step 3: Extract markdown content (after frontmatter)
    const frontmatterMatch = contentStr.match(FRONTMATTER_REGEX);
    if (!frontmatterMatch) {
      throw new Error('Frontmatter delimiters not found (corrupted file)');
    }

    const markdownContent = contentStr.substring(frontmatterMatch[0].length);

    // Step 4: Update frontmatter fields
    const today = new Date().toISOString().split('T')[0];

    // Normalize date fields (js-yaml may have auto-parsed dates as Date objects)
    // Cast to any to access potentially Date-typed fields
    const frontmatterAny = frontmatter as any;
    const normalizedFrontmatter = {
      ...frontmatter,
      created: normalizeDateField(frontmatterAny.created),
      updated: normalizeDateField(frontmatterAny.updated)
    };

    // Create updated frontmatter with new status and timestamp
    const updatedFrontmatter: Frontmatter = {
      ...normalizedFrontmatter,
      status: newStatus,
      updated: today
    };

    // Step 5: Serialize frontmatter back to YAML
    let yamlStr: string;
    try {
      yamlStr = yaml.dump(updatedFrontmatter, YAML_DUMP_OPTIONS);
    } catch (yamlError) {
      throw new Error(`Failed to serialize frontmatter: ${yamlError instanceof Error ? yamlError.message : 'Unknown error'}`);
    }

    // Step 6: Reconstruct file content
    // Format: ---\n{YAML}\n---\n{markdown content}
    const newContent = `---\n${yamlStr}---\n${markdownContent}`;

    // Step 7: Write file atomically
    try {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(newContent, 'utf-8'));
    } catch (writeError) {
      throw new Error(`Failed to write file: ${writeError instanceof Error ? writeError.message : 'Unknown error'}`);
    }

    // Step 8: Log success
    outputChannel.appendLine(`[FileUpdate] ✅ Updated status: ${filePath}`);
    outputChannel.appendLine(`  ${oldStatus} → ${newStatus}`);
    outputChannel.appendLine(`  Updated timestamp: ${today}`);

    // Note: FileSystemWatcher will automatically:
    // - Detect file change (300ms debounce)
    // - Invalidate frontmatter cache
    // - Trigger TreeView refresh
    // - No manual refresh needed

  } catch (error) {
    // Log error and re-throw for controller to handle
    outputChannel.appendLine(`[FileUpdate] ❌ Error updating ${filePath}`);
    outputChannel.appendLine(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}
