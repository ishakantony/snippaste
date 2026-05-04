import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/client/components/ui/Modal.js";
import { Icon } from "@/client/Icon.js";
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	passwordBodySchema,
} from "@/shared/schemas.js";

export interface SettingsModalProps {
	open: boolean;
	enabled: boolean;
	onToggle: () => void;
	onClose: () => void;
	autoSaveFeatureEnabled?: boolean;
	passwordProtectionEnabled?: boolean;
	isProtected?: boolean;
	onSetPassword?: (password: string) => void;
	onRemovePassword?: () => void;
	onLock?: () => void;
}

export function SettingsModal({
	open,
	enabled,
	onToggle,
	onClose,
	autoSaveFeatureEnabled = true,
	passwordProtectionEnabled = false,
	isProtected = false,
	onSetPassword,
	onRemovePassword,
	onLock,
}: SettingsModalProps) {
	const { t } = useTranslation();
	const [password, setPassword] = useState("");
	const passwordValid = passwordBodySchema.safeParse({ password }).success;

	if (!open) return null;

	function handleSetPassword(e: FormEvent) {
		e.preventDefault();
		if (!passwordValid) return;
		onSetPassword?.(password);
		setPassword("");
	}

	return (
		<Modal onClose={onClose}>
			<div className="w-full max-w-80 rounded-lg border border-border bg-modal-bg p-5 shadow-lg md:p-6">
				<div className="mb-4 flex items-center justify-between gap-3">
					<h2 className="text-sm font-semibold text-fg">
						{t("settings.title")}
					</h2>
					<button
						type="button"
						onClick={onClose}
						aria-label="Close settings"
						className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-fg-3 hover:border-border-2 hover:bg-surface-2 hover:text-fg"
					>
						<Icon name="x" size={14} />
					</button>
				</div>

				{autoSaveFeatureEnabled && (
					<>
						<div className="flex items-center justify-between">
							<label htmlFor="autosave-switch" className="text-xs text-fg-2">
								{t("settings.autoSave")}
							</label>
							<button
								id="autosave-switch"
								type="button"
								role="switch"
								aria-checked={enabled}
								onClick={onToggle}
								className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
									enabled ? "bg-accent" : "bg-border-2"
								}`}
							>
								<span
									className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
										enabled ? "translate-x-4" : "translate-x-0"
									}`}
								/>
							</button>
						</div>
						<p className="text-xs text-fg-3 mt-1">
							{t("settings.autoSaveDescription")}
						</p>
					</>
				)}

				{passwordProtectionEnabled && (
					<div className="mt-5 pt-4 border-t border-border flex flex-col gap-3 first:mt-0 first:pt-0 first:border-t-0">
						<div>
							<h3 className="text-xs font-semibold text-fg-2">
								{t("settings.passwordProtection")}
							</h3>
							<p className="text-xs text-fg-3 mt-1">
								{isProtected
									? t("settings.passwordProtectedDescription")
									: t("settings.passwordUnprotectedDescription")}
							</p>
						</div>

						<form className="flex flex-col gap-2" onSubmit={handleSetPassword}>
							<label htmlFor="snip-password" className="text-xs text-fg-2">
								{t("settings.newPassword")}
							</label>
							<input
								id="snip-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								minLength={PASSWORD_MIN_LENGTH}
								maxLength={PASSWORD_MAX_LENGTH}
								className="h-11 w-full rounded-md border border-border-2 bg-input-bg px-3 text-base text-fg outline-none focus:border-accent md:h-9 md:text-sm"
							/>
							<button
								type="submit"
								className="h-10 rounded-md bg-accent px-3 text-xs font-semibold text-white disabled:opacity-50 md:h-8"
								disabled={!passwordValid}
							>
								{isProtected
									? t("settings.changePassword")
									: t("settings.enableProtection")}
							</button>
						</form>

						{isProtected && (
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									className="h-10 rounded-md border border-border-2 px-3 text-xs text-fg-2 md:h-8"
									onClick={onLock}
								>
									{t("settings.lockNow")}
								</button>
								<button
									type="button"
									className="h-10 rounded-md border border-danger/40 px-3 text-xs text-danger md:h-8"
									onClick={onRemovePassword}
								>
									{t("settings.removeProtection")}
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</Modal>
	);
}
