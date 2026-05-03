import { create } from "zustand";
import {
	type FeatureFlags,
	featureFlagsSchema,
} from "@/shared/featureFlags.js";

declare global {
	interface Window {
		__FLAGS__: unknown;
	}
}

interface FeatureFlagsState {
	flags: FeatureFlags;
	initialized: boolean;
}

function loadFlags(): FeatureFlags {
	return featureFlagsSchema.parse(window.__FLAGS__ ?? {});
}

export const useFeatureFlagsStore = create<FeatureFlagsState>()(() => ({
	flags: featureFlagsSchema.parse({}),
	initialized: false,
}));

export function initializeFeatureFlags() {
	if (useFeatureFlagsStore.getState().initialized) return;
	useFeatureFlagsStore.setState({ flags: loadFlags(), initialized: true });
}

export function useFeatureFlag<K extends keyof FeatureFlags>(
	key: K,
): FeatureFlags[K] {
	return useFeatureFlagsStore((state) => state.flags[key]);
}
