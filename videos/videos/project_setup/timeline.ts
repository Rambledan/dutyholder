import "../../styles/dutyholder/tokens.css";
import type { Timeline } from "videowright";

const timeline: Timeline = {
	meta: {
		title: "Setting up a project in Dutyholder",
	},
	segments: [
		{ id: "ps-intro" },
		{ id: "ps-signup", transition: "fade" },
		{ id: "ps-two-factor", transition: "fade" },
		{ id: "ps-new-project", transition: "fade" },
		{ id: "ps-help-marks", transition: "fade" },
		{ id: "ps-scoping", transition: "fade" },
		{ id: "ps-project-created", transition: "fade" },
		{ id: "ps-add-team", transition: "fade" },
		{ id: "ps-invite", transition: "fade" },
		{ id: "ps-checklists", transition: "fade" },
		{ id: "ps-dashboard", transition: "fade" },
		{ id: "ps-key-dates", transition: "fade" },
		{ id: "ps-outro", transition: "fade" },
	],
};
export default timeline;
