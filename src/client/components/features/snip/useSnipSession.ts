import { useEffect, useRef } from "react";
import { createAutosaveFetch } from "@/client/api/autosaveFetch.js";
import { apiClient } from "@/client/api/client.js";
import {
	AUTOSAVE_STATUS,
	AutosaveController,
} from "@/client/autosaveController.js";
import { getClientId } from "@/client/clientId.js";
import { subscribe as subscribeStream } from "@/client/snipStream.js";
import { useSnipSessionStore } from "@/client/stores/snipSessionStore.js";

interface UseSnipSessionOptions {
	autoSaveActive: boolean;
	onRemoteContent: (content: string) => void;
}

export function useSnipSession(slug: string, opts: UseSnipSessionOptions) {
	const { autoSaveActive, onRemoteContent } = opts;
	const setLoadError = useSnipSessionStore((state) => state.setLoadError);
	const setSaveState = useSnipSessionStore((state) => state.setSaveState);
	const setLocked = useSnipSessionStore((state) => state.setLocked);
	const setProtected = useSnipSessionStore((state) => state.setProtected);
	const setUpdatedAt = useSnipSessionStore((state) => state.setUpdatedAt);
	const setRemoteChanged = useSnipSessionStore(
		(state) => state.setRemoteChanged,
	);
	const isLocked = useSnipSessionStore((state) => state.isLocked);
	const loadError = useSnipSessionStore((state) => state.loadError);
	const remoteChanged = useSnipSessionStore((state) => state.remoteChanged);
	const updatedAt = useSnipSessionStore((state) => state.updatedAt);

	const controllerRef = useRef<AutosaveController | null>(null);
	const clientIdRef = useRef<string>(getClientId());

	// Autosave controller
	useEffect(() => {
		const controller = new AutosaveController({
			fetch: createAutosaveFetch(slug, apiClient),
			setTimeout: (fn, ms) => window.setTimeout(fn, ms),
			clearTimeout: (id) => window.clearTimeout(id),
			dateNow: () => Date.now(),
			url: `/api/snips/${encodeURIComponent(slug)}`,
			clientId: clientIdRef.current,
			enabled: autoSaveActive,
		});

		controllerRef.current = controller;

		const unsub = controller.subscribe((state) => {
			setSaveState(state);
			if (state.status === AUTOSAVE_STATUS.LOCKED) setLocked(true);
		});

		return () => {
			unsub();
			controllerRef.current = null;
		};
	}, [slug, autoSaveActive, setSaveState, setLocked]);

	// Initial fetch
	useEffect(() => {
		setLoadError(false);

		const ac = new AbortController();

		apiClient.api.snips[":slug"]
			.$get({ param: { slug } }, { init: { signal: ac.signal } })
			.then((res) => {
				if (res.status === 404) return null;
				if (res.status === 401) {
					setLocked(true);
					setProtected(true);
					setSaveState({ status: AUTOSAVE_STATUS.LOCKED });
					return null;
				}
				if (!res.ok) throw new Error("fetch failed");
				return res.json();
			})
			.then((data) => {
				if (!data) return;
				setLocked(false);
				setProtected(data.protected);
				setUpdatedAt(data.updatedAt);
				onRemoteContent(data.content);
			})
			.catch((err) => {
				if (err?.name === "AbortError") return;
				setLoadError(true);
			});

		return () => ac.abort();
	}, [
		slug,
		setLoadError,
		setLocked,
		setProtected,
		setSaveState,
		setUpdatedAt,
		onRemoteContent,
	]);

	// SSE subscription
	useEffect(() => {
		if (isLocked) return;
		const myClientId = clientIdRef.current;

		const unsub = subscribeStream(slug, {
			onSnapshot: (event) => {
				if (event.updatedAt > 0) {
					setUpdatedAt(event.updatedAt);
				}
			},
			onUpdate: (event) => {
				setUpdatedAt(event.updatedAt);
				if (event.clientId === myClientId) return;
				const status = controllerRef.current?.getState().status;
				const isLocallyDirty =
					status === AUTOSAVE_STATUS.DIRTY || status === AUTOSAVE_STATUS.SAVING;

				if (isLocallyDirty) {
					setRemoteChanged(true);
					return;
				}

				onRemoteContent(event.content);
				setRemoteChanged(false);
			},
		});

		return () => unsub();
	}, [slug, isLocked, setRemoteChanged, setUpdatedAt, onRemoteContent]);

	// beforeunload warning when auto-save is off
	useEffect(() => {
		if (autoSaveActive) return;

		function onBeforeUnload(e: BeforeUnloadEvent) {
			const status = controllerRef.current?.getState().status;
			if (
				status === AUTOSAVE_STATUS.DIRTY ||
				status === AUTOSAVE_STATUS.SAVING
			) {
				e.preventDefault();
				e.returnValue = "";
			}
		}

		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [autoSaveActive]);

	function flush() {
		controllerRef.current?.flush();
	}

	async function refresh() {
		setLoadError(false);

		try {
			const res = await apiClient.api.snips[":slug"].$get({ param: { slug } });
			if (res.status === 404) return;
			if (res.status === 401) {
				setLocked(true);
				setSaveState({ status: AUTOSAVE_STATUS.LOCKED });
				return;
			}
			if (!res.ok) throw new Error("fetch failed");
			const data = await res.json();
			onRemoteContent(data?.content ?? "");
			setRemoteChanged(false);
		} catch {
			setLoadError(true);
		}
	}

	function onEditorChange(text: string) {
		controllerRef.current?.onChange(text);
	}

	function setInitialPassword(password: string | null) {
		controllerRef.current?.setInitialPassword(password);
	}

	return {
		isLocked,
		loadError,
		remoteChanged,
		updatedAt,
		refresh,
		flush,
		onEditorChange,
		setInitialPassword,
	};
}
