type EffectsSettingsProps = {
  revBurstEnabled: boolean;
  redlineEnabled: boolean;
  cooldownPsshEnabled: boolean;
  onChange: (effects: {
    revBurstEnabled?: boolean;
    redlineEnabled?: boolean;
    cooldownPsshEnabled?: boolean;
  }) => void;
};

export function EffectsSettings({
  revBurstEnabled,
  redlineEnabled,
  cooldownPsshEnabled,
  onChange,
}: EffectsSettingsProps) {
  return (
    <div className="checkbox-stack">
      <label>
        <input
          checked={revBurstEnabled}
          type="checkbox"
          onChange={(event) => onChange({ revBurstEnabled: event.currentTarget.checked })}
        />
        <span>Rev burst on CPU spike</span>
      </label>
      <label>
        <input
          checked={redlineEnabled}
          type="checkbox"
          onChange={(event) => onChange({ redlineEnabled: event.currentTarget.checked })}
        />
        <span>Redline pops</span>
      </label>
      <label>
        <input
          checked={cooldownPsshEnabled}
          type="checkbox"
          onChange={(event) => onChange({ cooldownPsshEnabled: event.currentTarget.checked })}
        />
        <span>Cooldown psssh</span>
      </label>
    </div>
  );
}
