import { defineSegment } from "videowright";
import { AppScreen, boxes, pad, union } from "../../components/app-screen";
import manifest from "../../videos/dutyholder_tasks/assets/screens/manifest.json";
import tasks from "../../videos/dutyholder_tasks/assets/screens/04-tasks.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "dh-tasks",
	advances: [4.8, 6.6],
	voiceover:
		"You land on your tasks for the project. Each one is a legal duty, and you can see your progress as you go. Click Start.",

	mount(el) {
		screen = new AppScreen(el, "Step 4 / 9", [
			{ src: tasks, url: "dutyholder.vercel.app/projects/the-old-mill/tasks" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "04-tasks");
		s.focus(pad(union(b.progress, b.list), 20), 1.35, 1);
		s.enter();
		s.say("Your duties on this project");
		const list = s.ring(b.list, 600);
		await ctx.waitForNext();
		s.unring(list);
		s.say("Click Start");
		s.ring(b.start, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
