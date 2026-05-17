# Soundpacks

CPUpovic exposes two normal user-facing sound packs:

- `local-engine`: the Local Engine Pack.
- `supara`: the Supara Pack.

The dashboard uses a Sound Pack dropdown. The internal audio engine still has development fallbacks, but they are not shown as normal sound choices.

## Sound Pack Layout

```txt
public/soundpacks/
  profiles.json
  local-engine/
    profile.json
    LICENSES.md
    README.md
    idle.wav
    low.wav
    mid.wav
    high.wav
    rev_burst.wav
    cooldown.wav
  supara/
    profile.json
    LICENSES.md
    idle.wav
    low.wav
    mid.wav
    high.wav
    rev_burst.wav
    cooldown.wav
    anti_lag_pops.wav
    boost_spool.wav
    burble_short.wav
    redline_burst.wav
    rev_limiter.wav
    turbo_flutter.wav
```

The minimum viable sound pack is `idle.wav`, `low.wav`, `mid.wav`, and `high.wav`. `rev_burst.wav`, `cooldown.wav`, and pack-specific effects are optional. If required loop files are missing, CPUpovic shows a user-facing warning.

## profile.json Contract

```json
{
  "id": "local-engine",
  "displayName": "Local Engine Pack",
  "engineType": "sampleHybrid",
  "description": "A local sample-based engine pack.",
  "author": "Local user or source author",
  "license": "CC0, public domain, or other compatible license",
  "sourceUrl": "https://example.com/source",
  "assets": {
    "idle": "idle.wav",
    "low": "low.wav",
    "mid": "mid.wav",
    "high": "high.wav",
    "revBurst": "rev_burst.wav",
    "cooldown": "cooldown.wav",
    "antiLagPops": "anti_lag_pops.wav",
    "boostSpool": "boost_spool.wav",
    "burbleShort": "burble_short.wav",
    "redlineBurst": "redline_burst.wav",
    "revLimiter": "rev_limiter.wav",
    "turboFlutter": "turbo_flutter.wav"
  },
  "tuning": {
    "crossfadeMs": 180,
    "minPlaybackRate": 0.96,
    "maxPlaybackRate": 1.06,
    "idleGain": 0.4,
    "lowGain": 0.56,
    "midGain": 0.68,
    "highGain": 0.78,
    "oneShotGain": 0.68,
    "effectCooldownMs": 900
  }
}
```

Extra effect keys are optional. Missing optional effect files are reported as optional missing files, but they do not prevent the pack from running.

## Local Engine Pack Workflow

Use `public/soundpacks/local-engine/` for local manual testing:

1. Find legally usable engine, motor, fan, or machine audio.
2. Prepare short loopable files:
   - `idle.wav`
   - `low.wav`
   - `mid.wav`
   - `high.wav`
   - `rev_burst.wav` optional
   - `cooldown.wav` optional
3. Keep loops short, around 2-5 seconds.
4. Keep loops clean and dry.
5. Avoid music, vocals, background noise, reverb-heavy files, branded recordings, and unclear-license clips.
6. Add source/license details to `LICENSES.md`.
7. Run the app and select `Local Engine Pack`.

## Adding Another Local Pack

To add another selectable pack without redesigning the UI:

1. Create `public/soundpacks/<pack-id>/`.
2. Add a valid `profile.json` and `LICENSES.md`.
3. Add at least `idle.wav`, `low.wav`, `mid.wav`, and `high.wav`.
4. Add the pack id to `public/soundpacks/profiles.json`.
5. Restart the app and use the Sound Pack dropdown.

Pack ids must be lowercase slugs such as `garage-engine` or `fan-pack-2`. The app ignores unsafe ids and hidden development profiles.

## Supara Pack

Supara Pack is a fictional turbo tuner-style engine pack generated with Adobe Firefly Sound Effects. It includes idle/low/mid/high loops plus optional boost, limiter, burble, anti-lag, and turbo flutter effects.

It is fictional. It does not use real branded recordings and is not affiliated with Toyota, Supra, Akrapovic, Ferrari, Lamborghini, Formula 1, or any vehicle/exhaust brand. See `public/soundpacks/supara/LICENSES.md`.

For quick conversion during local prep, `ffmpeg` is useful but not required by the app:

```bash
ffmpeg -i input.mp3 -ar 48000 -ac 2 output.wav
```

## Why CPUpovic Uses Local Sound Files

Listening feedback showed that short safe loop layers give a better normal-user sound:

- idle / low / mid / high loops for continuous body
- small playback-rate changes only, currently clamped around 0.96-1.06 for bundled packs
- crossfades based on throttle/RPM
- optional rev burst and cooldown one-shots

## Rules

- Bundled assets must be synthetic, otherwise safe to redistribute, or documented as project-maintainer-created/generated assets with separate terms.
- Do not bundle copyrighted vehicle recordings.
- Do not use real vehicle or exhaust brand names for bundled profiles.
- Do not use YouTube/TikTok/Instagram clips.
- Do not commit unclear-license sounds.
- Every bundled audio asset needs source/generation details, terms, author or creator, date if known, and local filename metadata.
- Local soundpacks can be used for testing, but repository assets stay clean unless provenance is complete.

## Normal User-Facing Sound

- `local-engine`: preferred local sample-based pack when required loop files are present
- `supara`: fictional turbo tuner-style pack with boost/flutter/burble effects

Internal development profiles may remain in code for fallback testing, but they should not appear in the normal dashboard.

## Adding Future User-Facing Packs

The normal UI shows sample-based packs through the Sound Pack dropdown. To add a built-in user-facing pack later:

1. Add the profile metadata and assets under `public/soundpacks/<pack-id>/`.
2. Add the profile entry to `src/core/config/builtInProfiles.ts`.
3. Add the profile id to `public/soundpacks/profiles.json` if it should also be discoverable from public assets.
4. Add asset provenance in the pack `LICENSES.md`.

Sample-based profiles are loaded from the built-in profile registry and the public `profiles.json` manifest. Development/internal fallback profiles stay hidden from normal users.
