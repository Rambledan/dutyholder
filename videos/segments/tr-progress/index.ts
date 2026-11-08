import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/06-progress.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-progress",
	advances: [4.5],
	voiceover:
		"The principal designer sees progress across every Part.",

	mount(el) {
		screen = new AppScreen(el, "Step 6 / 7", [
			{ src: shot, height: manifest.screens["06-progress"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker?view=all" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "06-progress");
		s.enter();
		s.focus(pad(b.grid, 20), 1.15, 1);
		s.say("Progress across every Part");
		s.ring(b.grid, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
