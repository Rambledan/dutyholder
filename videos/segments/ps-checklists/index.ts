import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import full from "../../videos/project_setup/assets/screens/11-project-full.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-checklists",
	advances: [3.0, 8.0],
	voiceover:
		"Dutyholder builds everyone's checklist for you: acknowledgements, competence statements and evidence, all tied to the regulations.",

	mount(el) {
		screen = new AppScreen(el, "Step 9 / 11", [
			{ src: full, height: manifest.screens["11-project-full"].height, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "11-project-full");
		s.focus(pad(union(b.checklists, b.alex), 20), 1.35, 1);
		s.enter();
		s.say("Everyone's checklist, built for you");
		s.ring(b.alex, 500);
		await ctx.waitForNext();
		s.focus(pad(b.priya, 20), 1.15, 1400);
		s.say("Each duty tied to its regulation");
		s.ring(b.priya, 1300);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
