# Local Docker Deployment

This repository includes a dedicated Compose file for normal local usage without rebuilding the image from source.

## Why use this instead of `compose.yaml`

- `compose.local.yaml` pulls the published ConvertX image
- `compose.yaml` builds from the local checkout and is intended for development and testing
- Keeping them separate makes upgrades easier and avoids accidentally coupling local usage to repository state

## Prerequisites

- Docker Desktop or a compatible Docker Engine

## First-time setup

1. Copy the example environment file:

```bash
cp .env.local.example .env.local
```

2. Set a long random `JWT_SECRET` in `.env.local`
3. Start the service:

```bash
docker compose --env-file .env.local -f compose.local.yaml up -d
```

4. Verify the service is healthy:

```bash
docker compose --env-file .env.local -f compose.local.yaml ps
curl -fsS http://127.0.0.1:3000/healthcheck
```

5. Open `http://localhost:3000`

## Useful operations

Start or update the container:

```bash
docker compose --env-file .env.local -f compose.local.yaml up -d
```

Stop the container:

```bash
docker compose --env-file .env.local -f compose.local.yaml down
```

View logs:

```bash
docker compose --env-file .env.local -f compose.local.yaml logs -f
```

Restart after changing configuration:

```bash
docker compose --env-file .env.local -f compose.local.yaml restart
```

## Notes

- The persistent database and job files are stored in `./data`
- `HTTP_ALLOWED=true` is appropriate for localhost usage
- The image reference is pinned through `CONVERTX_IMAGE_REF`, using an immutable digest instead of the floating `latest` tag
