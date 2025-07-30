# ConvertX OpenAPI Documentation

ConvertX now includes a fully-featured REST API for programmatic file conversions.

## API Overview

- **Base URL**: `http://localhost:3110/api/v1`
- **Authentication**: JWT Bearer tokens or API keys
- **Format**: JSON
- **Rate Limiting**: 100 requests per 15 minutes (configurable)

## Quick Start

### 1. Get Authentication Token

```bash
# Register a new account
curl -X POST http://localhost:3110/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'

# Or login to existing account
curl -X POST http://localhost:3110/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword"}'
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com"
    },
    "expiresIn": "7d"
  }
}
```

### 2. List Available Converters

```bash
curl http://localhost:3110/api/v1/converters \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Check Supported Formats

```bash
# Check which converters support PDF input
curl http://localhost:3110/api/v1/converters/formats/pdf \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Start a Conversion (Coming Soon)

Full file upload support is coming. Current implementation requires files to be pre-uploaded.

```bash
curl -X POST http://localhost:3110/api/v1/conversions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "files": [{"name": "document.pdf"}],
    "converter": "libreoffice",
    "outputFormat": "docx"
  }'
```

### 5. Check Job Status

```bash
curl http://localhost:3110/api/v1/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Download Converted Files

```bash
curl http://localhost:3110/api/v1/files/JOB_ID/document.docx \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o document.docx
```

## API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login with email/password
- `POST /api/v1/auth/register` - Register new account
- `GET /api/v1/auth/me` - Get current user info
- `POST /api/v1/auth/logout` - Clear auth cookie

### Converters

- `GET /api/v1/converters` - List all converters
- `GET /api/v1/converters/:name` - Get converter details
- `GET /api/v1/converters/formats/:format` - Find converters for format

### Conversions

- `POST /api/v1/conversions` - Start conversion job

### Jobs

- `GET /api/v1/jobs` - List user's jobs
- `GET /api/v1/jobs/:id` - Get job details
- `DELETE /api/v1/jobs/:id` - Delete job

### Files

- `GET /api/v1/files/:jobId` - List files in job
- `GET /api/v1/files/:jobId/:fileName` - Download file

### Health

- `GET /api/v1/health` - API health check

## Swagger Documentation

Interactive API documentation is available at:
```
http://localhost:3110/api/v1/swagger
```

## Environment Variables

```env
# API Configuration
API_ENABLED=true              # Enable API endpoints
API_PREFIX=/api/v1           # API URL prefix
API_RATE_LIMIT=100           # Requests per window
API_RATE_WINDOW=15m          # Rate limit window
API_KEY_ENABLED=false        # Enable API key auth (coming soon)

# Authentication
JWT_SECRET=your-secret-key   # JWT signing secret
ALLOW_UNAUTHENTICATED=false  # Allow anonymous access
ACCOUNT_REGISTRATION=true    # Allow new registrations
```

## Client Examples

### JavaScript/TypeScript

```typescript
class ConvertXClient {
  constructor(private baseUrl: string, private token: string) {}

  async listConverters() {
    const response = await fetch(`${this.baseUrl}/converters`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async startConversion(files: File[], converter: string, outputFormat: string) {
    // Implementation coming soon with multipart upload support
  }
}
```

### Python

```python
import requests

class ConvertXClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {'Authorization': f'Bearer {token}'}
    
    def list_converters(self):
        return requests.get(f'{self.base_url}/converters', headers=self.headers).json()
    
    def get_job_status(self, job_id):
        return requests.get(f'{self.base_url}/jobs/{job_id}', headers=self.headers).json()
```

### cURL

```bash
# Set your token
TOKEN="your-jwt-token"
BASE_URL="http://localhost:3110/api/v1"

# List converters
curl -H "Authorization: Bearer $TOKEN" $BASE_URL/converters

# Check health
curl $BASE_URL/health
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional information (if available)"
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid authentication
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid request parameters
- `VALIDATION_ERROR` - Input validation failed
- `INTERNAL_ERROR` - Server error

## Rate Limiting

Rate limit information is included in response headers:
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining
- `X-RateLimit-Reset` - Time when limit resets (Unix timestamp)

## Coming Soon

1. **Multipart file upload** - Direct file upload in conversion endpoint
2. **API key authentication** - Alternative to JWT for automation
3. **Webhooks** - Get notified when conversions complete
4. **Batch operations** - Convert multiple files in parallel
5. **Advanced options** - Pass converter-specific options
6. **S3/Cloud storage** - Direct upload/download from cloud storage

## Security Notes

1. Always use HTTPS in production
2. Keep your JWT tokens secure
3. Set strong JWT_SECRET in production
4. Enable rate limiting to prevent abuse
5. Use CORS settings appropriate for your use case

## Support

For API issues or feature requests, please open an issue on GitHub.