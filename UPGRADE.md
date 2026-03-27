# Upgrading From Upstream

This repository is easiest to maintain long-term if you treat upstream and local customizations separately.

## Recommended remote layout

Use a fork and keep the original project as `upstream`:

```bash
git remote rename origin upstream
git remote add origin <your-fork-url>
git fetch --all --tags
```

Expected result:

- `origin`: your fork
- `upstream`: `https://github.com/C4illin/ConvertX.git`

## Keep local changes low-conflict

Prefer keeping local operational changes in additive files instead of editing upstream-heavy files:

- `compose.local.yaml`
- `.env.local.example`
- `docs/local-deploy.md`
- `UPGRADE.md`

That keeps future merges simpler than carrying large changes in `README.md`, `Dockerfile`, or runtime code.

## Upgrade workflow

1. Fetch upstream changes:

```bash
git fetch upstream --tags
```

2. Create a dedicated upgrade branch from your mainline:

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/upgrade-convertx-<target-version>
```

3. Merge the upstream release you want to adopt:

```bash
git merge upstream/main
```

If you are tracking a specific release tag, merge or inspect that tag explicitly before continuing.

4. Resolve conflicts, keeping local deployment files unless upstream introduces a better replacement
5. Decide whether to bump `CONVERTX_IMAGE_REF` in `.env.local.example`
6. Re-run verification:

```bash
bun run build
bun test
docker compose --env-file .env.local -f compose.local.yaml config
docker compose --env-file .env.local -f compose.local.yaml up -d
curl -fsS http://127.0.0.1:3000/healthcheck
```

7. Smoke-test the UI in a browser and verify at least one conversion path you rely on
8. Commit the upgrade and open a PR

## When to bump the pinned image reference

Upstream currently documents floating image tags such as `latest` and `main`. For local stability, pin the deployed image by digest and update `CONVERTX_IMAGE_REF` only after:

- you have reviewed upstream release notes
- the new image starts cleanly
- your required conversions still work

This keeps rollback simple and makes production state inspectable from the env file.
