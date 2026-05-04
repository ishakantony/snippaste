import { defaultKeymap } from "@codemirror/commands";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";

export const baseEditorTheme = EditorView.theme({
	"&": { height: "100%", fontSize: "13px", fontFamily: "var(--font-mono)" },
	".cm-scroller": {
		overflow: "auto",
		lineHeight: "22px",
		fontFamily: "var(--font-mono)",
	},
	".cm-content": { padding: "14px 0", caretColor: "var(--accent)" },
	".cm-line": { padding: "0 20px" },
	"@media (max-width: 767px)": {
		"&": { fontSize: "15px" },
		".cm-scroller": { lineHeight: "24px" },
		".cm-content": { padding: "12px 0 86px" },
		".cm-line": { padding: "0 14px" },
		".cm-gutters": { display: "none" },
	},
});

export const lightTheme = EditorView.theme({
	"&": { background: "var(--editor-bg)", color: "var(--editor-fg)" },
	".cm-gutters": {
		width: "52px",
		background: "var(--gutter-bg)",
		color: "var(--gutter-fg)",
		border: "none",
		borderRight: "1px solid var(--border)",
		fontFamily: "var(--font-mono)",
	},
	".cm-lineNumbers .cm-gutterElement": {
		padding: "0 14px 0 0",
		fontSize: "12px",
		color: "var(--gutter-fg)",
		minWidth: "52px",
	},
	".cm-cursor": { borderLeftColor: "var(--accent)" },
	".cm-selectionBackground": { background: "var(--accent-soft-12) !important" },
	".cm-focused .cm-selectionBackground": {
		background: "var(--accent-soft-12) !important",
	},
	".cm-activeLineGutter": { background: "var(--surface-2)" },
	".cm-activeLine": { background: "transparent" },
});

export const darkOverride = EditorView.theme({
	"&": {
		background: "var(--editor-bg) !important",
		color: "var(--editor-fg) !important",
	},
	".cm-gutters": {
		width: "52px",
		background: "var(--gutter-bg) !important",
		color: "var(--gutter-fg) !important",
		border: "none !important",
		borderRight: "1px solid var(--border) !important",
		fontFamily: "var(--font-mono)",
	},
	".cm-lineNumbers .cm-gutterElement": {
		padding: "0 14px 0 0",
		fontSize: "12px",
		minWidth: "52px",
	},
	".cm-cursor": { borderLeftColor: "var(--accent) !important" },
	".cm-activeLineGutter": { background: "var(--surface-2) !important" },
	".cm-activeLine": { background: "transparent !important" },
});

export function buildExtensions(
	dark: boolean,
	updateListener: ReturnType<typeof EditorView.updateListener.of>,
) {
	const themeExts = dark ? [oneDark, darkOverride] : [lightTheme];
	return [
		lineNumbers(),
		EditorView.lineWrapping,
		keymap.of(defaultKeymap),
		updateListener,
		baseEditorTheme,
		...themeExts,
	];
}
