import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/client/components/ui/Button";
import { Modal } from "@/client/components/ui/Modal";
import { Icon } from "@/client/Icon";
import { createQrCode } from "@/client/lib/qrCode";

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
		const container = qrRef.current;
		if (!container) return;

		qrInstanceRef.current = createQrCode({ url, container });
		return () => {
			qrInstanceRef.current = null;
			container.innerHTML = "";
		};
	}, [url]);

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
		<Modal onClose={onClose}>
			<div
				data-testid="qr-modal"
				className="flex w-full max-w-90 flex-col items-center gap-5 rounded-xl border border-border-2 bg-modal-bg p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] md:p-6"
			>
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
		</Modal>
	);
}
