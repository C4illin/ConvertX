# ConvertX Codebase Documentation

## Overview
ConvertX is a self-hosted file conversion service built with Bun and Elysia framework. It supports 1000+ file format conversions using 17 different converter tools.

## Tech Stack
- **Runtime**: Bun
- **Framework**: Elysia (TypeScript)
- **Database**: SQLite with Bun's built-in driver
- **Frontend**: Server-side rendered HTML with HTMX, Tailwind CSS
- **Authentication**: JWT tokens via @elysiajs/jwt
- **Container**: Docker (Debian Trixie Slim base)

## Project Structure
```
ConvertX-openAPI/
├── src/
│   ├── index.tsx              # Main app entry, route setup
│   ├── api/                   # NEW: OpenAPI endpoints
│   │   ├── v1/                # API version 1
│   │   ├── middleware/        # API middleware
│   │   └── schemas/           # Request/response schemas
│   ├── converters/            # File conversion logic
│   │   ├── main.ts           # Converter orchestration
│   │   └── [converter].ts    # Individual converter wrappers
│   ├── pages/                # Web UI route handlers
│   ├── components/           # UI components
│   ├── db/                   # Database schema
│   └── helpers/              # Utilities
├── data/                     # Runtime data
│   ├── uploads/              # User uploaded files
│   ├── output/               # Converted files
│   └── mydb.sqlite          # SQLite database
└── public/                   # Static assets
```

## Key Concepts

### Converters
Each converter (ffmpeg, pandoc, etc.) is wrapped in a TypeScript module that:
1. Exports `properties` defining supported input/output formats
2. Exports `convert` function that executes the conversion
3. Returns status string: "Done", "Failed", or custom message

### Job Flow
1. User uploads files → creates job with unique ID
2. Files stored in `data/uploads/{userId}/{jobId}/`
3. User selects converter → triggers conversion
4. Converted files saved to `data/output/{userId}/{jobId}/`
5. Job status tracked in database
6. Auto-deletion after N hours (configurable)

### Authentication
- JWT-based with 7-day expiration
- User ID 0 reserved for unauthenticated users (if enabled)
- First user registration creates admin account

## Environment Variables
- `JWT_SECRET`: Secret for JWT signing (auto-generated if not set)
- `WEBROOT`: URL prefix for deployment (default: "")
- `ACCOUNT_REGISTRATION`: Enable user registration
- `ALLOW_UNAUTHENTICATED`: Allow usage without login
- `HTTP_ALLOWED`: Allow HTTP (not just HTTPS)
- `AUTO_DELETE_EVERY_N_HOURS`: Cleanup interval
- `MAX_CONVERT_PROCESS`: Parallel conversion limit

## Database Schema
```sql
users: id, email, password
jobs: id, user_id, date_created, status, num_files
file_names: id, job_id, file_name, output_file_name, status
```

## API Development Guidelines

### Adding New Endpoints
1. Create route file in `src/api/v1/`
2. Define schemas in `src/api/schemas/`
3. Use existing auth middleware from `src/api/middleware/auth.ts`
4. Reuse converter logic from `src/converters/main.ts`

### Response Format
```json
{
  "success": boolean,
  "data": any,
  "error": string | null,
  "jobId": string | null
}
```

### Error Handling
- Use HTTP status codes appropriately
- Include error details in response body
- Log errors with correlation IDs

## Testing Commands
```bash
# Run type checking
bun run typecheck

# Run linting  
bun run lint

# Run tests (when implemented)
bun test

# Build CSS (development)
bun run build

# Start development server
bun run dev
```

## Docker Commands
```bash
# Build image
docker build -t convertx-openapi .

# Run container
docker run -p 3000:3000 -v ./data:/app/data convertx-openapi

# With custom registry
docker build -t your-registry.com/convertx:latest .
docker push your-registry.com/convertx:latest
```

## Common Tasks

### Adding a New Converter
1. Create `src/converters/newconverter.ts`
2. Export `properties` and `convert` functions
3. Import and add to `properties` object in `main.ts`
4. Update Dockerfile to install required system package

### Debugging Conversions
- Check console logs for converter output
- Verify file permissions in data directories
- Test converter CLI directly in container
- Check `file_names` table for status

### Performance Optimization
- Adjust `MAX_CONVERT_PROCESS` for parallelism
- Use batch processing in `handleConvert`
- Enable SQLite WAL mode (already done)
- Consider external job queue for scale