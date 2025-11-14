# Contributing to Cascade

Thank you for your interest in contributing to Cascade!

## License

By contributing to Cascade, you agree that your contributions will be licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

## Developer Certificate of Origin

By submitting a contribution, you certify that:

- The contribution was created in whole or in part by you and you have the right to submit it under the AGPL-3.0 license; or
- The contribution is based upon previous work that, to the best of your knowledge, is covered under an appropriate open source license and you have the right under that license to submit that work with modifications; or
- The contribution was provided directly to you by some other person who certified (1) or (2) and you have not modified it.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/ClaytonHunt/cascade/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - VSCode version and OS
   - Cascade extension version

### Suggesting Features

1. Check existing [Issues](https://github.com/ClaytonHunt/cascade/issues) for similar requests
2. Create a new issue describing:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - How it benefits other users

### Pull Requests

1. **Fork the repository** and create your branch from `master`
2. **Make your changes**:
   - Follow existing code style
   - Add copyright headers to new files (see `src/extension-cascade.ts` for template)
   - Update documentation if needed
3. **Test your changes**:
   ```bash
   npm run compile
   npm run package
   code --install-extension cascade-[version].vsix --force
   # Reload VSCode and test
   ```
4. **Commit your changes**:
   - Use clear, descriptive commit messages
   - Reference issue numbers if applicable (e.g., "Fix #123: ...")
5. **Submit a pull request**:
   - Describe what your PR does
   - Link to related issues
   - Explain any breaking changes

## Development Setup

```bash
# Clone the repository
git clone https://github.com/ClaytonHunt/cascade.git
cd cascade

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile)
npm run watch

# Package extension
npm run package

# Install locally
code --install-extension cascade-[version].vsix --force
```

## Code Style

- Use TypeScript
- Follow existing formatting conventions
- Document public APIs with JSDoc comments
- Use meaningful variable and function names

## Testing

- Test manually in a workspace with `.cascade/` directory
- Verify file watchers work for registry and markdown changes
- Check state propagation correctness
- Test with various work item hierarchies

## Questions?

Feel free to open an issue for any questions about contributing!

---

Thank you for contributing to Cascade!
