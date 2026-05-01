import { cn } from "../../lib/cn.js";

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "default" | "primary" | "danger" | "ghost" | "icon";
	size?: "sm" | "md" | "lg";
}

export function Button({
	className,
	variant = "default",
	size = "md",
	children,
	...props
}: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center justify-center gap-1.5 font-sans font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap",
				{
					"bg-transparent border border-transparent text-fg-2 hover:bg-surface-3":
						variant === "default",
					"bg-accent border-none text-white hover:bg-accent-hover active:bg-accent-active":
						variant === "primary",
					"bg-transparent border-none text-fg-3 hover:text-danger":
						variant === "danger",
					"bg-transparent border-none text-fg-2 hover:bg-surface-3":
						variant === "ghost",
					"bg-transparent border border-transparent text-fg-3 hover:bg-surface-2 hover:border-border-2":
						variant === "icon",
					"h-[30px] px-2.5 text-xs": size === "sm",
					"h-[34px] px-4 text-[13px] rounded-[7px]": size === "md",
					"h-[46px] px-4 text-sm rounded-[9px]": size === "lg",
					"w-7 h-7 p-0 rounded-md": variant === "icon" && size === "sm",
					"w-[30px] h-[30px] p-0 rounded-[7px]":
						variant === "icon" && size === "md",
				},
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}
