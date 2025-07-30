# Docker Compose Configuration

This project includes both `compose.yaml` (original) and `docker-compose.yml` (enhanced) for different use cases.

## Files

- **compose.yaml**: Original simple production deployment
- **docker-compose.yml**: Enhanced configuration with development, monitoring, and API features

## Quick Start

### Production Mode
```bash
# Using original compose file
docker compose -f compose.yaml up -d

# Using enhanced compose file (production service only)
docker compose up -d convertx
```

### Development Mode
```bash
# Start development server with hot reload
docker compose --profile dev up convertx-dev

# Start both production and development
docker compose --profile dev up
```

## Services

### convertx (Production)
- Main application service
- Port: 3000
- Includes health checks and auto-restart

### convertx-dev (Development)
- Hot reload enabled
- Port: 3001
- Mounts source code for live editing
- Profile: `dev`

### api-docs (API Documentation)
- Swagger UI for API documentation
- Port: 3002
- Profile: `docs`

### monitoring stack
- Prometheus (port 9090) and Grafana (port 3003)
- Profile: `monitoring`

## Profiles

Use profiles to enable optional services:

```bash
# Development only
docker compose --profile dev up

# With API documentation
docker compose --profile docs up

# With monitoring
docker compose --profile monitoring up

# Everything
docker compose --profile dev --profile docs --profile monitoring up
```

## Environment Variables

Create a `.env` file for custom configuration:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here

# API Configuration
API_ENABLED=true
API_PREFIX=/api/v1
API_RATE_LIMIT=100
API_RATE_WINDOW=15m

# Development
HTTP_ALLOWED=false
ALLOW_UNAUTHENTICATED=false

# Timezone
TZ=America/New_York

# Monitoring
GRAFANA_PASSWORD=secure-password
```

## Development Workflow

1. **Start development environment**:
   ```bash
   docker compose --profile dev up convertx-dev
   ```

2. **Make code changes**: Edit files in `src/` - they'll auto-reload

3. **Test production build**:
   ```bash
   docker compose up --build convertx
   ```

4. **View logs**:
   ```bash
   docker compose logs -f convertx-dev
   ```

## Building Images

```bash
# Build all images
docker compose build

# Build specific service
docker compose build convertx

# Build with no cache
docker compose build --no-cache
```

## Data Persistence

- Application data: `./data` directory (mounted to `/app/data`)
- Prometheus data: `prometheus_data` volume
- Grafana data: `grafana_data` volume

## Networking

All services are on the `convertx-network` by default. To expose services to other containers:

```yaml
external_service:
  networks:
    - convertx-network
  external_links:
    - convertx
```

## Troubleshooting

1. **Port conflicts**: Change ports in docker-compose.yml if needed
2. **Permission issues**: Ensure `./data` directory has correct permissions
3. **Build failures**: Check Dockerfile and ensure all dependencies are available
4. **Hot reload not working**: Verify volume mounts and file permissions

## Production Deployment

For production, consider:

1. Use specific image tags instead of `latest`
2. Set strong JWT_SECRET
3. Disable HTTP_ALLOWED and ALLOW_UNAUTHENTICATED
4. Configure proper backup for data directory
5. Set up monitoring with the monitoring profile
6. Use external database for scale