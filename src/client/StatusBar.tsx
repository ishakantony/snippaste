export function StatusBar({ content }: { content: string }) {
  const lines = content.length === 0 ? 1 : content.split("\n").length;
  return (
    <div className="status-bar">
      <span>{lines} lines</span>
      <span>{content.length} chars</span>
      <span className="status-bar-type">plain text</span>
    </div>
  );
}
