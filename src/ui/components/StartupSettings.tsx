type StartupSettingsProps = {
  launchAtStartup: boolean;
  startMinimizedToTray: boolean;
  closeToTray: boolean;
  batterySaverMode: boolean;
  onChange: (settings: {
    launchAtStartup?: boolean;
    startMinimizedToTray?: boolean;
    closeToTray?: boolean;
    batterySaverMode?: boolean;
  }) => void;
};

export function StartupSettings({
  launchAtStartup,
  startMinimizedToTray,
  closeToTray,
  batterySaverMode,
  onChange,
}: StartupSettingsProps) {
  return (
    <div className="checkbox-stack">
      <label>
        <input
          checked={startMinimizedToTray}
          type="checkbox"
          onChange={(event) => onChange({ startMinimizedToTray: event.currentTarget.checked })}
        />
        <span>Start minimized to tray</span>
      </label>
      <label>
        <input
          checked={launchAtStartup}
          type="checkbox"
          onChange={(event) => onChange({ launchAtStartup: event.currentTarget.checked })}
        />
        <span>Launch at startup</span>
      </label>
      <label>
        <input
          checked={closeToTray}
          type="checkbox"
          onChange={(event) => onChange({ closeToTray: event.currentTarget.checked })}
        />
        <span>Close button minimizes to tray</span>
      </label>
      <label>
        <input
          checked={batterySaverMode}
          type="checkbox"
          onChange={(event) => onChange({ batterySaverMode: event.currentTarget.checked })}
        />
        <span>Battery saver silence</span>
      </label>
    </div>
  );
}
