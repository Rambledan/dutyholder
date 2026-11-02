import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import questions from "../../videos/project_setup/assets/screens/07-new-project-questions.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-scoping",
	advances: [4.5, 9.0],
	voiceover:
		"A few scoping questions follow: is it higher-risk, is the client domestic, and how many contractors will there be? Your answers decide which duties apply to whom.",

	mount(el) {
		screen = new AppScreen(el, "Step 5 / 10", [
			{ src: questions, url: "dutyholder.vercel.app/projects/new", masks: [{ x: 300, y: 228, w: 340, h: 22 }] },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 300, y: 440, w: 620, h: 250 }, 1.6, 1);
		s.say("A few scoping questions");
		s.ring({ x: 300, y: 440, w: 620, h: 250 }, 600);
		await ctx.waitForNext();
		s.say("Your answers decide who gets which duties");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
