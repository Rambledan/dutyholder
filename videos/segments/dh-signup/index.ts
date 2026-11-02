import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import signup from "../../videos/dutyholder_tasks/assets/screens/02-signup.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-signup",
	advances: [2.4, 5.6],
	voiceover: "Your email is already filled in. Add your name and a password to create your account.",

	mount(el) {
		screen = new AppScreen(el, "Step 2 / 9", [{ src: signup, url: "dutyholder.vercel.app/signup" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 512, y: 244, w: 416, h: 514 }, 1.6, 1);
		s.enter();
		s.say("Your email is already filled in");
		const email = s.ring({ x: 512, y: 266, w: 416, h: 32 }, 500);
		await ctx.waitForNext();
		s.unring(email);
		s.say("Add your name and a password");
		s.ring({ x: 512, y: 726, w: 416, h: 32 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
