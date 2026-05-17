import { Volume2, VolumeX } from "lucide-react";

type MuteButtonProps = {
  muted: boolean;
  onClick: () => void;
};

export function MuteButton({ muted, onClick }: MuteButtonProps) {
  const Icon = muted ? VolumeX : Volume2;

  return (
    <button className="button" type="button" onClick={onClick}>
      <Icon aria-hidden="true" size={18} />
      <span>{muted ? "Unmute" : "Mute"}</span>
    </button>
  );
}
