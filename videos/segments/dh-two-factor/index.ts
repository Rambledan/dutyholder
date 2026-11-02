import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import twoFactor from "../../videos/dutyholder_tasks/assets/screens/03-two-factor.png";

let screen: AppScreen | null = null;

// The QR code was blurred when the screen was captured.
export default defineSegment({
	id: "dh-two-factor",
	advances: [5.5],
	voiceover: "Then turn on two-factor login with an authenticator app on your phone. It keeps your records secure.",

	mount(el) {
		screen = new AppScreen(el, "Step 3 / 9", [{ src: twoFactor, url: "dutyholder.vercel.app/mfa/enrol" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 512, y: 260, w: 416, h: 400 }, 1.6, 1);
		s.enter();
		s.say("Turn on two-factor login");
		s.ring({ x: 512, y: 591, w: 416, h: 32 }, 700);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
