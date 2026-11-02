import { defineSegment } from "videowright";

let host: HTMLElement | null = null;

// A browser frame, a green highlight ring and a caption pill. The frame holds
// a plain placeholder here; real videos put an app screenshot inside it.
export default defineSegment({
	id: "dutyholder-sample-ui-showcase",
	advances: [2.0, 4.0],
	voiceover: "Real app screens sit in a light browser frame. A green ring shows where to look, and a caption explains the step.",

	mount(el) {
		host = el;
		el.innerHTML = `
      <div style="position: relative; height: 100%; background: var(--color-bg); color: var(--color-fg); overflow: hidden;">
        <div data-ref="step" style="position: absolute; left: var(--safe-x); top: 64px; font-family: var(--font-mono); font-size: 22px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--color-muted); opacity: 0;">Step 2 / 6</div>
        <div data-ref="frame" style="position: absolute; left: 50%; top: 130px; width: 1500px; height: 820px; margin-left: -750px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-frame); overflow: hidden; opacity: 0;">
          <div style="height: 52px; border-bottom: 1px solid var(--color-border); display: flex; align-items: center; gap: 10px; padding: 0 22px;">
            <span style="width: 14px; height: 14px; border-radius: 50%; background: var(--color-border);"></span>
            <span style="width: 14px; height: 14px; border-radius: 50%; background: var(--color-border);"></span>
            <span style="width: 14px; height: 14px; border-radius: 50%; background: var(--color-border);"></span>
            <span style="margin-left: 24px; font-family: var(--font-mono); font-size: 18px; color: var(--color-muted);">dutyholder.vercel.app</span>
          </div>
          <div style="padding: 64px 120px; display: flex; flex-direction: column; gap: 28px;">
            <div style="height: 40px; width: 420px; border-radius: 8px; background: #f0efed;"></div>
            <div style="height: 24px; width: 760px; border-radius: 6px; background: #f3f2f0;"></div>
            <div data-ref="target" style="position: relative; height: 64px; width: 980px; border-radius: var(--radius-md); border: 1px solid var(--color-border);"></div>
            <div style="height: 24px; width: 640px; border-radius: 6px; background: #f3f2f0;"></div>
            <div style="height: 52px; width: 200px; border-radius: var(--radius-md); background: var(--color-fg);"></div>
          </div>
        </div>
        <div data-ref="ring" style="position: absolute; left: 330px; top: 394px; width: 996px; height: 80px; border: 4px solid var(--color-accent); border-radius: 16px; opacity: 0;"></div>
        <div data-ref="caption" style="position: absolute; left: 50%; bottom: 56px; transform: translateX(-50%); background: var(--color-fg); color: #fff; font-family: var(--font-body); font-size: 34px; padding: 18px 34px; border-radius: 999px; white-space: nowrap; opacity: 0;">Answer a few questions about the project</div>
      </div>
    `;
	},

	async play(ctx) {
		const q = (r: string) => host?.querySelector(`[data-ref="${r}"]`) as HTMLElement;
		const ease = "cubic-bezier(0.22, 1, 0.36, 1)";
		q("step").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, fill: "forwards", easing: ease });
		q("frame").animate(
			[
				{ opacity: 0, transform: "scale(0.96)" },
				{ opacity: 1, transform: "scale(1)" },
			],
			{ duration: 700, fill: "forwards", easing: ease },
		);
		await ctx.waitForNext();
		q("ring").animate(
			[
				{ opacity: 0, transform: "scale(1.04)" },
				{ opacity: 1, transform: "scale(1)" },
			],
			{ duration: 500, fill: "forwards", easing: ease },
		);
		q("caption").animate(
			[
				{ opacity: 0, transform: "translate(-50%, 24px)" },
				{ opacity: 1, transform: "translate(-50%, 0)" },
			],
			{ duration: 500, delay: 200, fill: "forwards", easing: ease },
		);
		await ctx.waitForNext();
	},

	unmount() {
		host = null;
	},
});
