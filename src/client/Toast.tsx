import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { Icon } from "@/client/Icon.js";
import { cn } from "@/client/lib/cn.js";

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
				className={cn(
					"fixed bottom-6 left-1/2 -translate-x-1/2 bg-toast-bg border border-toast-bd rounded-lg px-4 py-2.5 text-xs font-medium text-[#edf1fb] inline-flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-none z-[999] whitespace-nowrap transition-opacity duration-200",
					visible ? "opacity-100" : "opacity-0",
				)}
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
