import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { useEffect, useRef } from "react";
import { buildExtensions } from "./editorTheme.js";

interface UseSnipEditorOptions {
	isLocked: boolean;
	dark: boolean;
	onChange?: (text: string) => void;
}

export function useSnipEditor(opts: UseSnipEditorOptions) {
	const { isLocked, dark, onChange } = opts;
	const containerRef = useRef<HTMLDivElement>(null);
	const editorViewRef = useRef<EditorView | null>(null);
	const docRef = useRef<string>("");
	const applyingRef = useRef<boolean>(false);
	const pendingRef = useRef<string | null>(null);

	useEffect(() => {
		if (isLocked) return;
		if (!containerRef.current) return;

		const updateListener = EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				const text = update.state.doc.toString();
				docRef.current = text;
				if (!applyingRef.current) {
					onChange?.(text);
				}
			}
		});

		const view = new EditorView({
			state: EditorState.create({
				doc: docRef.current,
				extensions: buildExtensions(dark, updateListener),
			}),
			parent: containerRef.current,
		});

		editorViewRef.current = view;

		// Apply any pending content that arrived before editor mounted
		if (pendingRef.current !== null) {
			const text = pendingRef.current;
			pendingRef.current = null;
			applyingRef.current = true;
			try {
				view.dispatch({
					changes: { from: 0, to: view.state.doc.length, insert: text },
				});
			} finally {
				applyingRef.current = false;
			}
		}

		return () => {
			view.destroy();
			if (editorViewRef.current === view) editorViewRef.current = null;
		};
	}, [dark, isLocked, onChange]);

	function applyContent(text: string, opts: { silent?: boolean } = {}) {
		const view = editorViewRef.current;
		if (!view) {
			// Queue content if editor hasn't mounted yet
			pendingRef.current = text;
			return;
		}
		if (opts.silent) applyingRef.current = true;
		try {
			view.dispatch({
				changes: { from: 0, to: view.state.doc.length, insert: text },
			});
		} finally {
			if (opts.silent) applyingRef.current = false;
		}
	}

	function getContent(): string {
		return editorViewRef.current?.state.doc.toString() ?? "";
	}

	return {
		containerRef,
		applyContent,
		getContent,
	};
}
