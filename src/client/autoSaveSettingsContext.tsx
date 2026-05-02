import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useState,
} from "react";
import {
	type AutoSaveStorage,
	loadAutoSave,
	saveAutoSave,
} from "@/client/autoSaveSettings.js";

interface AutoSaveSettingsContextValue {
	enabled: boolean;
	toggle: () => void;
}

const AutoSaveSettingsCtx = createContext<AutoSaveSettingsContextValue | null>(
	null,
);

export function AutoSaveSettingsProvider({
	children,
	storage = window.localStorage,
}: {
	children: ReactNode;
	storage?: AutoSaveStorage;
}) {
	const [enabled, setEnabled] = useState(() => loadAutoSave(storage));

	const toggle = useCallback(() => {
		setEnabled((prev) => {
			const next = !prev;
			saveAutoSave(storage, next);
			return next;
		});
	}, [storage]);

	return (
		<AutoSaveSettingsCtx.Provider value={{ enabled, toggle }}>
			{children}
		</AutoSaveSettingsCtx.Provider>
	);
}

export function useAutoSaveSettings(): AutoSaveSettingsContextValue {
	const v = useContext(AutoSaveSettingsCtx);
	if (!v)
		throw new Error(
			"useAutoSaveSettings must be used within AutoSaveSettingsProvider",
		);
	return v;
}
