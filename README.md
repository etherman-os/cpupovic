# CPUpovic

Display name: **CPUpoviç**

Your CPU was already suffering. Now it suffers with style.

CPUpovic is a tray-first desktop toy app that turns computer activity into engine-like sound. It is not a hardware monitor trying to be serious. It reads CPU load, smooths the signal, maps it into an engine level, and drives a selectable Sound Pack.

CPUpovic is built with Tauri and is intended to support Linux, Windows, and macOS. It is currently tested on Linux. Windows and macOS builds are planned.

## MVP

- Tauri v2 desktop app
- React + TypeScript dashboard
- Rust backend CPU sampling with `sysinfo`
- System tray/menu controls
- Persistent settings with the Tauri store plugin
- Local Engine Pack and Supara Pack audio
- Sound Pack dropdown for future sample-based packs
- Internal quiet fallback for missing sound files and development
- Start/pause, mute, volume, thresholds, effects

## Download

Normal users should download a packaged release from GitHub Releases. They do not need to keep a terminal open.

Linux release options:

- `.AppImage`: download, mark executable if needed, then double-click or run it.
- `.deb`: install on Debian/Ubuntu-based systems.
- `.rpm`: install on Fedora/RHEL/openSUSE-style systems.

The source code archive is for developers. If you download the source instead of a packaged release, you will need the terminal commands below.

## Run

For local development:

```bash
npm install
npm run tauri dev
```

For browser-only UI development:

```bash
npm run dev
```

Browser-only mode uses a demo CPU signal because Rust/Tauri commands are unavailable there.

## QA

Pure logic tests run with:

```bash
npm test
```

Core verification:

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Screenshot or browser automation checks are optional. If Chrome or Chromium is missing, visual QA should not block the normal build/test/check path.

### Manual QA without CPU load

CPUpovic can be tested without stressing the real CPU. Demo/Test Mode is hidden near the bottom of the dashboard:

1. Start the app with `npm run tauri dev`.
2. Confirm the Sound Pack dropdown shows `Local Engine Pack` and `Supara Pack`.
3. Click Test Rev to verify sound.
4. Move the demo CPU slider above and below the configured thresholds.
5. Try Idle, Cruise, Rev, Redline, and Drop/Cooldown.
6. Verify mute, pause, volume, effects, and threshold settings.
7. Disable Demo Mode to return to the real CPU sensor.

Manual settings persistence checks are in [docs/QA.md](docs/QA.md).

## Product Rules

- Repo/package name stays ASCII-safe: `cpupovic`.
- Display name may be `CPUpoviç`.
- No real exhaust branding, logos, vehicle brand names, or copyrighted engine recordings.
- Local Engine Pack and Supara Pack are the normal user-facing engine sounds.
- An internal quiet safety fallback exists for missing files and development.
- Bundled sample assets must have separate provenance and terms.
- Every bundled audio asset needs source/generation details, terms, author or creator, date if known, and local filename metadata.
- Additional user-facing sound packs can be added through `public/soundpacks/profiles.json`, but bundled assets must remain safe and documented.

## Why CPUpovic Uses Local Sound Files

Listening feedback showed that generated engine tones were too artificial for the core product feel. CPUpovic now uses sample-based Sound Packs as the normal sound path. The older internal sound code remains hidden, mainly so the app can fail softly during development if files are missing.

For best sound, use the Local Engine Pack files under `public/soundpacks/local-engine/`.

The current Local Engine Pack sounds are fictional AI-generated effects created by the project maintainer with Adobe Firefly Sound Effects. They are not recordings of Akrapovic, any branded exhaust, or any branded vehicle. The project code license and audio asset terms are documented separately; see `public/soundpacks/local-engine/LICENSES.md`.

### Supara Pack

Supara Pack is a fictional turbo tuner-style engine pack generated with Adobe Firefly Sound Effects. It includes idle/low/mid/high loops plus optional boost, limiter, burble, anti-lag, and turbo flutter effects.

It is not affiliated with Toyota, Supra, Akrapovic, Ferrari, Lamborghini, Formula 1, or any vehicle/exhaust brand, and it does not use real branded recordings. Audio notes are documented in `public/soundpacks/supara/LICENSES.md`.

### Local Engine Pack

The app expects legally usable files here:

```txt
public/soundpacks/local-engine/
  profile.json
  LICENSES.md
  idle.wav
  low.wav
  mid.wav
  high.wav
  rev_burst.wav   optional
  cooldown.wav    optional
```

Use short, clean, dry 2-5 second loops for `idle`, `low`, `mid`, and `high`. Avoid music, vocals, background noise, reverb-heavy files, branded recordings, and unclear-license clips. Document every file in `LICENSES.md`.

### Additional Local Packs

Additional sample-based packs can be added under `public/soundpacks/<pack-id>/` and listed in `public/soundpacks/profiles.json`. They will appear in the dashboard Sound Pack dropdown when their `profile.json` is valid. Pack ids should be lowercase slugs such as `garage-engine`.

## Architecture

```txt
SensorSample
  -> SignalEngine
  -> SoundPolicy
  -> AudioEngine
  -> UI / Tray State
```

Read more in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Current Limitations

- Temperature, fan RPM, and battery state are stubs.
- Tray menu status rows update from the dashboard runtime loop.
- Internal fallback audio is hidden from normal users and intentionally quiet.
- Audio output waits for a user activation when the webview requires it.
- Autostart toggle is wired through the Tauri plugin, but behavior depends on OS/package context.
