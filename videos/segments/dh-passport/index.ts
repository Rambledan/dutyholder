import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import account from "../../videos/dutyholder_tasks/assets/screens/10-account.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-passport",
	advances: [3.4, 7.4],
	voiceover:
		"Your details and competence statement are saved to your account. Next time someone invites you, reuse them in one click.",

	mount(el) {
		screen = new AppScreen(el, "Step 9 / 9", [
			{ src: account, height: manifest.screens["10-account"].height, url: "dutyholder.vercel.app/account" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "10-account");
		s.focus(pad(b.details, [20, 100]), 1.2, 1);
		s.enter();
		s.say("One sign-in, saved details");
		await ctx.waitForNext();
		s.focus(pad(union(b.passport, b.partners), 20), 1.35, 1200);
		s.say("Reuse your statement on the next project");
		s.ring(b.passport, 1100);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
