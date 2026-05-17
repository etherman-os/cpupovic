# Audio Prep

Use this guide when preparing sample-based sound files for `public/soundpacks/<pack-id>/`.

## Recommended Format

- WAV or OGG
- 44.1 kHz or 48 kHz
- Mono or stereo accepted
- Short loop files, around 2-5 seconds

## Editing Checklist

- Avoid clipping.
- Normalize files consistently.
- Trim leading and trailing silence.
- Make loops seamless.
- Use zero-crossing cuts when possible.
- Keep `idle`, `low`, `mid`, and `high` similar in character.
- Avoid huge loudness differences between layers.
- Avoid music, vocals, branded recordings, reverb-heavy sounds, and background noise.

## Optional ffmpeg Helper

`ffmpeg` is useful for local preparation, but CPUpovic does not require it at runtime.

```bash
ffmpeg -i input.mp3 -ar 48000 -ac 2 output.wav
```

Document every prepared file in the soundpack `LICENSES.md` before committing audio.
