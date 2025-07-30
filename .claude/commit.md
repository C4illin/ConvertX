# Commit Changes

Please create a git commit with the following requirements:

1. **Review all changes**: First run `git status` and `git diff` to see what has changed
2. **Stage appropriate files**: Use `git add` to stage the relevant changes
3. **Commit message format**: Use conventional commit format:
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation changes
   - style: Code style changes (formatting, etc)
   - refactor: Code refactoring
   - test: Adding or updating tests
   - chore: Maintenance tasks
   - build: Build system changes
   - ci: CI/CD changes

3. **Message structure**:
   ```
   <type>(<scope>): <subject>
   
   <body>
   
   <footer>
   ```

4. **Guidelines**:
   - Subject line: 50 characters or less
   - Use imperative mood ("add" not "added")
   - Reference issues if applicable
   - Explain the "why" in the body if needed

5. **Run checks**: Before committing, ensure:
   - `bun run typecheck` passes
   - `bun run lint` passes (if available)

Please analyze the changes and create an appropriate commit.