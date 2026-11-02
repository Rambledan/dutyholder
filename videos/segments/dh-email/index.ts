import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import email from "../../videos/dutyholder_tasks/assets/screens/01-email.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-email",
	advances: [2.4, 7.4, 9.6],
	voiceover:
		"It starts with an email from whoever appointed you. It explains why: under Part 2A, everyone who designs or builds must acknowledge their duties and show they're competent. Click Accept invite.",

	mount(el) {
		screen = new AppScreen(el, "Step 1 / 9", [
			{ src: email, url: "Your inbox" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "01-email");
		s.focus(pad(b.mail, 10), 1.3, 1);
		s.enter();
		s.say("An email from whoever appointed you");
		await ctx.waitForNext();
		s.say("Why: it's a legal duty under Part 2A");
		const why = s.ring(b.why, 200);
		await ctx.waitForNext();
		s.unring(why);
		s.say("Click Accept invite");
		s.ring(b.accept, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
