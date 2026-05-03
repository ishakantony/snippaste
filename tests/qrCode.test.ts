// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("qr-code-styling", () => {
	class MockQRCodeStyling {
		options: Record<string, unknown>;

		constructor(options: Record<string, unknown>) {
			this.options = options;
		}

		append(container?: HTMLElement) {
			if (container) {
				const canvas = document.createElement("canvas");
				canvas.width = 256;
				canvas.height = 256;
				container.appendChild(canvas);
			}
		}

		async download() {}

		async getRawData() {
			return new Blob(["fake-qr"], { type: "image/png" });
		}
	}

	return { default: MockQRCodeStyling };
});

function getOptions(qr: unknown): Record<string, unknown> {
	return (qr as unknown as { options: Record<string, unknown> }).options;
}

describe("qrCode", () => {
	it("creates QR code and appends canvas to container", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");

		const container = document.createElement("div");
		const qr = createQrCode({ url: "https://example.com/s/test", container });

		expect(qr).toBeDefined();
		expect(container.querySelector("canvas")).toBeTruthy();
	});

	it("replaces any existing QR code in the container", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");

		const container = document.createElement("div");
		createQrCode({ url: "https://example.com/s/first", container });
		createQrCode({ url: "https://example.com/s/second", container });

		expect(container.querySelectorAll("canvas")).toHaveLength(1);
	});

	it("uses Q error correction level", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");
		const container = document.createElement("div");

		const qr = createQrCode({ url: "https://example.com/s/test", container });
		const options = getOptions(qr);

		const qrOptions = options.qrOptions as Record<string, string>;
		expect(qrOptions.errorCorrectionLevel).toBe("Q");
	});

	it("uses rounded dots with brand gradient", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");
		const container = document.createElement("div");

		const qr = createQrCode({ url: "https://example.com/s/test", container });
		const options = getOptions(qr);

		const dotsOptions = options.dotsOptions as Record<string, unknown>;
		expect(dotsOptions.type).toBe("rounded");
		const gradient = dotsOptions.gradient as {
			colorStops: Array<{ offset: number; color: string }>;
		};
		expect(gradient.colorStops[0].color).toBe("#6366f1");
		expect(gradient.colorStops[1].color).toBe("#22d3ee");
	});

	it("uses transparent background", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");
		const container = document.createElement("div");

		const qr = createQrCode({ url: "https://example.com/s/test", container });
		const options = getOptions(qr);

		const bgOptions = options.backgroundOptions as Record<string, string>;
		expect(bgOptions.color).toBe("transparent");
	});

	it("uses logo as center image", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");
		const container = document.createElement("div");

		const qr = createQrCode({ url: "https://example.com/s/test", container });
		const options = getOptions(qr);

		expect(options.image).toBe("/logo.svg");
		const imageOptions = options.imageOptions as Record<string, unknown>;
		expect(imageOptions.imageSize).toBe(0.35);
	});

	it("respects custom size", async () => {
		const { createQrCode } = await import("@/client/lib/qrCode.js");
		const container = document.createElement("div");

		const qr = createQrCode({
			url: "https://example.com/s/test",
			container,
			size: 512,
		});
		const options = getOptions(qr);

		expect(options.width).toBe(512);
		expect(options.height).toBe(512);
	});
});
