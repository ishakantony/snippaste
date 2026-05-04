import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";

export interface LockScreenProps {
	slug: string;
	unlockPassword: string;
	unlockError: string | null;
	setUnlockPassword: (password: string) => void;
	handleUnlock: (e?: FormEvent) => void;
}

export function LockScreen({
	slug,
	unlockPassword,
	unlockError,
	setUnlockPassword,
	handleUnlock,
}: LockScreenProps) {
	const { t } = useTranslation();

	return (
		<div className="flex flex-1 items-center justify-center px-4 py-6 md:px-6">
			<form
				className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-sm md:p-6"
				onSubmit={handleUnlock}
			>
				<h2 className="text-lg font-bold text-fg mb-2">
					{t("editor.lockedTitle")}
				</h2>
				<p className="text-sm text-fg-3 mb-5">
					{t("editor.lockedDescription", { slug })}
				</p>
				<label htmlFor="unlock-password" className="text-xs text-fg-2">
					{t("editor.password")}
				</label>
				<input
					id="unlock-password"
					type="password"
					value={unlockPassword}
					onChange={(e) => setUnlockPassword(e.target.value)}
					className="mt-1 h-11 w-full rounded-lg border border-border-2 bg-input-bg px-3 text-base text-fg outline-none focus:border-accent md:h-10 md:text-sm"
				/>
				{unlockError && (
					<div className="text-xs text-danger mt-2">{unlockError}</div>
				)}
				<button
					type="submit"
					className="mt-4 h-11 w-full rounded-lg bg-accent text-sm font-semibold text-white disabled:opacity-50 md:h-10"
					disabled={unlockPassword.length < 4}
				>
					{t("editor.unlock")}
				</button>
			</form>
		</div>
	);
}
