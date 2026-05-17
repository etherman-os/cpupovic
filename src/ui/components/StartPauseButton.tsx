import { Pause, Play } from "lucide-react";

type StartPauseButtonProps = {
  running: boolean;
  onClick: () => void;
};

export function StartPauseButton({ running, onClick }: StartPauseButtonProps) {
  const Icon = running ? Pause : Play;

  return (
    <button className="button button-primary" type="button" onClick={onClick}>
      <Icon aria-hidden="true" size={18} />
      <span>{running ? "Pause" : "Start"}</span>
    </button>
  );
}
