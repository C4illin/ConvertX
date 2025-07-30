# GitHub Actions Configuration

This directory contains GitHub Actions workflows for building and publishing Docker images.

## Workflows

### docker-publish.yml (Original)
The original workflow that publishes to:
- GitHub Container Registry (ghcr.io)
- Docker Hub

### docker-publish-custom.yml (Enhanced)
Enhanced workflow that supports custom Docker registries while maintaining backward compatibility.

## Configuration

To use a custom Docker registry, set the following in your repository:

### Repository Variables (Settings → Secrets and variables → Actions → Variables)
- `DOCKER_REGISTRY`: Your custom registry URL (e.g., `registry.company.com`)
- `DOCKER_USERNAME`: Username for custom registry authentication
- `DOCKERHUB_USERNAME`: Your Docker Hub username (optional)
- `PUSH_TO_GHCR`: Set to `false` to disable GHCR push (default: `true`)
- `PUSH_TO_DOCKERHUB`: Set to `true` to enable Docker Hub push (default: `false`)
- `PUSH_TO_CUSTOM`: Set to `true` to enable custom registry push (default: `false`)

### Repository Secrets (Settings → Secrets and variables → Actions → Secrets)
- `DOCKER_PASSWORD`: Password/token for custom registry authentication
- `DOCKERHUB_TOKEN`: Docker Hub access token (if using Docker Hub)

## Usage Examples

### 1. Use only custom registry
Set variables:
```
DOCKER_REGISTRY=registry.mycompany.com
DOCKER_USERNAME=myuser
PUSH_TO_CUSTOM=true
PUSH_TO_GHCR=false
PUSH_TO_DOCKERHUB=false
```

Set secrets:
```
DOCKER_PASSWORD=<your-registry-password>
```

### 2. Use custom registry + GHCR
Set variables:
```
DOCKER_REGISTRY=registry.mycompany.com
DOCKER_USERNAME=myuser
PUSH_TO_CUSTOM=true
PUSH_TO_GHCR=true
PUSH_TO_DOCKERHUB=false
```

### 3. Use all three registries
Set variables:
```
DOCKER_REGISTRY=registry.mycompany.com
DOCKER_USERNAME=myuser
DOCKERHUB_USERNAME=mydockerhubuser
PUSH_TO_CUSTOM=true
PUSH_TO_GHCR=true
PUSH_TO_DOCKERHUB=true
```

Set secrets:
```
DOCKER_PASSWORD=<your-registry-password>
DOCKERHUB_TOKEN=<your-dockerhub-token>
```

## Image Tags

The workflow creates the following tags:
- `latest`: Latest build from main branch
- `main`: Main branch builds
- `pr-123`: Pull request builds
- `v1.2.3`: Semantic version tags
- `1.2`: Major.minor version
- `1`: Major version
- `main-sha-abc123`: SHA-based tags

## Switching Workflows

To switch from the original to the custom workflow:

1. Rename workflows:
   ```bash
   mv .github/workflows/docker-publish.yml .github/workflows/docker-publish-original.yml
   mv .github/workflows/docker-publish-custom.yml .github/workflows/docker-publish.yml
   ```

2. Or update the workflow triggers to disable one:
   ```yaml
   on:
     workflow_dispatch:  # Manual trigger only
   ```

## Troubleshooting

1. **Authentication failures**: Check that secrets are correctly set
2. **Push failures**: Ensure the registry URL doesn't include `https://`
3. **Missing images**: Verify the PUSH_TO_* variables are set correctly
4. **Build failures**: Check Docker build logs in the Actions tab