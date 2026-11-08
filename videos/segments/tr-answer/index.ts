import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/05-answer.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-answer",
	advances: [5.5],
	voiceover:
		"The designer writes their own project-specific answer. The principal designer can't write it for them.",

	mount(el) {
		screen = new AppScreen(el, "Step 5 / 7", [
			{ src: shot, height: manifest.screens["05-answer"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker/b1" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "05-answer");
		s.enter();
		s.focus(pad(b.application, 20), 1.4, 1);
		s.say("Written by the responsible designer");
		s.ring(b.application, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
