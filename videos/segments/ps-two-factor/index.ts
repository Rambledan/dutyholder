import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import twoFactor from "../../videos/project_setup/assets/screens/02-two-factor.png";
import recovery from "../../videos/project_setup/assets/screens/03-recovery-codes.png";

let screen: AppScreen | null = null;

// The QR code and recovery codes were blurred when the screens were captured.
export default defineSegment({
	id: "ps-two-factor",
	advances: [3.6, 7.5],
	voiceover:
		"Then turn on two-factor login with an authenticator app, and save your recovery codes somewhere safe.",

	mount(el) {
		screen = new AppScreen(el, "Step 2 / 10", [
			{ src: twoFactor, url: "dutyholder.vercel.app/mfa/setup" },
			{ src: recovery, url: "dutyholder.vercel.app/mfa/setup" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.focus({ x: 512, y: 300, w: 416, h: 330 }, 1.7, 1);
		s.say("Turn on two-factor login");
		s.ring({ x: 512, y: 591, w: 416, h: 32 }, 600);
		await ctx.waitForNext();
		s.show(1);
		s.focus({ x: 512, y: 346, w: 416, h: 166 }, 1.8, 1);
		s.say("Save your recovery codes");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
