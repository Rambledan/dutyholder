import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import questions from "../../videos/project_setup/assets/screens/07-new-project-questions.png";
import created from "../../videos/project_setup/assets/screens/08-project-created.png";

const q = boxes(manifest, "07-new-project-questions");

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-project-created",
	advances: [1.6, 4.5],
	voiceover:
		"Create the project, and the set-up is summarised at the top.",

	mount(el) {
		screen = new AppScreen(el, "Step 6 / 11", [
			{ src: questions, url: "dutyholder.vercel.app/projects/new" },
			{ src: created, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const c = boxes(manifest, "08-project-created");
		s.enter();
		s.focus(union(q.contractors, { ...q.create, w: 814 }), 1.55, 1);
		s.say("Create project");
		s.ring(q.create, 400);
		await ctx.waitForNext();
		s.show(1);
		s.focus(pad(union(c.title, c.setup), 20), 1.3, 1);
		s.say("Your set-up, summarised");
		s.ring(c.setup, 500);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
