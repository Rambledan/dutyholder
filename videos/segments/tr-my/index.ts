import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/04-my-requirements.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-my",
	advances: [5],
	voiceover:
		"Each designer gets a list of just their own requirements.",

	mount(el) {
		screen = new AppScreen(el, "Step 4 / 7", [
			{ src: shot, height: manifest.screens["04-my-requirements"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "04-my-requirements");
		s.enter();
		s.focus(pad(b.list, 20), 1.2, 1);
		s.say("My requirements");
		s.ring(b.list, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
