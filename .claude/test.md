# Run Tests and Checks

Please run the following tests and checks for the ConvertX project:

1. **Type Checking**:
   ```bash
   bun run typecheck
   ```
   Fix any TypeScript errors found

2. **Linting**:
   ```bash
   bun run lint
   ```
   Fix any linting issues

3. **Unit Tests** (if available):
   ```bash
   bun test
   ```

4. **Build Check**:
   ```bash
   bun run build
   ```
   Ensure the build completes successfully

5. **API Tests** (when implemented):
   - Test authentication endpoints
   - Test file upload endpoints
   - Test conversion endpoints
   - Test error handling

6. **Docker Build Test**:
   ```bash
   docker build -t convertx-test .
   ```

7. **Integration Test** (if safe to run):
   - Start the application
   - Upload a test file
   - Convert it
   - Verify the output

Please run these checks and report any issues found. If there are failures, analyze and suggest fixes.