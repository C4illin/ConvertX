# Create Pull Request

Please create a pull request with the following steps:

1. **Ensure branch is up to date**:
   - Check current branch with `git branch --show-current`
   - Pull latest changes from main/master
   - Push current branch to remote

2. **Create PR using GitHub CLI** (`gh pr create`) with:
   - Clear, descriptive title
   - Comprehensive description including:
     - What changes were made
     - Why these changes were necessary
     - How to test the changes
     - Any breaking changes or migration notes

3. **PR Template**:
   ```markdown
   ## Summary
   Brief description of what this PR does.

   ## Changes
   - List of specific changes made
   - Organized by component/feature

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   - [ ] Documentation updated

   ## Screenshots
   (If applicable)

   ## Breaking Changes
   - List any breaking changes
   - Migration instructions if needed

   ## Related Issues
   Closes #XXX
   ```

4. **Labels to consider**:
   - `enhancement`: New features
   - `bug`: Bug fixes
   - `documentation`: Doc updates
   - `api`: API-related changes
   - `docker`: Container changes
   - `dependencies`: Dependency updates

Please analyze the current branch changes and create an appropriate PR.