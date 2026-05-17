# QA Checklist

## Automated

```bash
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

## User-Facing Manual QA

Run the app with:

```bash
npm run tauri dev
```

Then verify:

1. The dashboard opens with `Local Engine Pack` as the engine sound.
2. The Sound Pack dropdown includes `Local Engine Pack` and `Supara Pack`.
3. The dashboard says sound files are loaded.
4. Click `Test Rev`; it should play a short rev and respect mute and volume.
5. Select `Supara Pack`, click `Test Rev`, and confirm it demonstrates boost spool, rev burst, limiter/redline, cooldown/flutter, and burble/pops if available.
6. Start/Pause changes the status between running and paused.
7. Mute stops sound output and the status says `Muted`.
8. Move the volume slider while sound is active; loudness changes live.
9. Set `Start sound above CPU` to a reachable value and confirm the engine sound starts above that level.
10. Raise `Start sound above CPU` above the current CPU and confirm sound stops after smoothing catches up. The stop level is automatic, five points below the start level.
11. Close the window and confirm close-to-tray behavior still follows the setting.
12. Quit from the tray and confirm the app fully exits.

## Test Tools Without CPU Load

Use this flow when the real CPU is idle:

1. Open `Test Tools` near the bottom of the dashboard.
2. Enable `Demo/Test Mode`.
3. Move `Test CPU` above and below the configured start/stop levels.
4. Try Idle, Cruise, Rev, Redline, and Drop/Cooldown.
5. Confirm the status messages stay human-readable:
   - `Waiting: CPU is below your start level`
   - `Engine sound is running`
   - `High CPU: full throttle`
   - `Muted`
   - `Paused`
6. Disable Demo/Test Mode to return to the real CPU sensor.

## Local Engine Pack QA

The normal app uses `public/soundpacks/local-engine/`.

Required:

- `idle.wav`
- `low.wav`
- `mid.wav`
- `high.wav`

Optional:

- `rev_burst.wav`
- `cooldown.wav`

Checks:

1. Confirm the UI shows `Local Engine Pack`.
2. Confirm loaded files include the required four loop files.
3. Click `Test Rev`; it should use the local files.
4. In Demo/Test Mode, move through the bands:
   - `0-20%`: idle dominates.
   - `20-45%`: low dominates.
   - `45-75%`: mid dominates.
   - `75-100%`: high dominates.
5. Temporarily rename one required loop file and reload; the UI should say engine sound files are missing.
6. Restore the file and confirm loaded status returns.

## Supara Pack QA

The Supara Pack lives in `public/soundpacks/supara/`.

Required:

- `idle.wav`
- `low.wav`
- `mid.wav`
- `high.wav`

Core optional:

- `rev_burst.wav`
- `cooldown.wav`

Extra optional:

- `anti_lag_pops.wav`
- `boost_spool.wav`
- `burble_short.wav`
- `redline_burst.wav`
- `rev_limiter.wav`
- `turbo_flutter.wav`

Checks:

1. Select `Supara Pack` from the Sound Pack dropdown.
2. Confirm the loaded file list includes the required four loops.
3. Confirm optional effects are listed as loaded when present.
4. Click `Test Rev`; it should clearly include boost spool, rev burst, limiter/redline, cooldown/flutter, and optional burble/pops.
5. In Demo/Test Mode, move through the bands:
   - `0-18%`: idle dominates.
   - `18-42%`: low dominates.
   - `42-72%`: mid dominates.
   - `72-100%`: high dominates.
6. Hit Redline repeatedly and confirm limiter/pops are controlled, not constant spam.
7. Use Drop/Cooldown and confirm cooldown/flutter/burble are short and controlled.

## Settings Persistence

Verify after quitting from tray and relaunching:

- Volume persists.
- Mute persists.
- The app relaunches in running mode, even if it was paused before quitting.
- Start CPU level persists and the stop level is recalculated automatically.
- Close-to-tray persists.
- Old hidden profile choices migrate back to Local Engine Pack.
- Supara Pack selection persists after relaunch.

## Tray Status

With the app running, open the tray menu and verify:

- Status shows Running or Paused.
- Audio shows Muted or Unmuted.
- Sound Pack shows the currently selected user-facing pack.
- Threshold shows the configured on/off values.
- Start and Pause enablement follows the current running state.
- Quit fully exits the app.

## If No Sound Is Heard

Check these before treating it as an audio bug:

- System output device is not muted and laptop volume is high enough.
- CPUpovic is not muted.
- CPUpovic is running, not paused.
- Volume slider is above `0%`.
- In Demo/Test Mode, Test CPU is above `Start sound above CPU` for continuous sound.
- Browser or webview audio was activated by a user action such as Start or Test Rev.
- The dashboard does not say engine sound files are missing.

## Visual QA

Screenshot checks are optional. If Chrome or Chromium is not installed, skip screenshot automation and use manual visual inspection.
