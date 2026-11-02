import { defineSegment } from "videowright";
import { AppScreen, boxes } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import signup from "../../videos/project_setup/assets/screens/01-signup.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-signup",
	advances: [2.2, 6.0],
	voiceover:
		"You start from an invite. Create your account with your name and a strong password.",

	mount(el) {
		screen = new AppScreen(el, "Step 1 / 10", [
			{ src: signup, url: "dutyholder.vercel.app/signup" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "01-signup");
		s.enter();
		s.say("Start from your invite");
		await ctx.waitForNext();
		s.focus(b.form, 1.5);
		s.say("Create your account");
		s.ring(b.createButton, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
