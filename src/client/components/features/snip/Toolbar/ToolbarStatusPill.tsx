import { useTranslation } from "react-i18next";
import {
	AUTOSAVE_STATUS,
	type AutosaveState,
} from "@/client/autosaveController";
import { Pill } from "@/client/components/ui/Pill";
import { Icon } from "@/client/Icon";

function relativeTime(
	ts: number,
	t: (key: string, opts?: Record<string, unknown>) => string,
): string {
	const diff = Math.floor((Date.now() - ts) / 1000);
	if (diff < 5) return t("status.justNow");
	if (diff < 60) return t("status.secondsAgo", { count: diff });
	if (diff < 3600)
		return t("status.minutesAgo", { count: Math.floor(diff / 60) });
	return t("status.hoursAgo", { count: Math.floor(diff / 3600) });
}

export interface ToolbarStatusPillProps {
	state: AutosaveState;
	autoSaveEnabled: boolean;
	testId?: string;
}

export function ToolbarStatusPill({
	state,
	autoSaveEnabled,
	testId = "save-status",
}: ToolbarStatusPillProps) {
	const { t } = useTranslation();
	const isSaving =
		state.status === AUTOSAVE_STATUS.SAVING ||
		state.status === AUTOSAVE_STATUS.DIRTY;

	let label: string;
	let timeLabel: string | null = null;
	switch (state.status) {
		case AUTOSAVE_STATUS.SAVING:
		case AUTOSAVE_STATUS.DIRTY: {
			label = autoSaveEnabled ? t("status.saving") : t("status.unsaved");
			break;
		}
		case AUTOSAVE_STATUS.SAVED: {
			label = autoSaveEnabled ? t("status.autoSaved") : t("status.saved");
			timeLabel = relativeTime(state.timestamp, t);
			break;
		}
		case AUTOSAVE_STATUS.OFFLINE: {
			label = t("status.offline");
			break;
		}
		case AUTOSAVE_STATUS.TOO_LARGE: {
			label = t("status.tooLarge");
			break;
		}
		case AUTOSAVE_STATUS.LOCKED: {
			label = t("status.locked");
			break;
		}
		default: {
			label = t("status.ready");
			break;
		}
	}

	return (
		<Pill variant="default" data-testid={testId}>
			<Icon
				name="clock"
				size={11}
				color={isSaving ? "var(--warn)" : "var(--ok)"}
			/>
			<span className="text-xs font-medium text-fg-3 whitespace-nowrap">
				{label}
			</span>
			{timeLabel && (
				<span className="text-xs text-fg-3 font-mono whitespace-nowrap">
					{timeLabel}
				</span>
			)}
		</Pill>
	);
}
