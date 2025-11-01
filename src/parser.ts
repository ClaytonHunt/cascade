import * as yaml from 'js-yaml';
import { Frontmatter, ParseResult } from './types';

/**
 * Regular expression to extract frontmatter from markdown.
 *
 * Pattern breakdown:
 * - ^---\s*\n: Opening delimiter at start of file
 * - ([\s\S]*?): Capture group for YAML content (non-greedy)
 * - \n---\s*\n: Closing delimiter
 *
 * Handles both LF (\n) and CRLF (\r\n) line endings.
 */
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

/**
 * Validates that all required frontmatter fields are present.
 *
 * Required fields per docs/frontmatter-schema.md:
 * - item: Unique identifier (P#, E#, F#, S#, B#)
 * - title: Human-readable name
 * - type: Item type enum
 * - status: Lifecycle state enum
 * - priority: Importance level enum
 * - created: Creation date (YYYY-MM-DD)
 * - updated: Last modified date (YYYY-MM-DD)
 *
 * @param obj - Parsed YAML object
 * @returns Array of missing field names (empty if all present)
 */
function validateRequiredFields(obj: any): string[] {
  const requiredFields = ['item', 'title', 'type', 'status', 'priority', 'created', 'updated'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    // Field is missing if:
    // - Not present in object
    // - Is null
    // - Is undefined
    // - Is empty string
    if (!(field in obj) || obj[field] === null || obj[field] === undefined || obj[field] === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}

/**
 * Validates that type field matches allowed enum values.
 *
 * Valid types: project, epic, feature, story, bug, spec, phase
 *
 * @param type - The type field value
 * @returns true if valid, false otherwise
 */
function isValidType(type: string): boolean {
  const validTypes = ['project', 'epic', 'feature', 'story', 'bug', 'spec', 'phase'];
  return validTypes.includes(type);
}

/**
 * Validates that status field matches allowed enum values.
 *
 * Valid statuses: Not Started, In Planning, Ready, In Progress, Blocked, Completed, Archived
 *
 * @param status - The status field value
 * @returns true if valid, false otherwise
 */
function isValidStatus(status: string): boolean {
  const validStatuses = ['Not Started', 'In Planning', 'Ready', 'In Progress', 'Blocked', 'Completed', 'Archived'];
  return validStatuses.includes(status);
}

/**
 * Validates that priority field matches allowed enum values.
 *
 * Valid priorities: High, Medium, Low
 *
 * @param priority - The priority field value
 * @returns true if valid, false otherwise
 */
function isValidPriority(priority: string): boolean {
  const validPriorities = ['High', 'Medium', 'Low'];
  return validPriorities.includes(priority);
}

/**
 * Validates that a date string matches YYYY-MM-DD format.
 *
 * Does basic format check - does not validate calendar accuracy
 * (e.g., 2025-02-30 would pass format check but is invalid date).
 *
 * @param dateStr - The date string to validate
 * @returns true if format is YYYY-MM-DD, false otherwise
 */
function isValidDateFormat(dateStr: string): boolean {
  // Regex: 4 digits - 2 digits - 2 digits
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateStr);
}

/**
 * Validates that item number matches expected pattern.
 *
 * Pattern: Single letter (P, E, F, S, B) followed by one or more digits
 * Examples: P1, E12, F20, S39, B5
 *
 * @param item - The item number string
 * @returns true if valid format, false otherwise
 */
function isValidItemFormat(item: string): boolean {
  // Regex: P|E|F|S|B followed by one or more digits
  const itemRegex = /^[PEFSB]\d+$/;
  return itemRegex.test(item);
}

/**
 * Validates that estimate field (if present) matches allowed enum values.
 *
 * Valid estimates: XS, S, M, L, XL
 *
 * @param estimate - The estimate field value
 * @returns true if valid or undefined, false if invalid
 */
function isValidEstimate(estimate: string | undefined): boolean {
  if (estimate === undefined) {
    return true; // Optional field, undefined is valid
  }

  const validEstimates = ['XS', 'S', 'M', 'L', 'XL'];
  return validEstimates.includes(estimate);
}

/**
 * Extracts and parses YAML frontmatter from markdown content.
 *
 * Frontmatter must be enclosed in triple-dash delimiters (---) at the start of the file.
 * Example:
 * ```
 * ---
 * item: S39
 * title: YAML Frontmatter Parser
 * type: story
 * status: Ready
 * priority: High
 * created: 2025-10-12
 * updated: 2025-10-12
 * ---
 *
 * # S39 - YAML Frontmatter Parser
 * ...
 * ```
 *
 * @param content - The full markdown file content as a string
 * @returns ParseResult with success flag, frontmatter data, or error message
 *
 * @example
 * ```typescript
 * const content = await fs.readFile('plans/story-39.md', 'utf-8');
 * const result = parseFrontmatter(content);
 *
 * if (result.success) {
 *   console.log(`Item: ${result.frontmatter.item}`);
 *   console.log(`Status: ${result.frontmatter.status}`);
 * } else {
 *   console.error(`Parse error: ${result.error}`);
 * }
 * ```
 */
export function parseFrontmatter(content: string): ParseResult {
  try {
    // Extract frontmatter using regex
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      return {
        success: false,
        error: 'No frontmatter found (missing --- delimiters)'
      };
    }

    const yamlContent = match[1];

    // Parse YAML content
    let frontmatter: any;
    try {
      frontmatter = yaml.load(yamlContent);
    } catch (yamlError) {
      return {
        success: false,
        error: `Invalid YAML syntax: ${yamlError instanceof Error ? yamlError.message : 'Unknown YAML error'}`
      };
    }

    // Verify result is an object (not null, array, etc.)
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      return {
        success: false,
        error: 'Frontmatter must be a YAML object (not array, null, or primitive)'
      };
    }

    // Phase 2: Validate required fields
    const missingFields = validateRequiredFields(frontmatter);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    // Validate type enum
    if (!isValidType(frontmatter.type)) {
      return {
        success: false,
        error: `Invalid type value: "${frontmatter.type}". Must be one of: project, epic, feature, story, bug, spec, phase`
      };
    }

    // Validate status enum
    if (!isValidStatus(frontmatter.status)) {
      return {
        success: false,
        error: `Invalid status value: "${frontmatter.status}". Must be one of: Not Started, In Planning, Ready, In Progress, Blocked, Completed`
      };
    }

    // Validate priority enum
    if (!isValidPriority(frontmatter.priority)) {
      return {
        success: false,
        error: `Invalid priority value: "${frontmatter.priority}". Must be one of: High, Medium, Low`
      };
    }

    // Validate date formats
    // js-yaml auto-parses YYYY-MM-DD dates as Date objects (valid behavior)
    // We accept Date objects or strings matching YYYY-MM-DD format
    const createdValid = (frontmatter.created instanceof Date) ||
                         (typeof frontmatter.created === 'string' && isValidDateFormat(frontmatter.created));
    if (!createdValid) {
      const createdStr = String(frontmatter.created);
      return {
        success: false,
        error: `Invalid created date format: "${createdStr}". Must be YYYY-MM-DD (e.g., 2025-10-12)`
      };
    }

    const updatedValid = (frontmatter.updated instanceof Date) ||
                         (typeof frontmatter.updated === 'string' && isValidDateFormat(frontmatter.updated));
    if (!updatedValid) {
      const updatedStr = String(frontmatter.updated);
      return {
        success: false,
        error: `Invalid updated date format: "${updatedStr}". Must be YYYY-MM-DD (e.g., 2025-10-12)`
      };
    }

    // Validate item number format
    if (!isValidItemFormat(frontmatter.item)) {
      return {
        success: false,
        error: `Invalid item format: "${frontmatter.item}". Must match P#, E#, F#, S#, or B# (e.g., S39, F11, B1)`
      };
    }

    // Validate optional estimate field
    if (!isValidEstimate(frontmatter.estimate)) {
      return {
        success: false,
        error: `Invalid estimate value: "${frontmatter.estimate}". Must be one of: XS, S, M, L, XL`
      };
    }

    // Success - return parsed frontmatter
    return {
      success: true,
      frontmatter: frontmatter as Frontmatter
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}
