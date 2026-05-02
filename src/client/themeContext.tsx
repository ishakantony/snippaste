import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	applyTheme,
	loadTheme,
	saveTheme,
	type Theme,
} from "@/client/theme.js";

interface ThemeContextValue {
	theme: Theme;
	toggle: () => void;
}

const ThemeCtx = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(() =>
		loadTheme(window.localStorage),
	);

	useEffect(() => {
		applyTheme(document.documentElement, theme);
		saveTheme(window.localStorage, theme);
	}, [theme]);

	function toggle() {
		setTheme((t) => (t === "dark" ? "light" : "dark"));
	}

	return (
		<ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
	);
}

export function useTheme(): ThemeContextValue {
	const v = useContext(ThemeCtx);
	if (!v) throw new Error("useTheme must be used within ThemeProvider");
	return v;
}
