import { createContext, type ReactNode, useContext, useMemo } from "react";
import {
	type FeatureFlags,
	featureFlagsSchema,
} from "@/shared/featureFlags.js";

declare global {
	interface Window {
		__FLAGS__: unknown;
	}
}

interface FeatureFlagsContextValue {
	flags: FeatureFlags;
}

const FeatureFlagsCtx = createContext<FeatureFlagsContextValue | null>(null);

function loadFlags(): FeatureFlags {
	return featureFlagsSchema.parse(window.__FLAGS__ ?? {});
}

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
	const value = useMemo<FeatureFlagsContextValue>(
		() => ({ flags: loadFlags() }),
		[],
	);
	return (
		<FeatureFlagsCtx.Provider value={value}>
			{children}
		</FeatureFlagsCtx.Provider>
	);
}

export function useFeatureFlag<K extends keyof FeatureFlags>(
	key: K,
): FeatureFlags[K] {
	const v = useContext(FeatureFlagsCtx);
	if (!v)
		throw new Error("useFeatureFlag must be used within FeatureFlagsProvider");
	return v.flags[key];
}
