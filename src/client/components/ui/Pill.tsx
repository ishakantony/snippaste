import { cn } from "../../lib/cn.js";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: "accent" | "default" | "status";
}

export function Pill({
	className,
	variant = "default",
	children,
	...props
}: PillProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 shrink-0",
				{
					"bg-accent-soft-10 border border-accent-soft-18 rounded-[5px] px-2 py-[3px]":
						variant === "accent",
					"bg-pill-bg border border-pill-bd rounded-full px-3 py-1 pointer-events-none":
						variant === "default",
					"absolute left-1/2 -translate-x-1/2 bg-pill-bg border border-pill-bd rounded-full px-3 py-1 pointer-events-none":
						variant === "status",
				},
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}
