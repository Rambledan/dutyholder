import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import home from "../../videos/project_setup/assets/screens/04-home.png";
import newProject from "../../videos/project_setup/assets/screens/05-new-project.png";

const n = boxes(manifest, "05-new-project");

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-new-project",
	advances: [2.6, 7.0],
	voiceover:
		"From your projects page, click New project. Give it a name, a site address and a short description.",

	mount(el) {
		screen = new AppScreen(el, "Step 3 / 10", [
			{ src: home, url: "dutyholder.vercel.app" },
			{ src: newProject, url: "dutyholder.vercel.app/projects/new", masks: [pad(n.devNote, [4, 3])] },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const h = boxes(manifest, "04-home");
		s.enter();
		s.focus(pad(h.projects, 40), 1.4, 1);
		s.say("Click New project");
		s.ring(h.newProject, 500);
		await ctx.waitForNext();
		s.show(1);
		s.focus(pad(union(n.name, n.description), [20, 60]), 1.5, 1);
		s.say("Name, site and a short description");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
