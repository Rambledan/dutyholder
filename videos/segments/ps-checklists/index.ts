import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import full from "../../videos/project_setup/assets/screens/11-project-full.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-checklists",
	advances: [3.0, 8.0],
	voiceover:
		"Dutyholder builds everyone's checklist for you: acknowledgements, competence statements and evidence, all tied to the regulations.",

	mount(el) {
		screen = new AppScreen(el, "Step 9 / 10", [
			{ src: full, height: 4534, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 1850, w: 864, h: 560 }, 1.4, 1);
		s.enter();
		s.say("Everyone's checklist, built for you");
		s.ring({ x: 288, y: 1905, w: 864, h: 490 }, 500);
		await ctx.waitForNext();
		s.focus({ x: 288, y: 2424, w: 864, h: 722 }, 1.2, 1400);
		s.say("Each duty tied to its regulation");
		s.ring({ x: 288, y: 2424, w: 864, h: 722 }, 1300);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
