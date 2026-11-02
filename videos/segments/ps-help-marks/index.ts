import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import helpMark from "../../videos/project_setup/assets/screens/06-help-mark.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-help-marks",
	advances: [1.5, 5.5],
	voiceover: "Not sure what a term means? Hover over any question mark for a plain-English explanation.",

	mount(el) {
		screen = new AppScreen(el, "Step 4 / 10", [
			{ src: helpMark, url: "dutyholder.vercel.app/projects/new", masks: [{ x: 300, y: 393, w: 340, h: 22 }] },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		await ctx.waitForNext();
		s.focus({ x: 300, y: 530, w: 380, h: 200 }, 1.9);
		s.say("Hover any ? for a plain-English explanation");
		s.ring({ x: 369, y: 539, w: 288, h: 160 }, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
