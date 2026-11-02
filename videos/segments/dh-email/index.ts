import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import email from "../../videos/dutyholder_tasks/assets/screens/01-email.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-email",
	advances: [2.4, 7.4, 9.6],
	voiceover:
		"It starts with an email from whoever appointed you. It explains why: under Part 2A, everyone who designs or builds must acknowledge their duties and show they're competent. Click Accept invite.",

	mount(el) {
		screen = new AppScreen(el, "Step 1 / 9", [{ src: email, url: "Your inbox" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 279, y: 40, w: 882, h: 660 }, 1.3, 1);
		s.enter();
		s.say("An email from whoever appointed you");
		await ctx.waitForNext();
		s.say("Why: it's a legal duty under Part 2A");
		const why = s.ring({ x: 320, y: 331, w: 560, h: 68 }, 200);
		await ctx.waitForNext();
		s.unring(why);
		s.say("Click Accept invite");
		s.ring({ x: 320, y: 487, w: 125, h: 47 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
