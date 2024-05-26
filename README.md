![ConvertX](images/logo.png)
# ConvertX
[![Docker](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml)

A self-hosted online file converter. Supports 831 different formats. Written with Typescript, Bun and Elysia.

## Features

- Convert files to different formats
- Password protection
- Multiple accounts

## Converters supported

| Converter      | Use case      | Converts from | Converts to |
|----------------|---------------|---------------|-------------|
| Vips           | Images (fast) | 45            | 23          |
| Pandoc         | Documents     | 43            | 65          |
| GraphicsMagick | Images        | 166           | 133         |
| FFmpeg         | Video         | ~473          | ~280        |

<!-- many ffmpeg fileformats are duplicates -->

## Deployment

```yml
# docker-compose.yml
services:
  convertx: 
    image: ghcr.io/c4illin/convertx:main
    ports:
      - "3000:3000"
    environment: # Defaults are listed below
      - ACCOUNT_REGISTRATION=false # true or false
      - JWT_SECRET=aLongAndSecretStringUsedToSignTheJSONWebToken1234
    volumes:
      - /path/you/want:/app/data
```

<!-- or

```bash
docker run ghcr.io/c4illin/convertx:master -p 3000:3000 -e ACCOUNT_REGISTRATION=false -v /path/you/want:/app/data
``` -->

Then visit `http://localhost:3000` in your browser and create your account. Don't leave it unconfigured and open, as anyone can register the first account.

## Todo
- [x] Add messages for errors in converters
- [ ] Add options for converters
- [ ] Add more converters
- [ ] Divide index.tsx into smaller components
- [ ] Add tests
- [ ] Add searchable list of formats
