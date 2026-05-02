import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/Button.js";
import { Icon } from "@/client/Icon.js";
import { createQrCode } from "@/client/lib/qrCode.js";

export interface QrModalProps {
	url: string;
	slug: string;
	onClose: () => void;
	onToast: (msg: string) => void;
}

export function QrModal({ url, slug, onClose, onToast }: QrModalProps) {
	const qrRef = useRef<HTMLDivElement>(null);
	const qrInstanceRef = useRef<ReturnType<typeof createQrCode> | null>(null);
	const { t } = useTranslation();

	useEffect(() => {
		if (!qrRef.current) return;
		qrInstanceRef.current = createQrCode({ url, container: qrRef.current });
		return () => {
			qrInstanceRef.current = null;
			if (qrRef.current) qrRef.current.innerHTML = "";
		};
	}, [url]);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") onClose();
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	async function handleDownload() {
		await qrInstanceRef.current?.download({
			name: `snippaste-${slug}`,
			extension: "png",
		});
	}

	async function handleCopy() {
		const raw = await qrInstanceRef.current?.getRawData("png");
		if (!raw) return;
		const blob =
			raw instanceof Blob ? raw : new Blob([raw as unknown as BlobPart]);
		await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
		onToast(t("qrModal.qrCopied"));
	}

	return (
		<div
			className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-[confirm-fade_150ms_ease]"
			role="dialog"
			aria-modal="true"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && e.target === e.currentTarget) onClose();
			}}
		>
			<div className="bg-modal-bg border border-border-2 rounded-xl w-90 p-6 shadow-[0_8px_40px_rgba(0,0,0,0.5)] flex flex-col items-center gap-5">
				<div className="flex items-center justify-between w-full">
					<div className="flex items-center gap-2">
						<Icon name="qr" size={14} color="var(--accent)" />
						<span className="text-sm font-semibold text-fg">
							{t("qrModal.heading")}
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-fg-3 hover:text-fg cursor-pointer bg-transparent border-none"
					>
						<Icon name="x" size={14} />
					</button>
				</div>

				<div className="rounded-lg p-3 bg-surface-2 border border-border">
					<div ref={qrRef} />
				</div>

				<div className="text-xs font-mono text-fg-3 break-all text-center max-w-full px-2">
					{url}
				</div>

				<div className="flex gap-2 w-full">
					<Button
						variant="primary"
						size="md"
						className="flex-1"
						onClick={handleDownload}
					>
						{t("qrModal.downloadPng")}
					</Button>
					<Button
						variant="ghost"
						size="md"
						className="flex-1 border border-border-2"
						onClick={handleCopy}
					>
						{t("qrModal.copyImage")}
					</Button>
				</div>
			</div>
		</div>
	);
}
