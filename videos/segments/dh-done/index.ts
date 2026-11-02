import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import done from "../../videos/dutyholder_tasks/assets/screens/09-tasks-done.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-done",
	advances: [2.6, 7.6],
	voiceover:
		"And that's it, you're done for now. Whoever appointed you reviews your statement, and you'll hear from them if anything else is needed.",

	mount(el) {
		screen = new AppScreen(el, "Step 8 / 9", [{ src: done, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 60, w: 864, h: 560 }, 1.4, 1);
		s.enter();
		s.say("4 of 4 done");
		const banner = s.ring({ x: 288, y: 250, w: 864, h: 54 }, 600);
		await ctx.waitForNext();
		s.unring(banner);
		s.say("Your statement now waits for review");
		s.ring({ x: 288, y: 392, w: 864, h: 64 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
