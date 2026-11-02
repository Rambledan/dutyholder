import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import competence from "../../videos/dutyholder_tasks/assets/screens/07-competence-full.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-competence",
	advances: [3.4, 7.0, 10.4, 14.2, 17.0],
	voiceover:
		"The competence statement takes longest. It belongs to you, not the project. Describe your skills, knowledge and experience, and how you'd handle work that wouldn't comply. Upload your evidence: qualifications, memberships and insurance. Then submit it for review.",

	mount(el) {
		screen = new AppScreen(el, "Step 6 / 9", [
			{ src: competence, height: manifest.screens["07-competence-full"].height, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "07-competence-full");
		s.focus(pad(b.intro, [20, 140]), 1.4, 1);
		s.enter();
		s.say("Your competence statement belongs to you");
		const intro = s.ring(b.intro, 600);
		await ctx.waitForNext();
		s.unring(intro);
		s.focus(pad(union(b.skills, b.experience), [0, 60]), 1.35, 1200);
		s.say("Skills, knowledge and experience");
		await ctx.waitForNext();
		s.focus(pad(union(b.behaviours, b.limits), [0, 60]), 1.35, 1200);
		s.say("How you'd handle non-compliant work");
		await ctx.waitForNext();
		const files = { x: b.evidence.x, y: b.files.y - 16, w: b.evidence.w, h: 130 };
		s.focus(pad(union(b.evidence, files), 20), 1.5, 1200);
		s.say("Upload your evidence");
		const ring = s.ring(files, 1100);
		await ctx.waitForNext();
		s.unring(ring);
		s.focus({ x: b.evidence.x, y: b.submit.y - 180, w: b.evidence.w, h: 260 }, 1.5, 1000);
		s.say("Submit for review");
		s.ring(b.submit, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
