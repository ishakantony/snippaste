import { create } from "zustand";
import {
	AUTOSAVE_STATUS,
	type AutosaveState,
} from "@/client/autosaveController";

interface SnipSessionValues {
	activeSlug: string | null;
	loadError: boolean;
	saveState: AutosaveState;
	remoteChanged: boolean;
	updatedAt: number | undefined;
	isLocked: boolean;
	isProtected: boolean;
}

interface SnipSessionState extends SnipSessionValues {
	resetForSlug: (slug: string) => void;
	setLoadError: (loadError: boolean) => void;
	setSaveState: (saveState: AutosaveState) => void;
	setRemoteChanged: (remoteChanged: boolean) => void;
	setUpdatedAt: (updatedAt: number | undefined) => void;
	setLocked: (isLocked: boolean) => void;
	setProtected: (isProtected: boolean) => void;
}

const initialValues: SnipSessionValues = {
	activeSlug: null,
	loadError: false,
	saveState: { status: AUTOSAVE_STATUS.IDLE },
	remoteChanged: false,
	updatedAt: undefined,
	isLocked: false,
	isProtected: false,
};

function valuesForSlug(slug: string): SnipSessionValues {
	return { ...initialValues, activeSlug: slug };
}

export const useSnipSessionStore = create<SnipSessionState>()((set, get) => ({
	...initialValues,
	resetForSlug: (slug) => {
		if (get().activeSlug === slug) return;
		set(valuesForSlug(slug));
	},
	setLoadError: (loadError) => set({ loadError }),
	setSaveState: (saveState) => set({ saveState }),
	setRemoteChanged: (remoteChanged) => set({ remoteChanged }),
	setUpdatedAt: (updatedAt) => set({ updatedAt }),
	setLocked: (isLocked) => set({ isLocked }),
	setProtected: (isProtected) => set({ isProtected }),
}));

export function useSnipSessionDirty(): boolean {
	return useSnipSessionStore(
		(state) =>
			state.saveState.status === AUTOSAVE_STATUS.DIRTY ||
			state.saveState.status === AUTOSAVE_STATUS.SAVING,
	);
}
