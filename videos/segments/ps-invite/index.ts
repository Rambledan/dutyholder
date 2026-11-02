import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import team from "../../videos/project_setup/assets/screens/10-team-invite.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-invite",
	advances: [3.4, 7.0],
	voiceover:
		"Click Invite, and each person gets an email with a secure link. You can see who has joined and who hasn't.",

	mount(el) {
		screen = new AppScreen(el, "Step 8 / 10", [{ src: team, url: "dutyholder.vercel.app/projects/the-old-mill" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 304, y: 195, w: 832, h: 370 }, 1.4, 1);
		s.say("Invite each person with one click");
		const button = s.ring({ x: 910, y: 366, w: 55, h: 28 }, 500);
		await ctx.waitForNext();
		s.unring(button);
		s.say("See who has joined, and who hasn't");
		s.ring({ x: 304, y: 288, w: 832, h: 65 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
