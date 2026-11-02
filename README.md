![ConvertX](images/logo.png)

# ConvertX

[![Docker](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml/badge.svg?branch=main)](https://github.com/C4illin/ConvertX/actions/workflows/docker-publish.yml)
[![ghcr.io Pulls](https://img.shields.io/badge/dynamic/json?logo=github&url=https%3A%2F%2Fipitio.github.io%2Fbackage%2FC4illin%2FConvertX%2Fconvertx.json&query=%24.downloads&label=ghcr.io%20pulls&cacheSeconds=14400)](https://github.com/C4illin/ConvertX/pkgs/container/ConvertX)
[![Docker Pulls](https://img.shields.io/docker/pulls/c4illin/convertx?style=flat&logo=docker&label=dockerhub%20pulls&link=https%3A%2F%2Fhub.docker.com%2Frepository%2Fdocker%2Fc4illin%2Fconvertx%2Fgeneral)](https://hub.docker.com/r/c4illin/convertx)
[![GitHub Release](https://img.shields.io/github/v/release/C4illin/ConvertX)](https://github.com/C4illin/ConvertX/pkgs/container/convertx)
![GitHub commits since latest release](https://img.shields.io/github/commits-since/C4illin/ConvertX/latest)
![GitHub repo size](https://img.shields.io/github/repo-size/C4illin/ConvertX)
![Docker container size](https://ghcr-badge.egpl.dev/c4illin/convertx/size?color=%230375b6&tag=latest&label=image+size&trim=)

<a href="https://trendshift.io/repositories/13818" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13818" alt="C4illin%2FConvertX | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>

<!-- ![Dev image size](https://ghcr-badge.egpl.dev/c4illin/convertx/size?color=%230375b6&tag=main&label=dev+image&trim=) -->

A self-hosted online file converter. Supports over a thousand different formats. Written with TypeScript, Bun and Elysia.

## Features

- Convert files to different formats
- Process multiple files at once
- Password protection
- Multiple accounts

## Converters supported

| Converter                                                       | Use case         | Converts from | Converts to |
| --------------------------------------------------------------- | ---------------- | ------------- | ----------- |
| [Inkscape](https://inkscape.org/)                               | Vector images    | 7             | 17          |
| [libjxl](https://github.com/libjxl/libjxl)                      | JPEG XL          | 11            | 11          |
| [resvg](https://github.com/RazrFalcon/resvg)                    | SVG              | 1             | 1           |
| [Vips](https://github.com/libvips/libvips)                      | Images           | 45            | 23          |
| [libheif](https://github.com/strukturag/libheif)                | HEIF             | 2             | 4           |
| [XeLaTeX](https://tug.org/xetex/)                               | LaTeX            | 1             | 1           |
| [Calibre](https://calibre-ebook.com/)                           | E-books          | 26            | 19          |
| [LibreOffice](https://www.libreoffice.org/)                     | Documents        | 41            | 22          |
| [Dasel](https://github.com/TomWright/dasel)                     | Data Files       | 5             | 4           |
| [DjVuLibre](https://djvu.sourceforge.net/)                      | Documents        | 2             | 2           |
| [Pandoc](https://pandoc.org/)                                   | Documents        | 43            | 65          |
| [msgconvert](https://github.com/mvz/email-outlook-message-perl) | Outlook          | 1             | 1           |
| VCF to CSV                                                      | Contacts         | 1             | 1           |
| [dvisvgm](https://dvisvgm.de/)                                  | Vector images    | 4             | 2           |
| [ImageMagick](https://imagemagick.org/)                         | Images           | 245           | 183         |
| [GraphicsMagick](http://www.graphicsmagick.org/)                | Images           | 167           | 130         |
| [Assimp](https://github.com/assimp/assimp)                      | 3D Assets        | 77            | 23          |
| [FFmpeg](https://ffmpeg.org/)                                   | Video            | ~472          | ~199        |
| [Potrace](https://potrace.sourceforge.net/)                     | Raster to vector | 4             | 11          |
| [VTracer](https://github.com/visioncortex/vtracer)              | Raster to vector | 8             | 1           |
| [Markitdown](https://github.com/microsoft/markitdown)           | Documents        | 6             | 1           |
| [pdftops](https://poppler.freedesktop.org/)                     | Documents        | 1             | 2           |

<!-- many ffmpeg fileformats are duplicates -->

Any missing converter? Open an issue or pull request!

## Deployment

> [!WARNING]
> If you can't login, make sure you are accessing the service over localhost or https otherwise set HTTP_ALLOWED=true

```yml
# docker-compose.yml
services:
  convertx:
    image: ghcr.io/c4illin/convertx
    container_name: convertx
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PUID=1000 # user id for file permissions (should match your host user id)
      - JWT_SECRET=aLongAndSecretStringUsedToSignTheJSONWebToken1234 # will use randomUUID() if unset
      # - HTTP_ALLOWED=true # uncomment this if accessing it over a non-https connection
    volumes:
      - ./data:/app/data
```

or

```bash
docker run -p 3000:3000 -e PUID=1000 -e PGID=1000 -v ./data:/app/data ghcr.io/c4illin/convertx
```

Ensure `PUID` and `PGID` match your host user (`id -u` and `id -g`) to avoid permission issues on the mapped `./data` volume. If you get unable to open database file, verify the directory permissions or run `chown -R $USER:$USER path` on the path you choose.

Then visit `http://localhost:3000` in your browser and create your account. Don't leave it unconfigured and open, as anyone can register the first account.

### Environment variables

All are optional, JWT_SECRET is recommended to be set.

> [!WARNING]
> Never expose the service to the internet with ALLOW_UNAUTHENTICATED or ACCOUNT_REGISTRATION true. Only allow users you trust to access the service.

| Name                         | Default                                            | Description                                                                                                                                                   |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT_SECRET                   | when unset it will use the value from randomUUID() | A long and secret string used to sign the JSON Web Token                                                                                                      |
| PUID                         | 0 (root)                                           | User ID to run the application process as (it first uses root to chown the files)                                                                             |
| PGID                         | PUID if unset, root if both unset                  | Group ID to run the application process as                                                                                                                    |
| UMASK                        | 002 (when PUID is set)                             | File creation mask for processes and created files                                                                                                            |
| ACCOUNT_REGISTRATION         | false                                              | Allow users to register accounts                                                                                                                              |
| HTTP_ALLOWED                 | false                                              | Allow HTTP connections, only set this to true locally                                                                                                         |
| ALLOW_UNAUTHENTICATED        | false                                              | Allow unauthenticated users to use the service, only set this to true locally                                                                                 |
| AUTO_DELETE_EVERY_N_HOURS    | 24                                                 | Checks every n hours for files older then n hours and deletes them, set to 0 to disable                                                                       |
| WEBROOT                      |                                                    | The address to the root path setting this to "/convert" will serve the website on "example.com/convert/"                                                      |
| BRANDING                     | ConvertX                                           | Custom string that allows you to change the display name of the website in the header (max 26 characters)                                                     |
| FFMPEG_ARGS                  |                                                    | Arguments to pass to the input file of ffmpeg, e.g. `-hwaccel vaapi`. See https://github.com/C4illin/ConvertX/issues/190 for more info about hw-acceleration. |
| FFMPEG_OUTPUT_ARGS           |                                                    | Arguments to pass to the output of ffmpeg, e.g. `-preset veryfast`                                                                                            |
| HIDE_HISTORY                 | false                                              | Hide the history page                                                                                                                                         |
| LANGUAGE                     | en                                                 | Language to format date strings in, specified as a [BCP 47 language tag](https://en.wikipedia.org/wiki/IETF_language_tag)                                     |
| UNAUTHENTICATED_USER_SHARING | false                                              | Shares conversion history between all unauthenticated users                                                                                                   |
| MAX_CONVERT_PROCESS          | 0                                                  | Maximum number of concurrent conversion processes allowed. Set to 0 for unlimited.                                                                            |
| PORT                         | 3000                                               | Application listen port                                                                                                                                       |
| SSO_ENABLED                  | false                                              | Take the user identity from a reverse-proxy header instead of the local login form. See [Single sign-on](#single-sign-on-forward-auth).                       |
| SSO_UID_HEADER               | x-authentik-uid                                    | Header carrying the stable user id when `SSO_ENABLED` is true                                                                                                 |
| SSO_USERNAME_HEADER          | x-authentik-username                               | Header carrying the display name when `SSO_ENABLED` is true                                                                                                   |

### Single sign-on (forward auth)

`SSO_ENABLED=true` lets a reverse proxy that has already authenticated the user (authentik, oauth2-proxy, Authelia, …) hand the identity to ConvertX in a header. ConvertX then skips its own login: `/login`, `/setup`, `/register` and `POST /account` return 404, `/logoff` only drops the local session, and `/account` shows the proxy identity read-only.

> [!WARNING]
> The header is trusted. Enable this only when ConvertX is reachable **exclusively** through the proxy: the proxy must strip client-supplied `X-authentik-*` headers, and direct access to the container port must be blocked (network policy, private network, or both). Never publish the port itself.

The header value is mapped to the integer `users.id` the database requires: authentik's 64-hex uid uses its first 52 bits, offset above the local-account range; any other value is sha256-hashed. The first request creates the user with a random password hash, so password login can never match an SSO account. No schema change and no migration: local accounts keep their ids, SSO accounts live at `id >= 2^24`.

#### authentik + Traefik

```yaml
# convertx environment
SSO_ENABLED: "true"
SSO_UID_HEADER: x-authentik-uid
SSO_USERNAME_HEADER: x-authentik-username
```

```yaml
# Traefik forward-auth middleware (domain-level outpost)
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: authentik-forward-auth
spec:
  forwardAuth:
    address: http://authentik-server/outpost.goauthentik.io/auth/traefik
    authResponseHeaders:
      - X-authentik-uid
      - X-authentik-username
```

Attach that middleware to the ConvertX router. Any proxy that sets a stable, unique id header works; name it with `SSO_UID_HEADER` / `SSO_USERNAME_HEADER`.

#### Notes

- With `SSO_ENABLED=true` the local password form is unreachable; set the flag back to `false` to use local accounts again. SSO users are not deleted.
- No role or admin mapping yet: every authenticated user is a normal ConvertX user.
- No signature verification of `X-authentik-jwt` in v1; the trust boundary is the proxy plus the network restriction above.

### Docker images

There is a `:latest` tag that is updated with every release and a `:main` tag that is updated with every push to the main branch. `:latest` is recommended for normal use.

The image is available on [GitHub Container Registry](https://github.com/C4illin/ConvertX/pkgs/container/ConvertX) and [Docker Hub](https://hub.docker.com/r/c4illin/convertx).

| Image                                  | What it is                       |
| -------------------------------------- | -------------------------------- |
| `image: ghcr.io/c4illin/convertx`      | The latest release on ghcr       |
| `image: ghcr.io/c4illin/convertx:main` | The latest commit on ghcr        |
| `image: c4illin/convertx`              | The latest release on docker hub |
| `image: c4illin/convertx:main`         | The latest commit on docker hub  |

![Release image size](https://ghcr-badge.egpl.dev/c4illin/convertx/size?color=%230375b6&tag=latest&label=release+image&trim=)
![Dev image size](https://ghcr-badge.egpl.dev/c4illin/convertx/size?color=%230375b6&tag=main&label=dev+image&trim=)

<!-- Dockerhub was introduced in 0.9.0 and older releases -->

### Tutorial

> [!NOTE]
> These are written by other people, and may be outdated, incorrect or wrong.

Tutorial in french: <https://belginux.com/installer-convertx-avec-docker/>

Tutorial in chinese: <https://xzllll.com/24092901/>

Tutorial in polish: <https://www.kreatywnyprogramista.pl/convertx-lokalny-konwerter-plikow>

## Screenshots

![ConvertX Preview](images/preview.png)

## Development

0. Install [Bun](https://bun.sh/) and Git
1. Clone the repository
2. `bun install`
3. `bun run dev`

Pull requests are welcome! See open issues for the list of todos. The ones tagged with "converter request" are quite easy. Help with docs and cleaning up in issues are also very welcome!

Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) for commit messages.

## Contributors

<a href="https://github.com/C4illin/ConvertX/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=C4illin/ConvertX" alt="Image with all contributors"/>
</a>

## Star History

<a href="https://github.com/C4illin/ConvertX/stargazers">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=C4illin/ConvertX&type=Date" />
 </picture>
</a>
