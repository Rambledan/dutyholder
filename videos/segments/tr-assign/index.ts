import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/02-assigned.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-assign",
	advances: [5],
	voiceover:
		"Each row now has a responsible designer, and the principal designer can see any gaps.",

	mount(el) {
		screen = new AppScreen(el, "Step 2 / 7", [
			{ src: shot, height: manifest.screens["02-assigned"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker?view=all" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "02-assigned");
		s.enter();
		s.focus(pad(b.partB, 20), 1.25, 1);
		s.say("Every requirement has an owner");
		s.ring(b.partB, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
