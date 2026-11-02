import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import task from "../../videos/dutyholder_tasks/assets/screens/05-acknowledge.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-acknowledge",
	advances: [3.6, 6.4, 10.0],
	voiceover:
		"Most tasks are acknowledgements. Read the duty in plain English, tick to confirm, and type your name to sign. Dutyholder records when you signed, and the exact wording you agreed to.",

	mount(el) {
		screen = new AppScreen(el, "Step 5 / 9", [{ src: task, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 110, w: 864, h: 350 }, 1.5, 1);
		s.enter();
		s.say("Read the duty in plain English");
		const duty = s.ring({ x: 304, y: 178, w: 832, h: 46 }, 600);
		await ctx.waitForNext();
		s.unring(duty);
		s.say("Tick, and type your name to sign");
		const sign = s.ring({ x: 304, y: 255, w: 832, h: 110 }, 200);
		await ctx.waitForNext();
		s.unring(sign);
		s.say("Your signature and the wording are recorded");
		s.ring({ x: 304, y: 404, w: 140, h: 36 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
