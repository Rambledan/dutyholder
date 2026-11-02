// A real app screenshot in a light browser frame, with a camera that zooms
// and pans, green highlight rings, cover-up masks and a caption pill.
// Coordinates are CSS pixels of the captured page (viewport 1440 x 900).

export type Rect = { x: number; y: number; w: number; h: number };

/** The smallest rect containing all of `rects`. */
export function union(...rects: Rect[]): Rect {
	const x = Math.min(...rects.map((r) => r.x));
	const y = Math.min(...rects.map((r) => r.y));
	const right = Math.max(...rects.map((r) => r.x + r.w));
	const bottom = Math.max(...rects.map((r) => r.y + r.h));
	return { x, y, w: right - x, h: bottom - y };
}

/** `rect` grown by `by` px on every side (or `[x, y]`). */
export function pad(rect: Rect, by: number | [number, number]): Rect {
	const [px, py] = typeof by === "number" ? [by, by] : by;
	return { x: rect.x - px, y: rect.y - py, w: rect.w + px * 2, h: rect.h + py * 2 };
}

/** Highlight boxes recorded by the capture scripts (manifest.json). */
export type Manifest = { screens: Record<string, { highlights: Record<string, Rect | null> }> };

/** Look up a recorded highlight box, failing loudly if the capture missed it. */
export function boxes(manifest: Manifest, screen: string): Record<string, Rect> {
	const h = manifest.screens[screen]?.highlights ?? {};
	return new Proxy(h, {
		get(target, key: string) {
			const r = target[key];
			if (!r) throw new Error(`No "${key}" box recorded for ${screen}`);
			return r;
		},
	}) as Record<string, Rect>;
}

export interface Screen {
	src: string;
	/** Page height in CSS px. 900 for a viewport shot, more for a full page. */
	height?: number;
	/** Areas to paint over (e.g. developer notes), in the colour behind them. */
	masks?: (Rect & { color?: string })[];
	/** Text shown in the browser address bar. */
	url?: string;
}

const VIEW_W = 1440;
const VIEW_H = 900;
const CHROME_H = 44;
// The frame is shown slightly smaller so the caption gets its own band below it.
const FRAME_SCALE = 0.86;
const FRAME_TOP = 30;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

interface Stage {
	el: HTMLElement;
	img: HTMLImageElement;
	height: number;
	url: string;
	zoom: number;
	transform: string;
}

export class AppScreen {
	private frame: HTMLElement;
	private viewport: HTMLElement;
	private urlEl: HTMLElement;
	private captionHost: HTMLElement;
	private caption: HTMLElement | null = null;
	private stages: Stage[] = [];
	private current = 0;

	constructor(el: HTMLElement, step: string, screens: Screen[]) {
		el.innerHTML = `
      <div style="position: relative; height: 100%; background: var(--color-bg); overflow: hidden;">
        <div data-ref="frame" style="position: absolute; left: ${(1920 - VIEW_W) / 2}px; top: ${FRAME_TOP}px; width: ${VIEW_W}px; transform: scale(${FRAME_SCALE}); transform-origin: 50% 0; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-frame); overflow: hidden; opacity: 0;">
          <div style="height: ${CHROME_H}px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 9px; padding: 0 20px; background: #f4f5f8;">
            <span style="width: 12px; height: 12px; border-radius: 50%; background: #d6d3d1;"></span>
            <span style="width: 12px; height: 12px; border-radius: 50%; background: #d6d3d1;"></span>
            <span style="width: 12px; height: 12px; border-radius: 50%; background: #d6d3d1;"></span>
            <span data-ref="url" style="margin-left: 20px; padding: 4px 16px; border-radius: 8px; background: var(--color-surface); border: 1px solid var(--color-border); font-family: var(--font-mono); font-size: 16px; color: var(--color-muted);"></span>
            <span style="margin-left: auto; font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-muted);">${step}</span>
          </div>
          <div data-ref="viewport" style="position: relative; width: ${VIEW_W}px; height: ${VIEW_H}px; overflow: hidden; background: #fff;"></div>
        </div>
        <div data-ref="captions" style="position: absolute; left: 0; right: 0; bottom: 44px; height: 90px;"></div>
      </div>
    `;
		const q = (r: string) => el.querySelector(`[data-ref="${r}"]`) as HTMLElement;
		this.frame = q("frame");
		this.viewport = q("viewport");
		this.urlEl = q("url");
		this.captionHost = q("captions");

		screens.forEach((s, i) => {
			const stage = document.createElement("div");
			const height = s.height ?? VIEW_H;
			stage.style.cssText = `position: absolute; left: 0; top: 0; width: ${VIEW_W}px; height: ${height}px; transform-origin: 0 0; opacity: ${i === 0 ? 1 : 0};`;
			const img = document.createElement("img");
			img.src = s.src;
			img.style.cssText = `display: block; width: ${VIEW_W}px; height: ${height}px;`;
			stage.appendChild(img);
			for (const m of s.masks ?? []) {
				const cover = document.createElement("div");
				cover.style.cssText = `position: absolute; left: ${m.x}px; top: ${m.y}px; width: ${m.w}px; height: ${m.h}px; background: ${m.color ?? "#fff"};`;
				stage.appendChild(cover);
			}
			this.viewport.appendChild(stage);
			this.stages.push({ el: stage, img, height, url: s.url ?? "", zoom: 1, transform: "translate(0px, 0px) scale(1)" });
		});
		this.urlEl.textContent = this.stages[0]?.url ?? "";
	}

