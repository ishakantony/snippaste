import {
	ArrowRight,
	Check,
	Clock,
	Copy,
	Home,
	Link,
	type LucideProps,
	Moon,
	QrCode,
	RefreshCw,
	Save,
	Scissors,
	Shield,
	Sun,
	Trash2,
	X,
	Zap,
} from "lucide-react";

const ICONS: Record<string, React.FC<LucideProps>> = {
	sun: Sun,
	moon: Moon,
	arrow: ArrowRight,
	zap: Zap,
	copy: Copy,
	link: Link,
	scissors: Scissors,
	clock: Clock,
	shield: Shield,
	save: Save,
	trash: Trash2,
	refresh: RefreshCw,
	check: Check,
	home: Home,
	x: X,
	qr: QrCode,
};

export interface IconProps {
	name: keyof typeof ICONS | string;
	size?: number;
	color?: string;
	className?: string;
}

export function Icon({
	name,
	size = 16,
	color = "currentColor",
	className,
}: IconProps) {
	const Component = ICONS[name as string];
	if (!Component) return null;
	return <Component size={size} color={color} className={className} />;
}
