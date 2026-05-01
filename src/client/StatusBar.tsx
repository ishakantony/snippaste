export interface StatusBarProps {
  content: string;
}

export function StatusBar({ content }: StatusBarProps) {
  const lines = content === "" ? 0 : content.split("\n").length;
  const chars = content.length;

  return (
    <div className="status-bar">
      <span>{lines} lines</span>
      <span>{chars} chars</span>
      <div className="status-bar-spacer" />
      <span>plain text</span>
    </div>
  );
}
