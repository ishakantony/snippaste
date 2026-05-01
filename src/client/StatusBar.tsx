interface StatusBarProps {
  content: string;
}

export function StatusBar({ content }: StatusBarProps) {
  const lines = content ? content.split("\n").length : 0;
  const chars = content.length;

  return (
    <div className="status-bar">
      <span className="status-bar-item">{lines} lines</span>
      <span className="status-bar-item">{chars} chars</span>
      <span className="status-bar-item status-bar-item--right">plain text</span>
    </div>
  );
}
