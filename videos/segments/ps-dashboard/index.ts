import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import dashboard from "../../videos/project_setup/assets/screens/12-dashboard.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-dashboard",
	advances: [3.6, 7.5],
	voiceover:
		"The dashboard shows each person's progress in red, amber and green. Reminders go out automatically, so you don't have to chase.",

	mount(el) {
		screen = new AppScreen(el, "Step 10 / 11", [
			{ src: dashboard, height: manifest.screens["12-dashboard"].height, url: "dutyholder.vercel.app/projects/the-old-mill/dashboard" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "12-dashboard");
		s.enter();
		s.focus(pad(b.stats, 20), 1.25, 1);
		s.say("Progress at a glance");
		s.ring(b.stats, 500);
		await ctx.waitForNext();
		s.focus(pad(b.grid, 20), 1.3, 1100);
		s.say("Reminders go out automatically");
		s.ring(b.grid, 1000);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
