import { type FormEvent, useState } from "react";
import { apiClient } from "@/client/api/client.js";

interface UseSnipPasswordOptions {
	onUnlock: () => void;
	setInitialPassword: (password: string | null) => void;
}

export function useSnipPassword(slug: string, opts: UseSnipPasswordOptions) {
	const { onUnlock, setInitialPassword } = opts;
	const [unlockPassword, setUnlockPassword] = useState("");
	const [unlockError, setUnlockError] = useState<string | null>(null);

	async function handleUnlock(e?: FormEvent) {
		e?.preventDefault();
		setUnlockError(null);
		const res = await apiClient.api.snips[":slug"].unlock.$post({
			param: { slug },
			json: { password: unlockPassword },
		});
		if (!res.ok) {
			setUnlockError(
				res.status === 429
					? "Too many attempts. Please wait."
					: "Incorrect password or unlock failed.",
			);
			return;
		}
		setUnlockPassword("");
		onUnlock();
	}

	async function handleSetPassword(password: string) {
		const res = await apiClient.api.snips[":slug"].password.$put({
			param: { slug },
			json: { password },
		});
		if (!res.ok) {
			throw new Error("Failed to set password");
		}
		await apiClient.api.snips[":slug"].unlock.$post({
			param: { slug },
			json: { password },
		});
	}

	async function handleRemovePassword() {
		const res = await apiClient.api.snips[":slug"].password.$delete({
			param: { slug },
		});
		if (!res.ok) {
			throw new Error("Failed to remove password");
		}
		setInitialPassword(null);
	}

	async function handleLock() {
		await apiClient.api.snips[":slug"].lock.$post({ param: { slug } });
	}

	return {
		unlockPassword,
		unlockError,
		setUnlockPassword,
		handleUnlock,
		handleSetPassword,
		handleRemovePassword,
		handleLock,
	};
}
