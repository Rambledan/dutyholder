import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import twoFactor from "../../videos/project_setup/assets/screens/02-two-factor.png";
import recovery from "../../videos/project_setup/assets/screens/03-recovery-codes.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-two-factor",
	advances: [3.6, 7.5],
	voiceover:
		"Then turn on two-factor login with an authenticator app, and save your recovery codes somewhere safe.",

	mount(el) {
		screen = new AppScreen(el, "Step 2 / 10", [
			{ src: twoFactor, url: "dutyholder.vercel.app/mfa/enrol" },
			{ src: recovery, url: "dutyholder.vercel.app/mfa/enrol" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "02-two-factor");
		const r = boxes(manifest, "03-recovery-codes");
		// The QR code and recovery codes were blurred when the screens were captured.
		s.enter();
		s.focus(pad(union(b.qr, b.code), [20, 80]), 1.6, 1);
		s.say("Turn on two-factor login");
		s.ring(b.code, 600);
		await ctx.waitForNext();
		s.show(1);
		s.focus(r.codes, 1.8, 1);
		s.say("Save your recovery codes");
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
