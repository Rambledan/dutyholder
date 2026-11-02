import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

export default defineSegment({
	id: "ps-outro",
	advances: [4.0],
	voiceover: "That's your project set up, in a few minutes. Dutyholder.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; background: var(--color-bg); color: var(--color-fg); overflow: hidden;">
        <div style="position: absolute; left: var(--safe-x); right: var(--safe-x); top: 50%; transform: translateY(-50%);">
          <div data-ref="headline" style="font-family: var(--font-display); font-weight: 600; font-size: 120px; line-height: 1.0; letter-spacing: -0.035em; opacity: 0;">
            Project set up.<br/><span style="color: var(--color-accent);">Duties in hand.</span>
          </div>
          <div data-ref="brand" style="display: flex; align-items: center; gap: 20px; margin-top: 64px; opacity: 0;">
            <span style="width: 18px; height: 18px; border-radius: 50%; background: var(--color-accent);"></span>
            <span style="font-family: var(--font-body); font-weight: 600; font-size: 48px; letter-spacing: -0.02em;">Dutyholder</span>
          </div>
        </div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (r: string) => host?.querySelector(`[data-ref="${r}"]`) as HTMLElement;
		const opts = { fill: "forwards" as const, easing: "cubic-bezier(0.22, 1, 0.36, 1)", duration: 650 };
		const rise = [
			{ opacity: 0, transform: "translateY(20px)" },
			{ opacity: 1, transform: "translateY(0)" },
		];
		q("headline").animate(rise, opts);
		q("brand").animate(rise, { ...opts, delay: 600 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
