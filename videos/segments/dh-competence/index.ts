import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import competence from "../../videos/dutyholder_tasks/assets/screens/07-competence-full.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-competence",
	advances: [3.4, 7.0, 10.4, 14.2, 17.0],
	voiceover:
		"The competence statement takes longest. It belongs to you, not the project. Describe your skills, knowledge and experience, and how you'd handle work that wouldn't comply. Upload your evidence: qualifications, memberships and insurance. Then submit it for review.",

	mount(el) {
		screen = new AppScreen(el, "Step 6 / 9", [
			{ src: competence, height: 1636, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 110, w: 864, h: 360 }, 1.4, 1);
		s.enter();
		s.say("Your competence statement belongs to you");
		const intro = s.ring({ x: 304, y: 256, w: 832, h: 30 }, 600);
		await ctx.waitForNext();
		s.unring(intro);
		s.focus({ x: 304, y: 330, w: 832, h: 400 }, 1.35, 1200);
		s.say("Skills, knowledge and experience");
		await ctx.waitForNext();
		s.focus({ x: 304, y: 750, w: 832, h: 420 }, 1.35, 1200);
		s.say("How you'd handle non-compliant work");
		await ctx.waitForNext();
		s.focus({ x: 304, y: 1180, w: 832, h: 230 }, 1.5, 1200);
		s.say("Upload your evidence");
		const files = s.ring({ x: 304, y: 1262, w: 832, h: 130 }, 1100);
		await ctx.waitForNext();
		s.unring(files);
		s.focus({ x: 304, y: 1420, w: 832, h: 180 }, 1.5, 1000);
		s.say("Submit for review");
		s.ring({ x: 304, y: 1526, w: 137, h: 36 }, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
