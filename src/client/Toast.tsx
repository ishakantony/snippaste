import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { Icon } from "./Icon.js";

interface ToastContextValue {
	show: (msg: string) => void;
}

const ToastCtx = createContext<ToastContextValue | null>(null);

const HIDE_AFTER_MS = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
	const [msg, setMsg] = useState<string>("");
	const [visible, setVisible] = useState(false);
	const timer = useRef<number | null>(null);

	const show = useCallback((m: string) => {
		setMsg(m);
		setVisible(true);
		if (timer.current !== null) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			setVisible(false);
			timer.current = null;
		}, HIDE_AFTER_MS);
	}, []);

	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	return (
		<ToastCtx.Provider value={{ show }}>
			{children}
			<div
				className={`toast ${visible ? "toast--visible" : "toast--hidden"}`}
				aria-live="polite"
			>
				<Icon name="check" size={13} color="var(--ok)" />
				<span>{msg}</span>
			</div>
		</ToastCtx.Provider>
	);
}

export function useToast(): ToastContextValue {
	const v = useContext(ToastCtx);
	if (!v) throw new Error("useToast must be used within ToastProvider");
	return v;
}
