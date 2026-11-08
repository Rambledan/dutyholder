import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/03-not-relevant.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-relevance",
	advances: [3.5, 7.5],
	voiceover:
		"If a requirement doesn't apply, the principal designer records why.",

	mount(el) {
		screen = new AppScreen(el, "Step 3 / 7", [
			{ src: shot, height: manifest.screens["03-not-relevant"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tracker/e4" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "03-not-relevant");
		s.enter();
		s.focus(pad(b.requirement, 20), 1.2, 1);
		s.say("The requirement, in the law's words");
		s.ring(b.requirement, 500);
		await ctx.waitForNext();
		s.focus(pad(b.decision, 20), 1.3, 1000);
		s.say("Not relevant, with a reason");
		s.ring(b.decision, 1000);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
