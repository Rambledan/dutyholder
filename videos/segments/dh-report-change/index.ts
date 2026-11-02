import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import task from "../../videos/dutyholder_tasks/assets/screens/08-report-change.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-report-change",
	advances: [2.6, 4.4, 6.0],
	voiceover:
		"You'll also agree to tell whoever appointed you if you ever stop being competent for the work. Tick, sign, done.",

	mount(el) {
		screen = new AppScreen(el, "Step 7 / 9", [{ src: task, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "08-report-change");
		s.focus(pad(union(b.title, b.button), 20), 1.5, 1);
		s.enter();
		s.say("Agree to report a change in competence");
		const duty = s.ring(b.duty, 600);
		await ctx.waitForNext();
		s.unring(duty);
		s.say("Tick and sign");
		const sign = s.ring(union(b.confirm, b.sign), 200);
		await ctx.waitForNext();
		s.unring(sign);
		s.say("Done");
		s.ring(b.button, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
