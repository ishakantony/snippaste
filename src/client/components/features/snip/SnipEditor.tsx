import type { RefObject } from "react";

export interface SnipEditorProps {
	containerRef: RefObject<HTMLDivElement | null>;
}

export function SnipEditor({ containerRef }: SnipEditorProps) {
	return (
		<div className="flex flex-1 overflow-hidden pb-18 md:pb-0">
			<div
				ref={containerRef}
				data-testid="snip-editor"
				className="flex flex-1 flex-col overflow-hidden"
			/>
		</div>
	);
}
