import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pill } from "@/client/components/ui/Pill.js";
import { Icon } from "@/client/Icon.js";
import { getExpirationInfo } from "@/client/lib/expirationCountdown.js";

export interface ToolbarExpirationPillProps {
	updatedAt: number;
}

export function ToolbarExpirationPill({
	updatedAt,
}: ToolbarExpirationPillProps) {
	const { t } = useTranslation();
	const [info, setInfo] = useState(() =>
		getExpirationInfo(updatedAt, Date.now()),
	);

	useEffect(() => {
		setInfo(getExpirationInfo(updatedAt, Date.now()));
		const id = setInterval(() => {
			setInfo(getExpirationInfo(updatedAt, Date.now()));
		}, 60_000);
		return () => clearInterval(id);
	}, [updatedAt]);

	const colorMap = {
		green: "var(--ok)",
		yellow: "var(--warn)",
		red: "var(--danger)",
	};

	const text = info.isExpired
		? t("status.expired")
		: t("status.daysLeft", { count: info.daysRemaining });

	return (
		<Pill variant="default">
			<Icon name="calendar" size={11} color={colorMap[info.color]} />
			<span
				className="text-xs font-medium whitespace-nowrap"
				style={{ color: colorMap[info.color] }}
			>
				{text}
			</span>
		</Pill>
	);
}
