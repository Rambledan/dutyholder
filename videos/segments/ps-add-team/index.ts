import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import addMember from "../../videos/project_setup/assets/screens/09-add-member.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-add-team",
	advances: [5.5, 8.5],
	voiceover:
		"Next, add your team under their statutory roles: the client, designers and their disciplines, and the principal contractor. A firm can hold an appointment too.",

	mount(el) {
		screen = new AppScreen(el, "Step 7 / 10", [
			{ src: addMember, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "09-add-member");
		s.enter();
		s.focus(pad(b.form, 20), 1.5, 1);
		s.say("Add people under their statutory roles");
		await ctx.waitForNext();
		s.say("A firm can hold an appointment too");
		s.ring(pad(b.firm, [4, 2]), 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
