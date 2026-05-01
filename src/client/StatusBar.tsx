interface StatusBarProps {
  content: string;
}

export function StatusBar({ content }: StatusBarProps) {
  const lines = content === "" ? 1 : content.split("\n").length;
  const chars = content.length;

  return (
    <div className="status-bar">
      <span>{lines} lines</span>
      <span>{chars} chars</span>
      <span className="status-bar-plain">plain text</span>
    </div>
  );
}
