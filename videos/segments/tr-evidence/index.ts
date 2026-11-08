import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/tracker/assets/screens/manifest.json";
import shot from "../../videos/tracker/assets/screens/07-evidence.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "tr-evidence",
	advances: [4.5],
	voiceover:
		"And the tracker goes into the evidence pack, with the audit trail.",

	mount(el) {
		screen = new AppScreen(el, "Step 7 / 7", [
			{ src: shot, height: manifest.screens["07-evidence"].height, url: "dutyholder.vercel.app/projects/the-old-mill/exports" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "07-evidence");
		s.enter();
		s.focus(pad(b.download, 20), 1.5, 1);
		s.say("Tracker in the evidence pack");
		s.ring(b.download, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
