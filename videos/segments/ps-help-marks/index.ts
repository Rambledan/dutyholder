import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import helpMark from "../../videos/project_setup/assets/screens/06-help-mark.png";

const h = boxes(manifest, "06-help-mark");

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-help-marks",
	advances: [1.5, 5.5],
	voiceover:
		"Not sure what a term means? Hover over any question mark for a plain-English explanation.",

	mount(el) {
		screen = new AppScreen(el, "Step 4 / 11", [
			{ src: helpMark, url: "dutyholder.vercel.app/projects/new" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		await ctx.waitForNext();
		s.focus(pad(union(h.popover, h.question), 20), 1.9);
		s.say("Hover any ? for a plain-English explanation");
		s.ring(h.popover, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
