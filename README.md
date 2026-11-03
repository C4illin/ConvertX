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

`SSO_ENABLED=true` makes ConvertX take the user's identity from a request header that a reverse proxy sets after it has authenticated them. The built-in login is switched off. Any proxy that can set a stable header works: authentik, oauth2-proxy, Authelia.

#### Before you enable it

1. Create a local account with a password you know. It is the only way back in if the proxy breaks.
2. Put ConvertX on a network the proxy can reach and clients cannot.

#### Enable it

```yaml
services:
  convertx:
    image: ghcr.io/c4illin/convertx
    expose:
      - "3000" # not `ports:`
    networks: [proxy]
    environment:
      SSO_ENABLED: "true"
      SSO_UID_HEADER: x-authentik-uid
      SSO_USERNAME_HEADER: x-authentik-username
```

Never publish the container port. Every control below assumes the app is reachable only through the proxy. If you must keep `ports:`, bind it to `127.0.0.1`.

#### Configure the proxy

Three rules. All three are required.

1. Send the id header on every request, including assets.
2. List every identity header in `authResponseHeaders`. Traefik deletes a listed header from the incoming request and copies it back from the auth response, so a client cannot supply it. A header you leave out is forwarded untouched.
3. Make the proxy overwrite `X-Forwarded-Host` and `X-Forwarded-Proto`, never append. ConvertX reads both when it checks same-origin, so appended values let the caller decide.

```yaml
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

Attach the middleware to the ConvertX router.

#### What changes

| Route                                              | With `SSO_ENABLED=true`                                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /`, `/history`, `/converters`, `/results/:id` | 200 with the header, 401 without it                                                                  |
| `GET /account`                                     | 200, read-only identity                                                                              |
| `GET` and `POST /login`, `/setup`, `/register`     | 404                                                                                                  |
| `POST /account`                                    | 404                                                                                                  |
| `/logoff`                                          | Clears the job cookie, then the proxy signs the browser in again. Sign out at the identity provider. |
| Everything else                                    | Unchanged, and still requires the header                                                             |

No JWT cookie is issued or read in this mode. A cookie from before you enabled SSO authenticates nothing.

#### What is stored

| Column              | Holds                                                    |
| ------------------- | -------------------------------------------------------- |
| `users.external_id` | The header value, verbatim. Unique index.                |
| `users.id`          | Autoincrement key. Jobs reference this.                  |
| `users.email`       | The display name. `unknown` until a request carries one. |
| `users.password`    | A hash of a random value. Cannot be used to log in.      |

The schema migrates to version 2 on start. No data moves and existing local accounts keep their ids.

#### When something is wrong

| Symptom                                                                        | Cause                                                                          | Fix                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Every request is 401                                                           | The proxy sends no id header, or sends a different name than `SSO_UID_HEADER`  | Compare the header name on both sides                                  |
| 401 says "missing or invalid"                                                  | The header is present but empty, comma-joined, or over 512 characters          | Make the proxy replace the header instead of appending                 |
| 403 on a browser POST                                                          | Cross-site `Origin`, or a plaintext `Origin` on a TLS deployment               | Check rule 3                                                           |
| The container exits at start: `SSO_UID_HEADER is not a valid HTTP header name` | The variable is not a valid header name. Empty is fine. A space or `@` is not. | Fix the variable                                                       |
| Locked out after a proxy outage                                                | The local login is off while the flag is on                                    | Set `SSO_ENABLED=false`, restart, sign in with the account from step 1 |
| Log says `does not enforce uniqueness of external_id`                          | The database holds duplicate identities, so the unique index cannot be built   | Resolve the duplicates, drop `users_external_id`, restart              |

#### Limits

- Every authenticated user is a normal user. There are no roles and no admin mapping.
- `X-authentik-jwt` is not verified. The trust boundary is the proxy plus the network rule above.
- `SSO_ENABLED=true` takes precedence over `ALLOW_UNAUTHENTICATED`. Anonymous access is unavailable.
- A request with no `Origin` header, such as curl, is not subject to the cross-site check. Browsers always send one.

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
