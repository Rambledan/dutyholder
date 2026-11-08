import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/01-overview.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-overview",
	advances: [4, 7.5],
	voiceover:
		"Every relevant requirement is listed by Part. Assign by discipline fills in the usual owner for each row.",

	mount(el) {
		screen = new AppScreen(el, "Step 1 / 7", [
			{ src: shot, height: manifest.screens["01-overview"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker?view=all" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "01-overview");
		s.enter();
		s.focus(pad(b.grid, 20), 1.15, 1);
		s.say("Every requirement, by Part");
		s.ring(b.grid, 500);
		await ctx.waitForNext();
		s.focus(pad(b.assign, 20), 1.6, 1000);
		s.say("Assign by discipline");
		s.ring(b.assign, 1000);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
