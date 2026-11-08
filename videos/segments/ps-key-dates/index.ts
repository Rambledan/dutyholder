import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import shot from "../../videos/project_setup/assets/screens/13-key-dates.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-key-dates",
	advances: [3.5, 7.5],
	voiceover:
		"Key dates start the legal clocks. Construction can't be recorded as started until both principal appointments are signed.",

	mount(el) {
		screen = new AppScreen(el, "Step 11 / 11", [
			{ src: shot, height: manifest.screens["13-key-dates"].height, url: "dutyholder.vercel.app/projects/the-old-mill/dates" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "13-key-dates");
		s.enter();
		s.focus(pad(b.heading, 20), 1.2, 1);
		s.say("Each date starts a legal clock");
		s.ring(b.heading, 500);
		await ctx.waitForNext();
		s.focus(pad(b.blocked, 20), 1.5, 1000);
		s.say("Appointments signed first");
		s.ring(b.blocked, 1000);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
