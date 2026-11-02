import { defineSegment } from "videowright";
import { AppScreen } from "../../components/app-screen";
import tasks from "../../videos/dutyholder_tasks/assets/screens/04-tasks.png";

let screen: AppScreen | null = null;

export default defineSegment({
	id: "dh-tasks",
	advances: [4.8, 6.6],
	voiceover:
		"You land on your tasks for the project. Each one is a legal duty, and you can see your progress as you go. Click Start.",

	mount(el) {
		screen = new AppScreen(el, "Step 4 / 9", [{ src: tasks, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" }]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		s.focus({ x: 288, y: 60, w: 864, h: 540 }, 1.4, 1);
		s.enter();
		s.say("Your duties on this project");
		const list = s.ring({ x: 288, y: 314, w: 864, h: 277 }, 600);
		await ctx.waitForNext();
		s.unring(list);
		s.say("Click Start");
		s.ring({ x: 288, y: 250, w: 507, h: 40 }, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
