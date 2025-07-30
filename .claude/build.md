# Build and Test Docker Image

Please build and test the Docker image with these steps:

1. **Build the Docker image**:
   ```bash
   docker build -t convertx-openapi:local .
   ```

2. **Verify the build**:
   - Check image size: `docker images convertx-openapi:local`
   - Inspect layers: `docker history convertx-openapi:local`

3. **Run container locally**:
   ```bash
   docker run -d \
     --name convertx-test \
     -p 3000:3000 \
     -v $(pwd)/data:/app/data \
     -e JWT_SECRET=test-secret \
     -e NODE_ENV=production \
     convertx-openapi:local
   ```

4. **Test the application**:
   - Check logs: `docker logs convertx-test`
   - Test health: `curl http://localhost:3000`
   - Verify converters load properly

5. **Multi-platform build** (if needed):
   ```bash
   docker buildx build \
     --platform linux/amd64,linux/arm64 \
     -t convertx-openapi:local \
     .
   ```

6. **Push to custom registry** (if configured):
   ```bash
   docker tag convertx-openapi:local ${DOCKER_REGISTRY}/convertx:latest
   docker push ${DOCKER_REGISTRY}/convertx:latest
   ```

7. **Cleanup**:
   ```bash
   docker stop convertx-test
   docker rm convertx-test
   ```

Please execute these steps and report any issues.