# Contributing to Meet Cute

Thank you for your interest in contributing to Meet Cute! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We're building this together!

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has been suggested
2. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Potential implementation approach
   - Mockups or examples if applicable

### Pull Requests

1. **Fork the repository**

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow existing code style
   - Write clear commit messages
   - Add tests if applicable
   - Update documentation

4. **Test your changes**
   ```bash
   npm run lint
   npm run test
   npm run build
   ```

5. **Commit your changes**
   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Use conventional commits:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes
   - `refactor:` Code refactoring
   - `test:` Test changes
   - `chore:` Build/tooling changes

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**
   - Describe what changes you made
   - Reference any related issues
   - Include screenshots for UI changes

## Development Setup

See [SETUP.md](./SETUP.md) for detailed development setup instructions.

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Add types for all parameters and return values
- Use interfaces for object shapes

### React

- Use functional components with hooks
- Use TypeScript interfaces for props
- Keep components focused and small
- Use meaningful component and variable names

### Naming Conventions

- Files: `camelCase.ts` or `PascalCase.tsx` for components
- Components: `PascalCase`
- Functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` with descriptive names

### Code Organization

```
src/
├── backend/
│   ├── middleware/      # Express middleware
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic
│   └── utils/           # Utility functions
└── frontend/
    ├── components/      # Reusable components
    ├── pages/           # Page components
    └── utils/           # Utility functions
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

Test API endpoints:
```bash
npm run test:integration
```

### Manual Testing

1. Start development servers
2. Test OAuth flows
3. Create test meetings
4. Verify email delivery
5. Test Focus Scene
6. Check responsive design

## Documentation

- Update README.md for user-facing changes
- Update SETUP.md for setup changes
- Add JSDoc comments for complex functions
- Update API documentation for endpoint changes

## Database Changes

1. **Modify Prisma schema**
   ```prisma
   // prisma/schema.prisma
   ```

2. **Create migration**
   ```bash
   npx prisma migrate dev --name description-of-change
   ```

3. **Test migration**
   - Apply to fresh database
   - Test rollback
   - Verify data integrity

4. **Update related code**
   - Update TypeScript types
   - Update queries
   - Update API responses

## Performance Guidelines

- Minimize database queries
- Use pagination for large datasets
- Cache where appropriate
- Optimize images and assets
- Monitor API response times

## Security Guidelines

- Never commit secrets or API keys
- Validate all user input
- Use parameterized queries (Prisma handles this)
- Follow OAuth best practices
- Keep dependencies updated
- Use HTTPS in production

## Review Process

1. Automated checks must pass:
   - Linting
   - Type checking
   - Tests
   - Build

2. Code review by maintainers:
   - Code quality
   - Best practices
   - Documentation
   - Tests

3. Approval and merge

## Questions?

- Open a discussion in GitHub Discussions
- Ask in pull request comments
- Check existing issues and documentation

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project credits

Thank you for contributing to Meet Cute! 🎬

