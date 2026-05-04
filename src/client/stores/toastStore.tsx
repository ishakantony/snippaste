import { useEffect } from "react";
import { create } from "zustand";
import { Icon } from "@/client/Icon";
import { cn } from "@/client/lib/cn";

interface ToastState {
	msg: string;
	visible: boolean;
	show: (msg: string) => void;
}

const HIDE_AFTER_MS = 2200;

let timer: number | null = null;

export const useToastStore = create<ToastState>()((set) => ({
	msg: "",
	visible: false,
	show: (msg) => {
		set({ msg, visible: true });
		if (timer !== null) window.clearTimeout(timer);
		timer = window.setTimeout(() => {
			set({ visible: false });
			timer = null;
		}, HIDE_AFTER_MS);
	},
}));

export function useToast() {
	return {
		show: useToastStore((state) => state.show),
	};
}

export function ToastViewport() {
	const msg = useToastStore((state) => state.msg);
	const visible = useToastStore((state) => state.visible);

	useEffect(() => {
		return () => {
			if (timer !== null) window.clearTimeout(timer);
		};
	}, []);

	return (
		<div
			data-testid="toast"
			className={cn(
				"fixed bottom-6 left-1/2 -translate-x-1/2 bg-toast-bg border border-toast-bd rounded-lg px-4 py-2.5 text-xs font-medium text-[#edf1fb] inline-flex items-center gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-none z-[999] whitespace-nowrap transition-opacity duration-200",
				visible ? "opacity-100" : "opacity-0",
			)}
			aria-live="polite"
		>
			<Icon name="check" size={13} color="var(--ok)" />
			<span>{msg}</span>
		</div>
	);
}
