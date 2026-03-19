# Contributing to SkyVault

Thank you for your interest in contributing to SkyVault!

## Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/skyvault.git
   cd skyvault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   # Or directly
   node bin/skv.js <command>
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## Project Structure

```
src/
├── bin/skv.js              # CLI entry point
├── commands/               # Command implementations
│   ├── add.js
│   ├── get.js
│   ├── list.js
│   └── ...
├── core/                   # Core functionality
│   ├── vault.js
│   ├── crypto.js
│   ├── session.js
│   └── ...
├── ui/                     # Terminal UI
└── utils/                  # Utilities
```

## Code Style

- Use ES6+ modules (import/export)
- Use `const` and `let`, avoid `var`
- Use async/await for asynchronous operations
- Add JSDoc comments for exported functions
- Follow existing code style

## Security Guidelines

When contributing to security-related code:

1. **Never log secrets** - Even in debug mode
2. **Use built-in crypto** - Don't roll your own encryption
3. **Validate all inputs** - Use the validation utils
4. **Clear sensitive data** - Use secureClear() for buffers
5. **Test edge cases** - Especially for crypto operations

## Testing

- Add tests for new features
- Ensure all tests pass before submitting PR
- Test on multiple Node.js versions if possible

## Commit Messages

- Use clear, descriptive commit messages
- Start with verb: "Add", "Fix", "Update", "Remove"
- Reference issues: "Fixes #123"

Example:
```
Add fuzzy search with fuse.js

- Integrate fuse.js for fuzzy matching
- Add threshold configuration option
- Update find command to use fuzzy search
```

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
   - Follow the code style
   - Add tests
   - Update documentation

3. **Submit a pull request**
   - Describe your changes
   - Reference any related issues
   - Ensure tests pass

## Reporting Issues

When reporting bugs:

1. **Check existing issues** - Avoid duplicates
2. **Use issue templates** - If available
3. **Include environment details**:
   - Node.js version
   - Operating system
   - SkyVault version (`skv --version`)

## Security Issues

For security vulnerabilities, please **do not** open a public issue. Instead:

1. Email maintainers directly
2. Describe the vulnerability
3. Provide reproduction steps
4. Wait for acknowledgment before disclosure

## Questions?

- Open an issue for bugs/features
- Check the [documentation](README.md)
- Look at existing issues/discussions

---

Thank you for contributing! 🎉