	/** Wait until every screenshot has decoded, so nothing pops in mid-shot. */
	async ready(): Promise<void> {
		await Promise.all(this.stages.map((s) => s.img.decode().catch(() => undefined)));
	}

	/** Frame scales up from 0.96 and fades in. */
	enter(): void {
		this.frame.animate(
			[
				{ opacity: 0, transform: `scale(${FRAME_SCALE * 0.96})` },
				{ opacity: 1, transform: `scale(${FRAME_SCALE})` },
			],
			{ duration: 700, fill: "forwards", easing: EASE_OUT },
		);
	}

	/** Cross-fade to another screen (and clear the old one's rings). */
	show(index: number): void {
		const from = this.stages[this.current];
		const to = this.stages[index];
		if (!to || index === this.current) return;
		from.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards", easing: EASE });
		to.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards", easing: EASE });
		this.current = index;
		this.urlEl.textContent = to.url;
	}

	/**
	 * Move the camera so `rect` is centred at `zoom`, kept inside the page.
	 * With no rect the camera returns to the top of the page at 1x.
	 */
	focus(rect: Rect | null, zoom = 1, duration = 900): void {
		const s = this.stages[this.current];
		const k = rect ? zoom : 1;
		let tx = rect ? VIEW_W / 2 - k * (rect.x + rect.w / 2) : 0;
		let ty = rect ? VIEW_H / 2 - k * (rect.y + rect.h / 2) : 0;
		tx = Math.min(0, Math.max(VIEW_W - k * VIEW_W, tx));
		ty = Math.min(0, Math.max(VIEW_H - k * s.height, ty));
		const next = `translate(${tx}px, ${ty}px) scale(${k})`;
		s.el.animate([{ transform: s.transform }, { transform: next }], {
			duration,
			fill: "forwards",
			easing: EASE,
		});
		s.transform = next;
		s.zoom = k;
	}

	/** Draw an accent ring around `rect` on the current screen. */
	ring(rect: Rect, delay = 0): HTMLElement {
		const s = this.stages[this.current];
		const pad = 8;
		const ring = document.createElement("div");
		ring.style.cssText = `position: absolute; left: ${rect.x - pad}px; top: ${rect.y - pad}px; width: ${rect.w + pad * 2}px; height: ${rect.h + pad * 2}px; border: ${4 / s.zoom}px solid var(--color-accent); border-radius: ${12 / s.zoom + 4}px; opacity: 0; pointer-events: none;`;
		s.el.appendChild(ring);
		ring.animate(
			[
				{ opacity: 0, transform: "scale(1.03)" },
				{ opacity: 1, transform: "scale(1)" },
			],
			{ duration: 500, delay, fill: "forwards", easing: EASE_OUT },
		);
		return ring;
	}

	/** Fade a ring out. */
	unring(ring: HTMLElement): void {
		ring.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards", easing: EASE });
	}

	/** Replace the caption pill (old one fades out as the new one rises in). */
	say(text: string, delay = 200): void {
		if (this.caption) {
			this.caption.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards", easing: EASE });
		}
		const pill = document.createElement("div");
		pill.textContent = text;
		pill.style.cssText = `position: absolute; left: 50%; bottom: 0; transform: translateX(-50%); background: var(--color-fg); color: #fff; font-family: var(--font-body); font-weight: 500; font-size: 36px; letter-spacing: -0.01em; padding: 20px 38px; border-radius: 999px; white-space: nowrap; box-shadow: 0 12px 32px rgba(15, 18, 34, 0.25); opacity: 0;`;
		this.captionHost.appendChild(pill);
		pill.animate(
			[
				{ opacity: 0, transform: "translate(-50%, 24px)" },
				{ opacity: 1, transform: "translate(-50%, 0)" },
			],
			{ duration: 500, delay: this.caption ? Math.max(delay, 250) : delay, fill: "forwards", easing: EASE_OUT },
		);
		this.caption = pill;
	}
}
