# JakJak

JakJak is a calm, offline-first PWA toy box designed for a preschool-aged child. It is intentionally simple: no accounts, no ads, no analytics, no backend, and no external runtime dependencies.

## Included toys

- Tinker Board — switches, knobs, sliders, gears, cause/effect
- Shape Workshop — large, forgiving shape matching
- Creature Builder — open-ended creature creation
- Marble Lab — simple tap-and-watch physics play
- Number Garden — quantities and one-to-one counting
- Sound Garden — gentle synthesized musical pads

## Parent area

Press and hold the subtle `•••` control in the lower-right corner for about 2 seconds. Complete the simple parent check to access settings.

Settings are stored locally in the browser/device with `localStorage`.

## Run locally

Any static server works. For example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

> Service workers do not run correctly from `file://`; use a local server while testing.

## Deploy to GitHub Pages

This project uses only relative URLs, so it works from a GitHub Pages project subpath such as:

`https://USERNAME.github.io/jakjak/`

### Option A — Deploy from branch

1. Create a GitHub repository named `jakjak`.
2. Upload the contents of this folder to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

### Option B — GitHub Actions

A workflow can be added later if the project grows into a compiled app. This first version is intentionally build-free.

## Install on iPhone/iPad

1. Open the GitHub Pages URL in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Launch JakJak from the new icon.

After the first successful load, the service worker caches the core app for offline use.

## Privacy

JakJak contains no analytics, ads, accounts, tracking, location, camera, microphone, or external content. It does not include a child's real name, photo, birthday, school, location, or medical information.

## Project structure

```text
jakjak/
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.webmanifest
├── README.md
└── assets/
    ├── icon-180.png
    ├── icon-192.png
    └── icon-512.png
```

## Design direction

- Large touch targets
- Minimal reading
- Forgiving interaction
- No lives, scores, streaks, coins, or failure states
- Calm motion enabled by default
- Parent-adjustable toy visibility, volume, motion, and session reminders
