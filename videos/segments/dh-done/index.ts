import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import done from "../../videos/dutyholder_tasks/assets/screens/09-tasks-done.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-done",
	advances: [2.6, 7.6],
	voiceover:
		"And that's it, you're done for now. Whoever appointed you reviews your statement, and you'll hear from them if anything else is needed.",

	mount(el) {
		screen = new AppScreen(el, "Step 8 / 9", [
			{ src: done, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "09-tasks-done");
		s.focus(pad(union({ ...b.done, y: b.done.y - 200 }, b.list), 20), 1.3, 1);
		s.enter();
		s.say("4 of 4 done");
		const banner = s.ring(b.done, 600);
		await ctx.waitForNext();
		s.unring(banner);
		s.say("Your statement now waits for review");
		s.ring(b.submitted, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
