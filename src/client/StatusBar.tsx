export interface StatusBarProps {
	content: string;
}

export function StatusBar({ content }: StatusBarProps) {
	const lines = content.length === 0 ? 1 : content.split("\n").length;
	const chars = content.length;

	return (
		<div className="status-bar">
			<span className="status-bar-item">{lines} lines</span>
			<span className="status-bar-item">{chars} chars</span>
			<span className="status-bar-item status-bar-spacer">plain text</span>
		</div>
	);
}
