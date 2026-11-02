import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

export default defineSegment({
	id: "dutyholder-sample-title",
	advances: [3.0],
	voiceover: "Dutyholder keeps every Part 2A appointment, acknowledgement and competence record in one place.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; background: var(--color-bg); color: var(--color-fg); overflow: hidden;">
        <div style="position: absolute; left: var(--safe-x); right: var(--safe-x); top: 50%; transform: translateY(-50%);">
          <div data-ref="label" style="font-family: var(--font-mono); font-size: 22px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-muted); margin-bottom: 40px; opacity: 0;">Building Regulations · Part 2A</div>
          <div data-ref="headline" style="font-family: var(--font-display); font-weight: 600; font-size: 104px; line-height: 1.02; letter-spacing: -0.03em; max-width: 1400px; opacity: 0;">
            Dutyholder records,<br/><span style="color: var(--color-accent);">without the chasing.</span>
          </div>
          <div data-ref="sub" style="font-family: var(--font-body); font-size: 38px; color: var(--color-muted); margin-top: 44px; opacity: 0;">Appointments, acknowledgements and competence evidence in one place.</div>
        </div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (r: string) => host?.querySelector(`[data-ref="${r}"]`) as HTMLElement;
		const opts = { fill: "forwards" as const, easing: "cubic-bezier(0.22, 1, 0.36, 1)", duration: 600 };
		const rise = [
			{ opacity: 0, transform: "translateY(20px)" },
			{ opacity: 1, transform: "translateY(0)" },
		];
		q("label").animate([{ opacity: 0 }, { opacity: 1 }], opts);
		q("headline").animate(rise, { ...opts, delay: 150 });
		q("sub").animate(rise, { ...opts, delay: 450 });
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
