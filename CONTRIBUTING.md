# Contributing

CPUpovic is a meme app with a clean architecture. Keep both parts true.

## Local Setup

```bash
npm install
npm run tauri dev
```

## Rules

- Do not add copyrighted vehicle or exhaust recordings.
- Do not use vehicle or exhaust brand names for bundled profiles.
- Keep bundled audio assets safe to redistribute and documented separately from code.
- Keep settings, runtime state, sensor samples, signal processing, sound policy, and audio output separate.
- Prefer small, focused changes with a clear demo path.

## Checks

```bash
npm run build
npm test
cargo check --manifest-path src-tauri/Cargo.toml
```
