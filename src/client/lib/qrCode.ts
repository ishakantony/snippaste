import QRCodeStyling from "qr-code-styling";

const LOGO_URL = "/logo.svg";

export interface CreateQrOptions {
	url: string;
	container: HTMLElement;
	size?: number;
}

export function createQrCode({
	url,
	container,
	size = 256,
}: CreateQrOptions): QRCodeStyling {
	const qr = new QRCodeStyling({
		width: size,
		height: size,
		data: url,
		type: "canvas",
		qrOptions: {
			errorCorrectionLevel: "Q",
		},
		dotsOptions: {
			type: "rounded",
			gradient: {
				type: "linear",
				colorStops: [
					{ offset: 0, color: "#6366f1" },
					{ offset: 1, color: "#22d3ee" },
				],
			},
		},
		cornersSquareOptions: {
			type: "extra-rounded",
			color: "#6366f1",
		},
		cornersDotOptions: {
			type: "dot",
			color: "#22d3ee",
		},
		backgroundOptions: {
			color: "transparent",
		},
		imageOptions: {
			crossOrigin: "anonymous",
			margin: 8,
			imageSize: 0.35,
		},
		image: LOGO_URL,
	});

	qr.append(container);
	return qr;
}
