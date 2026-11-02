import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import task from "../../videos/dutyholder_tasks/assets/screens/08-report-change.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-report-change",
	advances: [2.6, 4.4, 6.0],
	voiceover:
		"You'll also agree to tell whoever appointed you if you ever stop being competent for the work. Tick, sign, done.",

	mount(el) {
		screen = new AppScreen(el, "Step 7 / 9", [{ src: task, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 110, w: 864, h: 350 }, 1.5, 1);
		s.enter();
		s.say("Agree to report a change in competence");
		const duty = s.ring({ x: 304, y: 178, w: 832, h: 46 }, 600);
		await ctx.waitForNext();
		s.unring(duty);
		s.say("Tick and sign");
		const sign = s.ring({ x: 304, y: 255, w: 832, h: 110 }, 200);
		await ctx.waitForNext();
		s.unring(sign);
		s.say("Done");
		s.ring({ x: 304, y: 404, w: 140, h: 36 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
