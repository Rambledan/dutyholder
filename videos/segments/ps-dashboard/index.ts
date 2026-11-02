import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import dashboard from "../../videos/project_setup/assets/screens/12-dashboard.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-dashboard",
	advances: [3.6, 7.5],
	voiceover:
		"The dashboard shows each person's progress in red, amber and green. Reminders go out automatically, so you don't have to chase.",

	mount(el) {
		screen = new AppScreen(el, "Step 10 / 10", [
			{ src: dashboard, height: 915, url: "dutyholder.vercel.app/projects/the-old-mill/dashboard" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 304, y: 388, w: 832, h: 451 }, 1.3, 1);
		s.say("Progress at a glance: red, amber, green");
		await ctx.waitForNext();
		s.say("Reminders go out automatically");
		s.ring({ x: 304, y: 388, w: 832, h: 451 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
