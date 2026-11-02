import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import signup from "../../videos/project_setup/assets/screens/01-signup.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "ps-signup",
	advances: [2.2, 6.0],
	voiceover: "You start from an invite. Create your account with your name and a strong password.",

	mount(el) {
		screen = new AppScreen(el, "Step 1 / 10", [{ src: signup, url: "dutyholder.vercel.app/signup" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.enter();
		s.say("Start from your invite");
		await ctx.waitForNext();
		s.focus({ x: 512, y: 244, w: 416, h: 514 }, 1.6);
		s.say("Create your account");
		s.ring({ x: 512, y: 726, w: 416, h: 32 }, 900);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
