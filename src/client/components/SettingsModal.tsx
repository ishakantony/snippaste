import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/client/components/ui/Modal.js";
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
			<div className="bg-modal-bg border border-border rounded-lg shadow-lg p-6 w-80">
				<h2 className="text-sm font-semibold text-fg mb-4">
					{t("settings.title")}
				</h2>

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
								className="w-full h-9 px-3 bg-input-bg border border-border-2 rounded-md text-fg text-sm outline-none focus:border-accent"
							/>
							<button
								type="submit"
								className="h-8 px-3 rounded-md bg-accent text-white text-xs font-semibold disabled:opacity-50"
								disabled={!passwordValid}
							>
								{isProtected
									? t("settings.changePassword")
									: t("settings.enableProtection")}
							</button>
						</form>

						{isProtected && (
							<div className="flex gap-2">
								<button
									type="button"
									className="h-8 px-3 rounded-md border border-border-2 text-xs text-fg-2"
									onClick={onLock}
								>
									{t("settings.lockNow")}
								</button>
								<button
									type="button"
									className="h-8 px-3 rounded-md border border-danger/40 text-xs text-danger"
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
