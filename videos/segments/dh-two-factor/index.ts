import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import twoFactor from "../../videos/dutyholder_tasks/assets/screens/03-two-factor.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-two-factor",
	advances: [5.5],
	voiceover:
		"Then turn on two-factor login with an authenticator app on your phone. It keeps your records secure.",

	mount(el) {
		screen = new AppScreen(el, "Step 3 / 9", [
			{ src: twoFactor, url: "dutyholder.vercel.app/mfa/enrol" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "03-two-factor");
		// The QR code was blurred when the screen was captured.
		s.focus(pad(union(b.qr, b.code), [20, 80]), 1.6, 1);
		s.enter();
		s.say("Turn on two-factor login");
		s.ring(b.code, 700);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
