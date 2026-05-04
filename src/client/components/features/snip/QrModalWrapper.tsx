import { lazy, Suspense } from "react";
import { useToast } from "@/client/stores/toastStore.js";

const QrModal = lazy(() =>
	import("@/client/components/QrModal.js").then((m) => ({
		default: m.QrModal,
	})),
);

export interface QrModalWrapperProps {
	open: boolean;
	slug: string;
	onClose: () => void;
}

export function QrModalWrapper({ open, slug, onClose }: QrModalWrapperProps) {
	const toast = useToast();
	if (!open) return null;

	const url = `${window.location.origin}/s/${slug}`;

	return (
		<Suspense fallback={null}>
			<QrModal url={url} slug={slug} onClose={onClose} onToast={toast.show} />
		</Suspense>
	);
}
