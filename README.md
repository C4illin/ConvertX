# ConvertX

A self-hosted online file converter. Supports 708 different formats.
## Features

- Convert files to different formats
- Password protection
- Multiple accounts


## Converters supported

| Converter      | Use case      | Converts from | Converts to |
|----------------|---------------|---------------|-------------|
| Sharp          | Images (fast) | 7             | 6           |
| Pandoc         | Documents     | 43            | 65          |
| GraphicsMagick | Images        | 166           | 133         |
| FFmpeg         | Video         | 461           | 170         |

## Deployment

```yml
# docker-compose.yml
services:
  convertx: 
    image: ghcr.io/c4illin/convertx:master
    ports:
      - "3000:3000"
    environment: # Defaults are listed below
      - ACCOUNT_REGISTRATION=false # true or false
    volumes:
      - /path/you/want:/app/data
```

<!-- or

```bash
docker run ghcr.io/c4illin/convertx:master -p 3000:3000 -e ACCOUNT_REGISTRATION=false -v /path/you/want:/app/data
``` -->

Then visit `http://localhost:3000` in your browser and create your account.