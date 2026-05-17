# Tray Behavior

CPUpovic is tray-first. The dashboard is useful, but the app should be controllable from the system tray/menu bar.

## Menu

```txt
Status: Running / Paused
Audio: Muted / Unmuted
Sound Pack: Local Engine Pack / Supara Pack
Threshold: <on>% on / <off>% off
Open Dashboard
Start CPUpoviç
Pause CPUpoviç
Mute / Unmute depending on current state
CPU Threshold
  0%
  25%
  50%
  75%
Settings
Quit
```

## Terms

- Pause: audio engine is stopped by policy, app remains alive.
- Mute: engine state can keep running, but effective output volume is zero.
- Quit: app exits fully.

## Window Close

By default, the close button hides the dashboard instead of quitting. Quit is explicit from the tray menu.

## Status Updates

The frontend sends runtime/settings updates to the tray menu when running state, mute state, sound pack, or CPU threshold values change. The status rows are informational and disabled; action rows remain clickable.
