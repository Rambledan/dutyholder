import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

export default defineSegment({
	id: "dh-intro",
	advances: [7.5],
	voiceover: "You've been named as a dutyholder on a building project. Here's what happens next, and how to get it done in about fifteen minutes.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; background: var(--color-bg); color: var(--color-fg); overflow: hidden;">
        <div style="position: absolute; left: var(--safe-x); right: var(--safe-x); top: 50%; transform: translateY(-50%);">
          <div data-ref="label" style="font-family: var(--font-mono); font-size: 24px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 44px; opacity: 0;">Dutyholder · for designers, contractors and clients</div>
          <div data-ref="headline" style="font-family: var(--font-display); font-weight: 600; font-size: 120px; line-height: 1.0; letter-spacing: -0.035em; opacity: 0;">
            Your Part 2A duties,<br/><span style="color: var(--color-accent);">done in 15 minutes.</span>
          </div>
          <div data-ref="sub" style="font-family: var(--font-body); font-size: 40px; color: var(--color-muted); margin-top: 48px; opacity: 0;">What to expect when you're invited to a project</div>
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
		q("label").animate([{ opacity: 0 }, { opacity: 1 }], opts);
		q("headline").animate(rise, { ...opts, delay: 150 });
		q("sub").animate(rise, { ...opts, delay: 500 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
