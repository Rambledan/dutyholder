import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import account from "../../videos/dutyholder_tasks/assets/screens/10-account.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-passport",
	advances: [3.4, 7.4],
	voiceover:
		"Your details and competence statement are saved to your account. Next time someone invites you, reuse them in one click.",

	mount(el) {
		screen = new AppScreen(el, "Step 9 / 9", [
			{ src: account, height: 1096, url: "dutyholder.vercel.app/account" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 80, w: 864, h: 560 }, 1.3, 1);
		s.enter();
		s.say("One sign-in, saved details");
		await ctx.waitForNext();
		s.focus({ x: 288, y: 630, w: 864, h: 450 }, 1.4, 1200);
		s.say("Reuse your statement on the next project");
		s.ring({ x: 288, y: 650, w: 864, h: 178 }, 1100);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
