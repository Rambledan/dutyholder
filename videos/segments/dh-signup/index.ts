import { defineSegment } from "videowright";
import { AppScreen, boxes } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import signup from "../../videos/dutyholder_tasks/assets/screens/02-signup.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-signup",
	advances: [2.4, 5.6],
	voiceover:
		"Your email is already filled in. Add your name and a password to create your account.",

	mount(el) {
		screen = new AppScreen(el, "Step 2 / 9", [
			{ src: signup, url: "dutyholder.vercel.app/signup" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "02-signup");
		s.focus(b.form, 1.5, 1);
		s.enter();
		s.say("Your email is already filled in");
		const email = s.ring(b.email, 500);
		await ctx.waitForNext();
		s.unring(email);
		s.say("Add your name and a password");
		s.ring(b.create, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
