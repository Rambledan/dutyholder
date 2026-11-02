import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import created from "../../videos/project_setup/assets/screens/08-project-created.png";
import questions from "../../videos/project_setup/assets/screens/07-new-project-questions.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-project-created",
	advances: [1.6, 4.5],
	voiceover: "Create the project, and the set-up is summarised at the top.",

	mount(el) {
		screen = new AppScreen(el, "Step 6 / 10", [
			{ src: questions, url: "dutyholder.vercel.app/projects/new", masks: [{ x: 300, y: 228, w: 340, h: 22 }] },
			{ src: created, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 290, y: 700, w: 600, h: 180 }, 1.6, 1);
		s.say("Create project");
		s.ring({ x: 304, y: 820, w: 115, h: 32 }, 400);
		await ctx.waitForNext();
		s.show(1);
		s.focus({ x: 288, y: 60, w: 864, h: 370 }, 1.4, 1);
		s.say("Your set-up, summarised");
		s.ring({ x: 288, y: 145, w: 864, h: 285 }, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
