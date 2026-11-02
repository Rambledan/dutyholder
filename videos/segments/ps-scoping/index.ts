import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import questions from "../../videos/project_setup/assets/screens/07-new-project-questions.png";

const q = boxes(manifest, "07-new-project-questions");

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-scoping",
	advances: [4.5, 9.0],
	voiceover:
		"A few scoping questions follow: is it higher-risk, is the client domestic, and how many contractors will there be? Your answers decide which duties apply to whom.",

	mount(el) {
		screen = new AppScreen(el, "Step 5 / 10", [
			{ src: questions, url: "dutyholder.vercel.app/projects/new", masks: [pad(q.devNote, [4, 3])] },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const block = pad(union(q.firstQuestion, q.lastAnswer, { ...q.firstQuestion, w: 620 }), 8);
		s.enter();
		s.focus(pad(block, 30), 1.5, 1);
		s.say("A few scoping questions");
		s.ring(block, 600);
		await ctx.waitForNext();
		s.say("Your answers decide who gets which duties");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
