# JakJak PWA v0.5

JakJak is a build-free, offline-first PWA toy box designed for touch devices and GitHub Pages. The guiding idea is **simple controls, deep toys**: activities should be easy to operate while giving a curious child something real to notice, test, plan, and learn.

## Toys

- Tinker Board — working machine sandbox with motors, fan, magnet, gate, conveyor direction, and moving balls
- Shape Workshop — build puzzles, symmetry, pattern logic, and free construction
- Creature Builder — open-ended creature creation
- Marble Lab — physics experimentation
- Basketball — skill-based shooting with multiple challenge modes
- Bowling — aim, power, hook, pin physics, three modes, and 10 saved ball colors
- Number Garden — counting, comparing quantities, number bonds, and number sequences
- Logic Tracks — program a robot with directional commands and solve obstacle courses
- Balance Lab — combine number weights until both sides of a scale are equal
- Circuit Lab — experiment with conductors, insulators, switches, and simple powered devices
- Number Machine — choose inputs and operations to create target numbers
- Sound Garden — open-ended musical sound play

## Adaptive challenge

Number Garden, Logic Tracks, Balance Lab, Circuit Lab, and Number Machine store a small local progress level on the device. Successful solutions quietly increase the challenge without interrupting play with age labels or difficulty-selection screens.

There are no accounts, cloud profiles, rewards economies, streak pressure, advertising, or analytics.

## Parent area

Tap the `•••` control in the lower-right corner five times quickly, then answer the parent check.

The parent area can:

- enable or disable individual toys
- show 4, 8, or all 12 toys on the home screen
- control volume
- enable calm motion
- set optional play-session and transition reminders

## GitHub Pages deployment

1. Create or open a GitHub repository.
2. Copy all files from this folder into the repository root.
3. Commit and push.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the branch containing JakJak (usually `main`) and `/ (root)`.
7. Save.

The app uses relative URLs, so it works from a project path such as `https://username.github.io/jakjak/`.

## Offline / install

The service worker caches the app shell and assets. v0.5 uses cache name `jakjak-v5` so previously installed builds update after redeployment.

On iPhone/iPad, open the site in Safari and use **Share → Add to Home Screen**.

## Privacy

JakJak has no backend, account system, analytics, advertising, location access, microphone access, or camera access. Settings, selected bowling-ball color, best scores, and learning progress remain in local browser/device storage.
