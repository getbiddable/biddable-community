# Contributing to Biddable Community Edition

Thank you for your interest in contributing to Biddable Community Edition! We welcome contributions from the community.

## Code of Conduct

Be respectful, inclusive, and constructive in all interactions. We're building something great together.

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, browser)
- Screenshots if applicable

### Suggesting Features

We love new ideas! Open an issue with:
- Clear description of the feature
- Use case and benefits
- Any implementation ideas you have

### Submitting Code

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/biddable-community.git
   cd biddable-community
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, readable code
   - Follow existing code style and conventions
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   - Ensure the app builds: `pnpm build`
   - Test locally: `pnpm dev`
   - Verify all features work as expected

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add: brief description of your changes"
   ```

   Use conventional commit prefixes:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for improvements to existing features
   - `Refactor:` for code refactoring
   - `Docs:` for documentation changes

6. **Push and create a Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

   Then open a PR on GitHub with:
   - Clear description of what you changed
   - Why you made the change
   - Any related issues (e.g., "Fixes #123")

## Development Setup

See the [README.md](README.md) for full local setup instructions.

Quick start:
```bash
pnpm install
cp .env.local.example .env.local
# Configure .env.local with your Supabase credentials
pnpm dev
```

## Project Structure

- `app/` - Next.js App Router pages and API routes
- `components/` - React components
- `lib/` - Utility functions and helpers
- `supabase/migrations/` - Database migrations

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define proper types (avoid `any`)
- Use interfaces for object shapes

### Components
- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks

### API Routes
- Always authenticate requests
- Use Supabase RLS for data access control
- Return proper HTTP status codes
- Handle errors gracefully

### Database
- Always use RLS policies
- Write migrations for schema changes
- Test migrations before committing

### Styling
- Use Tailwind CSS classes
- Follow existing design patterns
- Support dark mode

## What We're Looking For

### High Priority
- Bug fixes
- Performance improvements
- Documentation improvements
- Test coverage
- Accessibility improvements

### Welcome Additions
- New platform integrations (TikTok, LinkedIn, etc.)
- Advanced audience targeting features
- Campaign analytics and reporting
- UI/UX improvements
- Mobile responsive enhancements

### Platform Integration Guidelines
If you're adding a new ad platform integration:
1. Add platform option to campaign creation
2. Create platform-specific ad preview
3. Document required API credentials
4. Add setup instructions to README
5. Ensure platform-specific targeting options work

## Questions?

- Open an issue for questions about contributing
- Check existing issues and PRs first
- Be patient - this is a community project

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.

Thank you for making Biddable Community Edition better!
