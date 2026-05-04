import { type ReactNode, useEffect } from "react";

export interface ModalProps {
	onClose: () => void;
	children: ReactNode;
	testId?: string;
}

export function Modal({ onClose, children, testId }: ModalProps) {
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-[confirm-fade_150ms_ease]"
			data-testid={testId}
			role="dialog"
			aria-modal="true"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && e.target === e.currentTarget) onClose();
			}}
		>
			{children}
		</div>
	);
}
