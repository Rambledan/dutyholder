import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import addMember from "../../videos/project_setup/assets/screens/09-add-member.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-add-team",
	advances: [5.5, 8.5],
	voiceover:
		"Next, add your team under their statutory roles: the client, designers and their disciplines, and the principal contractor. A firm can hold an appointment too.",

	mount(el) {
		screen = new AppScreen(el, "Step 7 / 10", [{ src: addMember, url: "dutyholder.vercel.app/projects/the-old-mill" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 304, y: 242, w: 832, h: 210 }, 1.5, 1);
		s.say("Add people under their statutory roles");
		await ctx.waitForNext();
		s.say("A firm can hold an appointment too");
		s.ring({ x: 305, y: 386, w: 365, h: 18 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
