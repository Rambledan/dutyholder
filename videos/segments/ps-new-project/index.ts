import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import home from "../../videos/project_setup/assets/screens/04-home.png";
import newProject from "../../videos/project_setup/assets/screens/05-new-project.png";

let screen: AppScreen | null = null;

// The mask hides a developer note under the description field.
export default defineSegment({
	id: "ps-new-project",
	advances: [2.6, 7.0],
	voiceover:
		"From your projects page, click New project. Give it a name, a site address and a short description.",

	mount(el) {
		screen = new AppScreen(el, "Step 3 / 10", [
			{ src: home, url: "dutyholder.vercel.app" },
			{ src: newProject, url: "dutyholder.vercel.app/projects/new", masks: [{ x: 300, y: 393, w: 340, h: 22 }] },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 280, y: 60, w: 880, h: 240 }, 1.5, 1);
		s.say("Click New project");
		s.ring({ x: 971, y: 132, w: 101, h: 32 }, 500);
		await ctx.waitForNext();
		s.show(1);
		s.focus({ x: 290, y: 80, w: 860, h: 320 }, 1.5, 1);
		s.say("Name, site and a short description");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
