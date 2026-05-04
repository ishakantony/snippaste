/**
 * web-inspect browser overlay.
 *
 * Loads as a single <script> tag injected into the project's HTML entries.
 * Reads its own URL to discover the helper server's port and token.
 *
 * Surface:
 *   - Floating toolbar (bottom-right) with: Pick / Send / Hide
 *   - Element picker overlay (hover outline + click to pin)
 *   - Comment popover (per pin)
 *   - Sidebar (right edge) listing queued annotations
 *
 * Captures per annotation: comment, element selector + outerHTML + computed
 * styles + bounding rect, recent console errors (with source-map-resolved
 * stack frames when available), recent failed network requests, matching
 * CSS rules with original-source positions resolved via stylesheet source
 * maps, and an optional element screenshot via lazy-loaded modern-screenshot.
 */

(() => {
	const SELF =
		document.currentScript ||
		(() => {
			const all = document.getElementsByTagName("script");
			for (let i = all.length - 1; i >= 0; i--) {
				if (all[i].src && /\/overlay\.js(\?|$)/.test(all[i].src)) return all[i];
			}
			return null;
		})();
	if (!SELF) return;

	const SRC = new URL(SELF.src);
	const HELPER_ORIGIN = SRC.origin;
	const TOKEN = SRC.searchParams.get("token") || "";
	if (!TOKEN) {
		console.warn("[web-inspect] no token in script src");
		return;
	}

	if (window.__webInspect) return; // idempotent
	window.__webInspect = { v: 1 };

	const QUEUE_KEY = `web-inspect:queue:${HELPER_ORIGIN}`;
	const HIDDEN_KEY = `web-inspect:hidden:${HELPER_ORIGIN}`;
	const SCREENSHOT_CDN =
		"https://cdn.jsdelivr.net/npm/modern-screenshot@4.5.0/dist/index.umd.js";
	const MAX_CONSOLE_BUFFER = 50;
	const MAX_NETWORK_BUFFER = 50;
	const ROOT_ATTR = "data-web-inspect-root";
	const IGNORE_ATTR = "data-web-inspect-ignore";

	// ------------------------------------------------------------------------
	// Buffers (always-on capture)
	// ------------------------------------------------------------------------

	const consoleBuffer = [];
	const networkBuffer = [];

	function pushConsole(level, args, explicitStack) {
		try {
			const message = args
				.map((a) => {
					if (a instanceof Error)
						return `${a.name}: ${a.message}\n${a.stack || ""}`;
					if (typeof a === "object") {
						try {
							return JSON.stringify(a);
						} catch {
							return String(a);
						}
					}
					return String(a);
				})
				.join(" ");
			let stack = explicitStack || null;
			if (!stack) {
				for (const a of args) {
					if (a instanceof Error && a.stack) {
						stack = a.stack;
						break;
					}
				}
			}
			if (!stack && level === "error") {
				try {
					stack = new Error().stack || null;
				} catch {
					/* ignore */
				}
			}
			consoleBuffer.push({
				level,
				message: message.slice(0, 2000),
				stack: stack ? String(stack).slice(0, 8000) : null,
				ts: Date.now(),
			});
			if (consoleBuffer.length > MAX_CONSOLE_BUFFER) consoleBuffer.shift();
		} catch {
			/* never let our hook break the page */
		}
	}

	const _origError = console.error;
	console.error = function (...args) {
		pushConsole("error", args);
		return _origError.apply(this, args);
	};
	const _origWarn = console.warn;
	console.warn = function (...args) {
		pushConsole("warn", args);
		return _origWarn.apply(this, args);
	};
	window.addEventListener("error", (e) => {
		if (e.error instanceof Error) return pushConsole("error", [e.error]);
		pushConsole(
			"error",
			[e.message, e.filename + ":" + e.lineno],
			e.error && e.error.stack,
		);
	});
	window.addEventListener("unhandledrejection", (e) => {
		if (e.reason instanceof Error) return pushConsole("error", [e.reason]);
		pushConsole("error", ["UnhandledRejection:", e.reason]);
	});

	const _origFetch = window.fetch;
	window.fetch = async function (input, init) {
		const start = performance.now();
		const url = typeof input === "string" ? input : (input && input.url) || "";
		const method =
			(init && init.method) ||
			(typeof input === "object" && input.method) ||
			"GET";
		try {
			const res = await _origFetch.apply(this, arguments);
			if (!res.ok) {
				networkBuffer.push({
					url,
					method,
					status: res.status,
					duration: Math.round(performance.now() - start),
					ts: Date.now(),
				});
				if (networkBuffer.length > MAX_NETWORK_BUFFER) networkBuffer.shift();
			}
			return res;
		} catch (err) {
			networkBuffer.push({
				url,
				method,
				status: 0,
				error: String(err),
				duration: Math.round(performance.now() - start),
				ts: Date.now(),
			});
			if (networkBuffer.length > MAX_NETWORK_BUFFER) networkBuffer.shift();
			throw err;
		}
	};

	const _XHROpen = XMLHttpRequest.prototype.open;
	const _XHRSend = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.open = function (method, url) {
		this.__wiMethod = method;
		this.__wiUrl = url;
		this.__wiStart = performance.now();
		return _XHROpen.apply(this, arguments);
	};
	XMLHttpRequest.prototype.send = function () {
		this.addEventListener("loadend", () => {
			if (this.status >= 400 || this.status === 0) {
				networkBuffer.push({
					url: this.__wiUrl,
					method: this.__wiMethod,
					status: this.status,
					duration: Math.round(
						performance.now() - (this.__wiStart || performance.now()),
					),
					ts: Date.now(),
				});
				if (networkBuffer.length > MAX_NETWORK_BUFFER) networkBuffer.shift();
			}
		});
		return _XHRSend.apply(this, arguments);
	};

	// ------------------------------------------------------------------------
	// Source-map decode + fetch (client-side)
	//
	// Used to resolve (a) matched CSS rules → original .scss/.css and
	// (b) console-error stack frames → original .ts/.tsx. All paths fail
	// silently to null; the agent's fallback chain (selector grep, etc.)
	// takes over when source maps are unavailable.
	// ------------------------------------------------------------------------

	const VLQ_CHARS =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	const VLQ_TABLE = (() => {
		const t = new Int8Array(128).fill(-1);
		for (let i = 0; i < VLQ_CHARS.length; i++) t[VLQ_CHARS.charCodeAt(i)] = i;
		return t;
	})();

	function decodeVLQ(str) {
		const out = [];
		let value = 0,
			shift = 0;
		for (let i = 0; i < str.length; i++) {
			const digit = VLQ_TABLE[str.charCodeAt(i)];
			if (digit < 0) return out; // bail on bad input
			const cont = digit & 32;
			value |= (digit & 31) << shift;
			if (cont) {
				shift += 5;
				continue;
			}
			const negative = value & 1;
			value >>>= 1;
			out.push(negative ? -value : value);
			value = 0;
			shift = 0;
		}
		return out;
	}

	function parseSourceMap(rawJson) {
		let m;
		try {
			m = JSON.parse(rawJson);
		} catch {
			return null;
		}
		if (!m || typeof m.mappings !== "string" || !Array.isArray(m.sources))
			return null;
		const segments = [];
		let srcIdx = 0,
			origLine = 0,
			origCol = 0,
			nameIdx = 0;
		const lines = m.mappings.split(";");
		for (let genLine = 0; genLine < lines.length; genLine++) {
			let genCol = 0;
			const lineStr = lines[genLine];
			if (!lineStr) continue;
			for (const segStr of lineStr.split(",")) {
				if (!segStr) continue;
				const v = decodeVLQ(segStr);
				if (!v.length) continue;
				genCol += v[0];
				if (v.length >= 4) {
					srcIdx += v[1];
					origLine += v[2];
					origCol += v[3];
					if (v.length >= 5) nameIdx += v[4];
					segments.push({
						genLine,
						genCol,
						srcIdx,
						origLine,
						origCol,
						nameIdx: v.length >= 5 ? nameIdx : -1,
					});
				}
			}
		}
		return {
			sources: m.sources,
			sourceRoot: m.sourceRoot || "",
			names: m.names || [],
			segments,
		};
	}

	// Binary search: largest segment with (genLine, genCol) <= (line, col).
	function originalPositionFor(parsed, line, col) {
		if (!parsed || !parsed.segments.length) return null;
		const segs = parsed.segments;
		let lo = 0,
			hi = segs.length - 1,
			ans = -1;
		while (lo <= hi) {
			const mid = (lo + hi) >> 1;
			const s = segs[mid];
			if (s.genLine < line || (s.genLine === line && s.genCol <= col)) {
				ans = mid;
				lo = mid + 1;
			} else {
				hi = mid - 1;
			}
		}
		if (ans < 0) return null;
		const s = segs[ans];
		return {
			source: (parsed.sourceRoot || "") + (parsed.sources[s.srcIdx] || ""),
			line: s.origLine + 1,
			column: s.origCol,
			name: s.nameIdx >= 0 ? parsed.names[s.nameIdx] : null,
		};
	}

	const MAP_CACHE = new Map(); // bundleUrl -> Promise<parsed | null>
	const TEXT_CACHE = new Map(); // url -> Promise<text | null>

	function fetchText(url) {
		if (TEXT_CACHE.has(url)) return TEXT_CACHE.get(url);
		const p = (async () => {
			try {
				const r = await fetch(url, { credentials: "omit" });
				if (!r.ok) return null;
				return await r.text();
			} catch {
				return null;
			}
		})();
		TEXT_CACHE.set(url, p);
		return p;
	}

	function fetchMap(bundleUrl) {
		if (MAP_CACHE.has(bundleUrl)) return MAP_CACHE.get(bundleUrl);
		const p = (async () => {
			try {
				// 1. Try sibling .map first (the common case)
				let mapText = null;
				try {
					const r = await fetch(`${bundleUrl}.map`, { credentials: "omit" });
					if (r.ok) mapText = await r.text();
				} catch {
					/* fall through */
				}
				// 2. Look for //# sourceMappingURL= comment in the bundle itself
				if (!mapText) {
					const body = await fetchText(bundleUrl);
					if (!body) return null;
					const tail = body.length > 4096 ? body.slice(-4096) : body;
					const m = tail.match(/[#@]\s*sourceMappingURL\s*=\s*([^\s'"]+)/);
					if (!m) return null;
					const ref = m[1];
					if (ref.startsWith("data:")) {
						const dm = ref.match(/^data:[^,]+;base64,(.+)$/);
						if (!dm) return null;
						try {
							mapText = atob(dm[1]);
						} catch {
							return null;
						}
					} else {
						try {
							const absRef = new URL(ref, bundleUrl).toString();
							const r2 = await fetch(absRef, { credentials: "omit" });
							if (!r2.ok) return null;
							mapText = await r2.text();
						} catch {
							return null;
						}
					}
				}
				return parseSourceMap(mapText);
			} catch {
				return null;
			}
		})();
		MAP_CACHE.set(bundleUrl, p);
		return p;
	}

	// ------------------------------------------------------------------------
	// CSS rule capture: matched stylesheet rules → original .scss/.css positions
	// ------------------------------------------------------------------------

	function walkRules(rules, href, el, out) {
		for (const rule of Array.from(rules)) {
			if (rule.type === 1 && rule.selectorText) {
				const sels = rule.selectorText
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean);
				for (const sel of sels) {
					try {
						if (el.matches(sel)) {
							out.push({ selectorText: sel, href });
							break;
						}
					} catch {
						/* invalid for matches() (e.g. ::-webkit-*) */
					}
				}
			} else if ((rule.type === 4 || rule.type === 12) && rule.cssRules) {
				// Media or @supports — recurse if currently active
				try {
					if (
						rule.type === 4 &&
						rule.media &&
						rule.media.mediaText &&
						!window.matchMedia(rule.media.mediaText).matches
					)
						continue;
					walkRules(rule.cssRules, href, el, out);
				} catch {
					/* ignore */
				}
			}
		}
	}

	function locateRuleOffset(text, selector) {
		const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const re = new RegExp(`(^|[\\s,;}])${escaped}\\s*[,{]`, "m");
		const m = re.exec(text);
		if (!m) return null;
		const offset = m.index + m[1].length;
		let line = 0,
			lastNl = -1;
		for (let i = 0; i < offset; i++) {
			if (text.charCodeAt(i) === 10) {
				line++;
				lastNl = i;
			}
		}
		return { line, column: offset - lastNl - 1 };
	}

	async function captureCssSources(el) {
		const matches = [];
		let sheets;
		try {
			sheets = Array.from(document.styleSheets);
		} catch {
			return null;
		}
		for (const sheet of sheets) {
			let rules;
			try {
				rules = sheet.cssRules;
			} catch {
				continue;
			} // cross-origin
			if (!rules) continue;
			walkRules(rules, sheet.href, el, matches);
			if (matches.length >= 50) break;
		}
		if (!matches.length) return null;
		matches.sort((a, b) => b.selectorText.length - a.selectorText.length);
		const top = matches.slice(0, 5);
		const out = [];
		for (const m of top) {
			try {
				if (!m.href) {
					out.push({
						source: null,
						line: null,
						column: null,
						selectorText: m.selectorText,
					});
					continue;
				}
				const absUrl = new URL(m.href, location.href).toString();
				if (new URL(absUrl).origin !== location.origin) {
					out.push({
						source: null,
						line: null,
						column: null,
						selectorText: m.selectorText,
					});
					continue;
				}
				const [text, map] = await Promise.all([
					fetchText(absUrl),
					fetchMap(absUrl),
				]);
				let source = null,
					line = null,
					column = null;
				if (text && map) {
					const pos = locateRuleOffset(text, m.selectorText);
					if (pos) {
						const orig = originalPositionFor(map, pos.line, pos.column);
						if (orig) {
							source = orig.source;
							line = orig.line;
							column = orig.column;
						}
					}
				}
				// Last-resort: single-source map gives the file even if we can't pin a line
				if (!source && map && map.sources && map.sources.length === 1) {
					source = (map.sourceRoot || "") + map.sources[0];
				}
				out.push({ source, line, column, selectorText: m.selectorText });
			} catch {
				out.push({
					source: null,
					line: null,
					column: null,
					selectorText: m.selectorText,
				});
			}
		}
		const filtered = out.filter((o) => o.source);
		return filtered.length ? filtered : null;
	}

	// ------------------------------------------------------------------------
	// Console-error stack resolution
	// ------------------------------------------------------------------------

	function parseStackFrames(stack) {
		if (typeof stack !== "string") return [];
		const frames = [];
		for (const raw of stack.split("\n")) {
			const ln = raw.trim();
			if (!ln) continue;
			// Chrome/Node: "at fn (url:L:C)" or "at url:L:C"
			let m = ln.match(/^at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?$/);
			if (m) {
				frames.push({
					name: m[1] || "",
					url: m[2],
					line: +m[3],
					column: +m[4],
					raw: ln,
				});
				continue;
			}
			// Firefox/Safari: "fn@url:L:C" or "@url:L:C"
			m = ln.match(/^(?:(.*?)@)?(.+?):(\d+):(\d+)$/);
			if (m && /^https?:|^file:/.test(m[2])) {
				frames.push({
					name: m[1] || "",
					url: m[2],
					line: +m[3],
					column: +m[4],
					raw: ln,
				});
			}
		}
		return frames;
	}

	async function resolveStack(stack) {
		const frames = parseStackFrames(stack).slice(0, 10);
		if (!frames.length) return null;
		const resolved = [];
		for (const f of frames) {
			let source = null,
				line = null,
				column = null,
				name = f.name || null;
			try {
				const abs = new URL(f.url, location.href);
				if (
					abs.origin === location.origin &&
					/\.m?js(\?|$)/.test(abs.pathname)
				) {
					const map = await fetchMap(abs.toString());
					if (map) {
						const pos = originalPositionFor(map, f.line - 1, f.column - 1);
						if (pos) {
							source = pos.source;
							line = pos.line;
							column = pos.column;
							name = pos.name || name;
						}
					}
				}
			} catch {
				/* ignore */
			}
			resolved.push({ source, line, column, name, raw: f.raw });
		}
		return resolved;
	}

	async function resolveConsoleErrors(errors) {
		const out = [];
		for (const e of errors) {
			if (!e.stack) {
				out.push(e);
				continue;
			}
			const stackResolved = await resolveStack(e.stack);
			if (stackResolved && stackResolved.some((f) => f.source)) {
				out.push({ ...e, stackResolved });
			} else {
				out.push(e);
			}
		}
		return out;
	}

	// ------------------------------------------------------------------------
	// State + persistence
	// ------------------------------------------------------------------------

	let queue = [];
	let sessionDescription = "";
	let pickerActive = false;
	let highlightEl = null;

	function loadQueue() {
		try {
			const raw = localStorage.getItem(QUEUE_KEY);
			if (!raw) return;
			const data = JSON.parse(raw);
			if (Array.isArray(data.queue)) queue = data.queue;
			if (typeof data.sessionDescription === "string")
				sessionDescription = data.sessionDescription;
		} catch {
			/* ignore */
		}
	}
	function saveQueue() {
		try {
			localStorage.setItem(
				QUEUE_KEY,
				JSON.stringify({ queue, sessionDescription }),
			);
		} catch {
			/* ignore */
		}
	}

	// ------------------------------------------------------------------------
	// Element metadata extraction
	// ------------------------------------------------------------------------

	function buildSelector(el) {
		if (!(el instanceof Element)) return "";
		if (el.id) return `#${CSS.escape(el.id)}`;
		const parts = [];
		let cur = el;
		while (cur && cur !== document.body && parts.length < 5) {
			let part = cur.tagName.toLowerCase();
			if (cur.id) {
				part += `#${CSS.escape(cur.id)}`;
				parts.unshift(part);
				break;
			}
			if (cur.className && typeof cur.className === "string") {
				const cls = cur.className
					.trim()
					.split(/\s+/)
					.filter((c) => c && !c.startsWith("web-inspect-"))
					.slice(0, 2)
					.map((c) => `.${CSS.escape(c)}`)
					.join("");
				part += cls;
			}
			const parent = cur.parentElement;
			if (parent) {
				const sibs = Array.from(parent.children).filter(
					(c) => c.tagName === cur.tagName,
				);
				if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
			}
			parts.unshift(part);
			cur = parent;
		}
		return parts.join(" > ");
	}

	function getReactInfo(el) {
		if (!el) return null;
		const fiberKey = Object.keys(el).find(
			(k) =>
				k.startsWith("__reactFiber$") ||
				k.startsWith("__reactInternalInstance$"),
		);
		if (!fiberKey) return null;
		let fiber = el[fiberKey];
		let componentName = null;
		let sourceFile = null;
		let sourceLine = null;
		const stack = [];
		let depth = 0;
		while (fiber && depth < 20) {
			const type = fiber.type;
			if (type) {
				const name =
					type.displayName ||
					type.name ||
					(typeof type === "string" ? type : null);
				if (name && /^[A-Z]/.test(name)) {
					if (!componentName) componentName = name;
					stack.push(name);
				}
			}
			if (!sourceFile && fiber._debugSource) {
				sourceFile = fiber._debugSource.fileName;
				sourceLine = fiber._debugSource.lineNumber;
			}
			fiber = fiber.return;
			depth++;
		}
		return { componentName, sourceFile, sourceLine, stack };
	}

	function getInterestingStyles(el) {
		const cs = getComputedStyle(el);
		const keys = [
			"display",
			"position",
			"width",
			"height",
			"padding",
			"margin",
			"border",
			"color",
			"backgroundColor",
			"fontSize",
			"fontWeight",
			"fontFamily",
			"flexDirection",
			"gridTemplateColumns",
			"overflow",
			"visibility",
			"opacity",
			"transform",
			"zIndex",
		];
		const out = {};
		for (const k of keys)
			out[k] = cs.getPropertyValue(
				k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()),
			);
		return out;
	}

	function snapshotElement(el) {
		const rect = el.getBoundingClientRect();
		const html = (el.outerHTML || "").slice(0, 8000);
		const text = (el.textContent || "").trim().slice(0, 500);
		const react = getReactInfo(el);
		return {
			selector: buildSelector(el),
			outerHTML: html,
			textContent: text,
			tagName: el.tagName.toLowerCase(),
			id: el.id || "",
			classes: (typeof el.className === "string"
				? el.className.split(/\s+/)
				: []
			).filter((c) => c && !c.startsWith("web-inspect-")),
			boundingRect: {
				x: Math.round(rect.x),
				y: Math.round(rect.y),
				w: Math.round(rect.width),
				h: Math.round(rect.height),
			},
			computedStyles: getInterestingStyles(el),
			componentName: react ? react.componentName : null,
			sourceFile: react ? react.sourceFile : null,
			sourceLine: react ? react.sourceLine : null,
			componentStack: react ? react.stack : [],
		};
	}

	// ------------------------------------------------------------------------
	// Screenshot via lazy-loaded modern-screenshot (best effort)
	// ------------------------------------------------------------------------

	let screenshotLib = null;
	let screenshotLibPromise = null;
	function loadScreenshotLib() {
		if (screenshotLib) return Promise.resolve(screenshotLib);
		if (screenshotLibPromise) return screenshotLibPromise;
		screenshotLibPromise = new Promise((resolve) => {
			const s = document.createElement("script");
			s.src = SCREENSHOT_CDN;
			s.crossOrigin = "anonymous";
			s.async = true;
			s.setAttribute(IGNORE_ATTR, "1");
			s.onload = () => {
				screenshotLib =
					window.modernScreenshot || window.ModernScreenshot || null;
				resolve(screenshotLib);
			};
			s.onerror = () => resolve(null);
			document.head.appendChild(s);
		});
		return screenshotLibPromise;
	}

	async function captureElement(el) {
		try {
			const lib = await loadScreenshotLib();
			if (!lib || !lib.domToPng) return null;
			const png = await lib.domToPng(el, {
				backgroundColor: "#fff",
				scale: 1,
				timeout: 4000,
			});
			return typeof png === "string" ? png : null;
		} catch (err) {
			console.warn("[web-inspect] screenshot failed", err);
			return null;
		}
	}

	// ------------------------------------------------------------------------
	// UI (shadow root to isolate from page CSS)
	// ------------------------------------------------------------------------

	const host = document.createElement("div");
	host.setAttribute(ROOT_ATTR, "1");
	host.setAttribute(IGNORE_ATTR, "1");
	host.style.cssText =
		"all: initial; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646;";
	document.documentElement.appendChild(host);
	const shadow = host.attachShadow({ mode: "closed" });

	const style = document.createElement("style");
	style.textContent = `
    :host, * { box-sizing: border-box; }
    .fe-toolbar {
      position: fixed; bottom: 16px; right: 16px; pointer-events: auto;
      display: flex; align-items: center; gap: 6px;
      padding: 6px 8px; border-radius: 999px;
      background: #111; color: #fff; font: 12px/1.2 ui-sans-serif, system-ui, sans-serif;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }
    .fe-toolbar button {
      all: unset; cursor: pointer; padding: 6px 10px; border-radius: 999px;
      background: transparent; color: #fff; font: inherit;
    }
    .fe-toolbar button:hover { background: #2a2a2a; }
    .fe-toolbar button.primary { background: #6470F0; }
    .fe-toolbar button.primary:hover { background: #5560E0; }
    .fe-toolbar button[disabled] { opacity: 0.6; cursor: not-allowed; }
    .fe-toolbar .badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px;
      background: #6470F0; font-size: 11px; font-weight: 600;
    }
    .fe-toolbar .queue-btn { display: inline-flex; align-items: center; gap: 4px; }
    .fe-toolbar .queue-icon { font-size: 14px; line-height: 1; }
    .fe-toolbar .send-btn[hidden] { display: none; }
    .fe-toolbar.hidden { display: none; }

    .fe-show-tab {
      position: fixed; bottom: 16px; right: 16px; pointer-events: auto;
      padding: 6px 10px; border-radius: 999px; background: #111; color: #fff;
      font: 12px/1.2 ui-sans-serif, system-ui, sans-serif; cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
    }

    .fe-highlight {
      position: fixed; pointer-events: none;
      border: 2px solid #6470F0; background: rgba(100,112,240,0.12);
      border-radius: 2px; transition: all 60ms ease-out; z-index: 2147483645;
    }

    .fe-popover {
      position: fixed; pointer-events: auto;
      background: #fff; color: #111; border-radius: 8px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
      padding: 10px; width: 280px; font: 13px/1.4 ui-sans-serif, system-ui, sans-serif;
      z-index: 2147483647;
    }
    .fe-popover textarea {
      width: 100%; min-height: 70px; resize: vertical;
      border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font: inherit;
      outline: none;
    }
    .fe-popover textarea:focus { border-color: #6470F0; }
    .fe-popover .row { display: flex; gap: 6px; margin-top: 8px; justify-content: flex-end; }
    .fe-popover button {
      all: unset; cursor: pointer; padding: 6px 12px; border-radius: 6px;
      font: inherit; font-weight: 500;
    }
    .fe-popover button.primary { background: #6470F0; color: #fff; }
    .fe-popover button.ghost { background: transparent; color: #666; }
    .fe-popover button:hover { filter: brightness(0.95); }
    .fe-popover .label { font-size: 11px; color: #888; margin-bottom: 4px; }
    .fe-popover .target {
      font: 11px/1.3 ui-monospace, monospace;
      background: #f4f4f8; padding: 4px 6px; border-radius: 4px;
      max-height: 40px; overflow: hidden; text-overflow: ellipsis;
      margin-bottom: 8px; color: #555;
    }

    .fe-pin {
      position: fixed; pointer-events: auto;
      width: 22px; height: 22px; border-radius: 50%;
      background: #6470F0; color: #fff;
      font: 600 12px/22px ui-sans-serif, system-ui, sans-serif;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transform: translate(-50%, -50%);
      cursor: pointer;
      z-index: 2147483645;
    }

    .fe-sidebar {
      position: fixed; top: 16px; right: 16px; bottom: 70px;
      width: 320px; pointer-events: auto;
      background: #fff; color: #111; border-radius: 10px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
      font: 13px/1.4 ui-sans-serif, system-ui, sans-serif;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .fe-sidebar.collapsed { display: none; }
    .fe-sidebar header {
      padding: 10px 12px; border-bottom: 1px solid #eee;
      font-weight: 600;
      display: flex; align-items: center; justify-content: space-between;
    }
    .fe-sidebar header .count { color: #6470F0; font-weight: 700; }
    .fe-sidebar .session-desc {
      padding: 8px 12px; border-bottom: 1px solid #eee;
    }
    .fe-sidebar .session-desc textarea {
      width: 100%; min-height: 38px; resize: vertical;
      border: 1px solid #eee; border-radius: 6px; padding: 6px 8px;
      font: inherit; outline: none;
    }
    .fe-sidebar .session-desc textarea:focus { border-color: #6470F0; }
    .fe-sidebar .session-desc .label { font-size: 10px; color: #888; margin-bottom: 4px; }
    .fe-list { flex: 1; overflow-y: auto; padding: 6px; }
    .fe-item {
      padding: 8px; border-radius: 6px; cursor: pointer;
      display: flex; align-items: flex-start; gap: 8px;
    }
    .fe-item:hover { background: #f4f4f8; }
    .fe-item .num {
      flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%;
      background: #6470F0; color: #fff; font-weight: 600; font-size: 12px;
      text-align: center; line-height: 22px;
    }
    .fe-item .body { flex: 1; min-width: 0; }
    .fe-item .comment { white-space: pre-wrap; word-break: break-word; font-size: 12px; }
    .fe-item .target-text { font: 11px ui-monospace, monospace; color: #888; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .fe-item .actions { display: flex; gap: 4px; opacity: 0; transition: opacity 80ms; }
    .fe-item:hover .actions { opacity: 1; }
    .fe-item .actions button {
      all: unset; cursor: pointer; padding: 2px 6px; border-radius: 4px;
      font-size: 11px; color: #888;
    }
    .fe-item .actions button:hover { background: #e8e8ee; color: #111; }

    .fe-sidebar footer {
      padding: 10px 12px; border-top: 1px solid #eee;
      display: flex; gap: 6px;
    }
    .fe-sidebar footer button {
      all: unset; cursor: pointer; padding: 8px 12px; border-radius: 6px;
      font: inherit; font-weight: 500; flex: 1; text-align: center;
    }
    .fe-sidebar footer button.primary { background: #6470F0; color: #fff; }
    .fe-sidebar footer button.primary:disabled { background: #c5c8e8; cursor: not-allowed; }
    .fe-sidebar footer button.ghost { background: #f4f4f8; color: #555; flex: 0; padding: 8px 10px; }

    .fe-empty {
      padding: 24px 16px; text-align: center; color: #888; font-size: 12px;
    }

    .fe-toast {
      position: fixed; bottom: 70px; right: 16px; pointer-events: none;
      background: #111; color: #fff; padding: 8px 14px; border-radius: 6px;
      font: 12px/1.2 ui-sans-serif, system-ui, sans-serif;
      opacity: 0; transition: opacity 200ms;
    }
    .fe-toast.show { opacity: 1; }
  `;
	shadow.appendChild(style);

	const root = document.createElement("div");
	shadow.appendChild(root);
	root.innerHTML = `
    <div class="fe-highlight" style="display:none"></div>
    <div class="fe-sidebar collapsed">
      <header>
        <span>web-inspect <span class="count">(0)</span></span>
        <button class="ghost" data-action="hide-sidebar" style="all:unset;cursor:pointer;color:#999;font-size:14px;">−</button>
      </header>
      <div class="session-desc">
        <div class="label">Overall context (optional)</div>
        <textarea data-role="session-desc" placeholder="What were you doing when you found these?"></textarea>
      </div>
      <div class="fe-list" data-role="list"></div>
      <footer>
        <button class="ghost" data-action="clear">Clear</button>
        <button class="primary" data-action="send" disabled>Send to agent</button>
      </footer>
    </div>
    <div class="fe-toolbar">
      <button data-action="toggle-sidebar" class="queue-btn" title="Show queue">
        <span class="queue-icon">☰</span>
        <span class="badge" data-role="badge">0</span>
      </button>
      <button data-action="pick" class="primary">Pick element</button>
      <button data-action="send" class="send-btn primary" data-role="toolbar-send" hidden>
        Send (<span data-role="toolbar-send-count">0</span>)
      </button>
      <button data-action="hide" title="Hide overlay">×</button>
    </div>
    <div class="fe-show-tab" style="display:none" data-action="show">web-inspect</div>
    <div class="fe-toast" data-role="toast"></div>
  `;

	const $ = (sel) => root.querySelector(sel);
	const $$ = (sel) => root.querySelectorAll(sel);

	const els = {
		toolbar: $(".fe-toolbar"),
		sidebar: $(".fe-sidebar"),
		list: $('[data-role="list"]'),
		badge: $('[data-role="badge"]'),
		sendBtn: $('.fe-sidebar [data-action="send"]'),
		toolbarSendBtn: $('[data-role="toolbar-send"]'),
		toolbarSendCount: $('[data-role="toolbar-send-count"]'),
		pickBtn: $('[data-action="pick"]'),
		showTab: $(".fe-show-tab"),
		sessionDescInput: $('[data-role="session-desc"]'),
		highlight: $(".fe-highlight"),
		toast: $('[data-role="toast"]'),
		pins: [], // dynamic
	};

	// ------------------------------------------------------------------------
	// Render
	// ------------------------------------------------------------------------

	function renderList() {
		els.badge.textContent = String(queue.length);
		els.sendBtn.disabled = queue.length === 0;
		els.toolbarSendCount.textContent = String(queue.length);
		if (queue.length > 0) els.toolbarSendBtn.removeAttribute("hidden");
		else els.toolbarSendBtn.setAttribute("hidden", "");
		$(".fe-sidebar header .count").textContent = `(${queue.length})`;
		if (queue.length === 0) {
			els.list.innerHTML = `<div class="fe-empty">No annotations yet.<br>Click <strong>Pick element</strong> to start.</div>`;
			renderPins();
			return;
		}
		els.list.innerHTML = queue
			.map(
				(a, i) => `
      <div class="fe-item" data-id="${a.localId}">
        <div class="num">${i + 1}</div>
        <div class="body">
          <div class="comment">${escapeHtml(a.comment || "(no comment)")}</div>
          <div class="target-text">${escapeHtml((a.element && a.element.selector) || "")}</div>
        </div>
        <div class="actions">
          <button data-act="edit" title="Edit comment">✎</button>
          <button data-act="del" title="Delete">×</button>
        </div>
      </div>
    `,
			)
			.join("");
		renderPins();
	}

	function renderPins() {
		for (const p of els.pins) p.remove();
		els.pins = [];
		queue.forEach((a, i) => {
			if (!a.element || !a.element.boundingRect) return;
			const r = a.element.boundingRect;
			const pin = document.createElement("div");
			pin.className = "fe-pin";
			pin.style.left = `${r.x + r.w / 2}px`;
			pin.style.top = `${r.y + 12}px`;
			pin.textContent = String(i + 1);
			pin.title = a.comment || "";
			root.appendChild(pin);
			els.pins.push(pin);
		});
	}

	function escapeHtml(s) {
		return String(s).replace(
			/[&<>"']/g,
			(c) =>
				({
					"&": "&amp;",
					"<": "&lt;",
					">": "&gt;",
					'"': "&quot;",
					"'": "&#39;",
				})[c],
		);
	}

	function showToast(msg, ms = 1800) {
		els.toast.textContent = msg;
		els.toast.classList.add("show");
		setTimeout(() => els.toast.classList.remove("show"), ms);
	}

	// ------------------------------------------------------------------------
	// Element picker
	// ------------------------------------------------------------------------

	function isOurs(el) {
		while (el && el !== document) {
			if (
				el.nodeType === 1 &&
				el.hasAttribute &&
				(el.hasAttribute(ROOT_ATTR) || el.hasAttribute(IGNORE_ATTR))
			)
				return true;
			el = el.parentNode;
		}
		return false;
	}

	function startPicker() {
		if (pickerActive) return stopPicker();
		pickerActive = true;
		els.pickBtn.textContent = "Cancel";
		document.body.style.cursor = "crosshair";
		document.addEventListener("mousemove", onPickerMove, true);
		document.addEventListener("click", onPickerClick, true);
		document.addEventListener("keydown", onPickerKey, true);
	}

	function stopPicker() {
		pickerActive = false;
		els.pickBtn.textContent = "Pick element";
		document.body.style.cursor = "";
		els.highlight.style.display = "none";
		document.removeEventListener("mousemove", onPickerMove, true);
		document.removeEventListener("click", onPickerClick, true);
		document.removeEventListener("keydown", onPickerKey, true);
	}

	function onPickerMove(e) {
		const target = document.elementFromPoint(e.clientX, e.clientY);
		if (!target || isOurs(target)) {
			els.highlight.style.display = "none";
			highlightEl = null;
			return;
		}
		highlightEl = target;
		const r = target.getBoundingClientRect();
		Object.assign(els.highlight.style, {
			display: "block",
			left: `${r.x}px`,
			top: `${r.y}px`,
			width: `${r.width}px`,
			height: `${r.height}px`,
		});
	}

	function onPickerClick(e) {
		if (isOurs(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		const target = highlightEl || e.target;
		if (!target || isOurs(target)) return;
		stopPicker();
		openCommentPopover(target, e.clientX, e.clientY);
	}

	function onPickerKey(e) {
		if (e.key === "Escape") stopPicker();
	}

	// ------------------------------------------------------------------------
	// Comment popover
	// ------------------------------------------------------------------------

	let activePopover = null;
	function openCommentPopover(targetEl, x, y) {
		closePopover();
		const snap = snapshotElement(targetEl);
		const pop = document.createElement("div");
		pop.className = "fe-popover";
		pop.innerHTML = `
      <div class="label">Element</div>
      <div class="target">${escapeHtml(snap.selector || snap.tagName)}</div>
      <textarea placeholder="What's wrong with this?" autofocus></textarea>
      <div class="row">
        <button class="ghost" data-act="cancel">Cancel</button>
        <button class="primary" data-act="save">Save</button>
      </div>
    `;
		const rect = targetEl.getBoundingClientRect();
		const px = Math.min(
			window.innerWidth - 300,
			Math.max(8, x ?? rect.x + rect.width / 2 - 140),
		);
		const py = Math.min(
			window.innerHeight - 200,
			Math.max(8, (y ?? rect.y + rect.height) + 8),
		);
		pop.style.left = `${px}px`;
		pop.style.top = `${py}px`;
		root.appendChild(pop);
		activePopover = pop;
		const ta = pop.querySelector("textarea");
		setTimeout(() => ta.focus(), 0);

		pop.addEventListener("click", async (e) => {
			const act = e.target.getAttribute && e.target.getAttribute("data-act");
			if (act === "cancel") return closePopover();
			if (act === "save") {
				const comment = ta.value.trim();
				closePopover();
				if (!comment) {
					showToast("Comment empty — discarded");
					return;
				}
				await addAnnotation(targetEl, snap, comment);
			}
		});
		ta.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				pop.querySelector('[data-act="save"]').click();
			} else if (e.key === "Escape") {
				closePopover();
			}
		});
	}
	function closePopover() {
		if (activePopover) {
			activePopover.remove();
			activePopover = null;
		}
	}

	async function addAnnotation(targetEl, snap, comment) {
		const localId = Math.random().toString(36).slice(2, 10);
		showToast("Capturing screenshot…");
		const rawErrors = consoleBuffer.slice(-20);
		const [screenshot, cssSources, consoleErrors] = await Promise.all([
			captureElement(targetEl),
			captureCssSources(targetEl).catch(() => null),
			resolveConsoleErrors(rawErrors).catch(() => rawErrors),
		]);
		if (cssSources) snap.cssSources = cssSources;
		const ann = {
			localId,
			comment,
			url: location.href,
			viewport: { w: window.innerWidth, h: window.innerHeight },
			element: snap,
			consoleErrors,
			networkErrors: networkBuffer.slice(-20),
			screenshot, // data URL or null
			capturedAt: Date.now(),
		};
		const wasEmpty = queue.length === 0;
		queue.push(ann);
		saveQueue();
		renderList();
		if (wasEmpty) openSidebar();
		showToast(`Annotation ${queue.length} saved`);
	}

	// ------------------------------------------------------------------------
	// Sidebar actions
	// ------------------------------------------------------------------------

	function openSidebar() {
		els.sidebar.classList.remove("collapsed");
	}
	function closeSidebar() {
		els.sidebar.classList.add("collapsed");
	}

	els.sessionDescInput.addEventListener("input", (e) => {
		sessionDescription = e.target.value;
		saveQueue();
	});

	els.list.addEventListener("click", (e) => {
		const item = e.target.closest(".fe-item");
		if (!item) return;
		const id = item.getAttribute("data-id");
		const idx = queue.findIndex((a) => a.localId === id);
		if (idx < 0) return;
		const act = e.target.getAttribute && e.target.getAttribute("data-act");
		if (act === "del") {
			queue.splice(idx, 1);
			saveQueue();
			renderList();
			return;
		}
		if (act === "edit") {
			const ann = queue[idx];
			const next = prompt("Edit comment:", ann.comment);
			if (next != null) {
				ann.comment = next;
				saveQueue();
				renderList();
			}
			return;
		}
		// click on body -> scroll to element if findable
		const ann = queue[idx];
		if (ann && ann.element && ann.element.selector) {
			try {
				const t = document.querySelector(ann.element.selector);
				if (t) t.scrollIntoView({ behavior: "smooth", block: "center" });
			} catch {
				/* ignore */
			}
		}
	});

	root.addEventListener("click", async (e) => {
		const actEl = e.target.closest && e.target.closest("[data-action]");
		const act = actEl && actEl.getAttribute("data-action");
		if (!act) return;
		if (act === "pick") startPicker();
		else if (act === "toggle-sidebar") {
			if (els.sidebar.classList.contains("collapsed")) openSidebar();
			else closeSidebar();
		} else if (act === "hide-sidebar") closeSidebar();
		else if (act === "send") await sendBatch();
		else if (act === "clear") {
			if (queue.length && !confirm(`Clear ${queue.length} annotation(s)?`))
				return;
			queue = [];
			sessionDescription = "";
			els.sessionDescInput.value = "";
			saveQueue();
			renderList();
		} else if (act === "hide") {
			els.toolbar.classList.add("hidden");
			els.showTab.style.display = "block";
			try {
				localStorage.setItem(HIDDEN_KEY, "1");
			} catch {
				/* ignore */
			}
		} else if (act === "show") {
			els.toolbar.classList.remove("hidden");
			els.showTab.style.display = "none";
			try {
				localStorage.removeItem(HIDDEN_KEY);
			} catch {
				/* ignore */
			}
		}
	});

	async function sendBatch() {
		if (!queue.length) return;
		els.sendBtn.disabled = true;
		els.sendBtn.textContent = "Sending…";
		els.toolbarSendBtn.setAttribute("disabled", "");
		try {
			const res = await fetch(
				`${HELPER_ORIGIN}/batch?token=${encodeURIComponent(TOKEN)}`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						sessionDescription,
						annotations: queue,
					}),
				},
			);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = await res.json();
			showToast(`Sent ${data.count || queue.length} annotation(s) to agent`);
			queue = [];
			sessionDescription = "";
			els.sessionDescInput.value = "";
			saveQueue();
			renderList();
		} catch (err) {
			showToast(`Send failed: ${err.message}`, 4000);
		} finally {
			els.sendBtn.disabled = queue.length === 0;
			els.sendBtn.textContent = "Send to agent";
			els.toolbarSendBtn.removeAttribute("disabled");
		}
	}

	// Reposition pins on scroll/resize
	let pinTick = null;
	const reposPins = () => {
		if (pinTick) return;
		pinTick = requestAnimationFrame(() => {
			pinTick = null;
			// Re-snapshot bounding rects of queued elements (positions shift on layout)
			let dirty = false;
			for (const a of queue) {
				if (!a.element || !a.element.selector) continue;
				try {
					const el = document.querySelector(a.element.selector);
					if (el) {
						const r = el.getBoundingClientRect();
						a.element.boundingRect = {
							x: Math.round(r.x),
							y: Math.round(r.y),
							w: Math.round(r.width),
							h: Math.round(r.height),
						};
						dirty = true;
					}
				} catch {
					/* ignore */
				}
			}
			if (dirty) renderPins();
		});
	};
	window.addEventListener("scroll", reposPins, { passive: true });
	window.addEventListener("resize", reposPins);

	// ------------------------------------------------------------------------
	// Init
	// ------------------------------------------------------------------------

	loadQueue();
	els.sessionDescInput.value = sessionDescription;
	if (localStorage.getItem(HIDDEN_KEY) === "1") {
		els.toolbar.classList.add("hidden");
		els.showTab.style.display = "block";
	}
	renderList();
})();
