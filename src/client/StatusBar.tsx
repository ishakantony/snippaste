export interface StatusBarProps {
	content: string;
}

export function StatusBar({ content }: StatusBarProps) {
	const lines = content.length === 0 ? 1 : content.split("\n").length;
	const chars = content.length;

	return (
		<div className="h-[26px] shrink-0 bg-surface border-t border-border flex items-center px-3.5 gap-4">
			<span className="text-[10px] text-fg-3 font-mono">{lines} lines</span>
			<span className="text-[10px] text-fg-3 font-mono">{chars} chars</span>
			<span className="text-[10px] text-fg-3 font-mono ml-auto">
				plain text
			</span>
		</div>
	);
}
