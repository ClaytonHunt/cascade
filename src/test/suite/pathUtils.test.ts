import * as assert from 'assert';
import { normalizePath } from '../../utils/pathUtils';

suite('pathUtils Test Suite', () => {
  suite('normalizePath', () => {
    test('should convert backslashes to forward slashes', () => {
      const input = 'D:\\Projects\\Lineage\\plans\\story-40.md';
      const expected = 'd:/projects/lineage/plans/story-40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should convert uppercase to lowercase', () => {
      const input = 'D:/Projects/Lineage/Plans/Story-40.md';
      const expected = 'd:/projects/lineage/plans/story-40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle already normalized paths', () => {
      const input = 'd:/projects/lineage/plans/story-40.md';
      const expected = 'd:/projects/lineage/plans/story-40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle Unix-style paths', () => {
      const input = '/home/user/projects/lineage/plans/story-40.md';
      const expected = '/home/user/projects/lineage/plans/story-40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle mixed separators', () => {
      const input = 'D:/Projects\\Lineage/plans\\story-40.md';
      const expected = 'd:/projects/lineage/plans/story-40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle empty string', () => {
      const input = '';
      const expected = '';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle single character paths', () => {
      const input = 'C:';
      const expected = 'c:';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle paths with spaces', () => {
      const input = 'D:\\My Projects\\Lineage\\plans\\story 40.md';
      const expected = 'd:/my projects/lineage/plans/story 40.md';
      assert.strictEqual(normalizePath(input), expected);
    });

    test('should handle paths with special characters', () => {
      const input = 'D:\\Projects\\[Lineage]\\plans\\(story-40).md';
      const expected = 'd:/projects/[lineage]/plans/(story-40).md';
      assert.strictEqual(normalizePath(input), expected);
    });
  });
});
