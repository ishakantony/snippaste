import { type ReactNode, useEffect } from "react";
import { Icon } from "@/client/Icon.js";
import { cn } from "@/client/lib/cn.js";
import { Button } from "./Button.js";

export interface BottomSheetProps {
	open: boolean;
	closing?: boolean;
	title: ReactNode;
	children: ReactNode;
	onClose: () => void;
	closeLabel: string;
	dismissLabel: string;
	disableDismiss?: boolean;
	testId?: string;
}

export function BottomSheet({
	open,
	closing = false,
	title,
	children,
	onClose,
	closeLabel,
	dismissLabel,
	disableDismiss = false,
	testId,
}: BottomSheetProps) {
	useEffect(() => {
		if (!open || disableDismiss) return;

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [open, disableDismiss, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-40 flex items-end md:hidden"
			data-testid={testId}
			role="dialog"
			aria-modal="true"
		>
			<button
				type="button"
				aria-label={dismissLabel}
				className={cn(
					"absolute inset-0 bg-black/45",
					closing
						? "animate-[mobile-sheet-backdrop-out_180ms_ease_forwards]"
						: "animate-[mobile-sheet-backdrop-in_180ms_ease_forwards]",
				)}
				onClick={() => {
					if (!disableDismiss) onClose();
				}}
			/>
			<div
				className={cn(
					"relative w-full rounded-t-2xl border border-border bg-modal-bg p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]",
					closing
						? "animate-[mobile-sheet-out_180ms_ease_forwards]"
						: "animate-[mobile-sheet-in_220ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]",
				)}
			>
				<div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border-2" />
				<div className="mb-3 flex items-center justify-between">
					<div className="text-sm font-semibold text-fg">{title}</div>
					<Button
						variant="icon"
						size="sm"
						onClick={onClose}
						aria-label={closeLabel}
					>
						<Icon name="x" size={14} />
					</Button>
				</div>
				{children}
			</div>
		</div>
	);
}

export interface BottomSheetActionProps {
	label: string;
	icon: string;
	onClick: () => void;
	danger?: boolean;
}

export function BottomSheetAction({
	label,
	icon,
	onClick,
	danger = false,
}: BottomSheetActionProps) {
	return (
		<button
			type="button"
			className={cn(
				"flex h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium",
				danger
					? "text-danger hover:bg-danger/10"
					: "text-fg-2 hover:bg-surface-2",
			)}
			onClick={onClick}
		>
			<Icon name={icon} size={15} />
			<span className="min-w-0 truncate">{label}</span>
		</button>
	);
}
