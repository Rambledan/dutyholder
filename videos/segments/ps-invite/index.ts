import { defineSegment } from "videowright";
import { AppScreen, boxes, pad } from "../../components/app-screen";
import manifest from "../../videos/project_setup/assets/screens/manifest.json";
import team from "../../videos/project_setup/assets/screens/10-team-invite.png";

let screen: AppScreen | null = null;

// Zoom and highlight areas come from the boxes the capture script recorded.
export default defineSegment({
	id: "ps-invite",
	advances: [3.4, 7.0],
	voiceover:
		"Click Invite, and each person gets an email with a secure link. You can see who has joined and who hasn't.",

	mount(el) {
		screen = new AppScreen(el, "Step 8 / 11", [
			{ src: team, url: "dutyholder.vercel.app/projects/the-old-mill" },
		]);
	},

	async play(ctx) {
		const s = screen as AppScreen;
		await s.ready();
		const b = boxes(manifest, "10-team-invite");
		s.enter();
		s.focus(pad(b.team, 20), 1.35, 1);
		s.say("Invite each person with one click");
		const button = s.ring(b.inviteButton, 500);
		await ctx.waitForNext();
		s.unring(button);
		s.say("See who has joined, and who hasn't");
		s.ring(b.invite, 200);
		await ctx.waitForNext();
	},

	unmount() {
		screen = null;
	},
});
