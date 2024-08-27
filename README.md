![ConvertX](images/logo.png)
# ConvertX
[![Docker](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml)
[![GitHub Release](https://img.shields.io/github/v/release/C4illin/ConvertX)](https://github.com/C4illin/ConvertX/pkgs/container/convertx)
![GitHub commits since latest release](https://img.shields.io/github/commits-since/C4illin/ConvertX/latest)
![GitHub repo size](https://img.shields.io/github/repo-size/C4illin/ConvertX)
![Docker container size](https://ghcr-badge.egpl.dev/c4illin/convertx/size?color=%230375b6&tag=latest&label=image+size&trim=)
![GitHub top language](https://img.shields.io/github/languages/top/C4illin/ConvertX)

A self-hosted online file converter. Supports 831 different formats. Written with TypeScript, Bun and Elysia.

## Features

- Convert files to different formats
- Password protection
- Multiple accounts

## Converters supported

| Converter                                                                    | Use case      | Converts from | Converts to |
|------------------------------------------------------------------------------|---------------|---------------|-------------|
| [libjxl](https://github.com/libjxl/libjxl)                                   | JPEG XL       | 11            | 11          |
| [resvg](https://github.com/RazrFalcon/resvg)                                 | SVG           | 1             | 1           |
| [Vips](https://github.com/libvips/libvips)                                   | Images        | 45            | 23          |
| [XeLaTeX](https://tug.org/xetex/)                                            | LaTeX         | 1             | 1           |
| [Pandoc](https://pandoc.org/)                                                | Documents     | 43            | 65          |
| [GraphicsMagick](http://www.graphicsmagick.org/)                             | Images        | 166           | 133         |
| [FFmpeg](https://ffmpeg.org/)                                                | Video         | ~473          | ~280        |

<!-- many ffmpeg fileformats are duplicates -->

Any missing converter? Open an issue or pull request!

## Deployment

```yml
# docker-compose.yml
services:
  convertx: 
    image: ghcr.io/c4illin/convertx
    container_name: convertx
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment: # Defaults are listed below. All are optional.
      - ACCOUNT_REGISTRATION=false # true or false, doesn't matter for the first account (e.g. keep this to false if you only want one account)
      - JWT_SECRET=aLongAndSecretStringUsedToSignTheJSONWebToken1234 # will use randomUUID() by default
      - HTTP_ALLOWED=false # setting this to true is unsafe, only set this to true locally
      - ALLOW_UNAUTHENTICATED=false # allows anyone to use the service without logging in, only set this to true locally
    volumes:
      - convertx:/app/data
```

or

```bash
docker run ghcr.io/c4illin/convertx -p 3000:3000 -v ./data:/app/data
```

Then visit `http://localhost:3000` in your browser and create your account. Don't leave it unconfigured and open, as anyone can register the first account.

If you get unable to open database file run `chown -R $USER:$USER path` on the path you choose.

### Tutorial

Tutorial in french: https://belginux.com/installer-convertx-avec-docker/

## Development

0. Install [Bun](https://bun.sh/) and Git
1. Clone the repository
2. `bun install`
3. `bun run dev`

Pull requests are welcome! See below and open issues for the list of todos.

## Todo
- [x] Add messages for errors in converters
- [x] Add searchable list of formats
- [ ] Add options for converters
- [ ] Divide index.tsx into smaller components
- [ ] Add tests
- [ ] Make the upload button nicer and more easy to drop files on. Support copy paste as well if possible.
- [ ] Make errors logs visible from the web ui
- [ ] Add more converters:
  - [ ] [deark](https://github.com/jsummers/deark)
  - [ ] LibreOffice
  - [ ] [dvisvgm](https://github.com/mgieseki/dvisvgm)

## Contributors

<a href="https://github.com/C4illin/ConvertX/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=C4illin/ConvertX" />
</a>

## Star History

<a href="https://github.com/C4illin/ConvertX/stargazers">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date" />
 </picture>
</a>
