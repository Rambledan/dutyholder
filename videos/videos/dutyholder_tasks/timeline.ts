import "../../styles/dutyholder/tokens.css";
import type { Timeline } from "videowright";

const timeline: Timeline = {
	meta: {
		title: "Your Part 2A duties in Dutyholder",
	},
	segments: [
		{ id: "dh-intro" },
		{ id: "dh-email", transition: "fade" },
		{ id: "dh-signup", transition: "fade" },
		{ id: "dh-two-factor", transition: "fade" },
		{ id: "dh-tasks", transition: "fade" },
		{ id: "dh-acknowledge", transition: "fade" },
		{ id: "dh-competence", transition: "fade" },
		{ id: "dh-report-change", transition: "fade" },
		{ id: "dh-done", transition: "fade" },
		{ id: "dh-passport", transition: "fade" },
		{ id: "dh-outro", transition: "fade" },
	],
};
export default timeline;
