# Self-hosted typefaces

Four families, all **SIL Open Font License 1.1**, all latin subsets in `woff2`:

| File | Family | Weights | Bytes |
|---|---|---|---|
| `big-shoulders-latin-var.woff2` | Big Shoulders (display) | 600–800, variable | 36,524 |
| `public-sans-latin-var.woff2` | Public Sans (body) | 400–700, variable | 26,832 |
| `ibm-plex-mono-latin-500.woff2` | IBM Plex Mono (data) | 500 | 14,888 |
| `ibm-plex-mono-latin-600.woff2` | IBM Plex Mono (data) | 600 | 15,620 |
| `dm-serif-display-latin-400.woff2` | DM Serif Display (World) | 400 | 24,744 |
| | | **total** | **118,608 (115.8 KB)** |

Fetched from `fonts.gstatic.com`, which is where Google Fonts' own CSS points; the `latin`
subset files it serves are the subsetting, so no local subsetting tool was needed and no
unsubsetted TTF ships.

**They are served from the app, never from `fonts.googleapis.com`.** Phase 2 is local-first
and offline: a per-view network font dependency fails invisible-text-offline the same way a
per-view tile dependency was already refused. The live planner at the repo root still links
the CDN — it is a single online HTML file and a different trade.

They live under `src/` rather than `public/` so Vite emits them into `dist/assets/` with the
stylesheet's own relative rewriting, which `vite.config.ts`'s `base: './'` requires.

DM Serif Display was taken from `@fontsource/dm-serif-display` 5.3.0 (Google Fonts v17);
its upstream copyright and full OFL text are stored in `dm-serif-display-OFL.txt`.
