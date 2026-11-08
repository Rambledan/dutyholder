import "../../styles/dutyholder/tokens.css";
import type { Timeline } from "videowright";

const timeline: Timeline = {
	meta: {
		title: "The requirements tracker in Dutyholder",
	},
	segments: [
		{ id: "tr-intro" },
		{ id: "tr-overview", transition: "fade" },
		{ id: "tr-assign", transition: "fade" },
		{ id: "tr-relevance", transition: "fade" },
		{ id: "tr-my", transition: "fade" },
		{ id: "tr-answer", transition: "fade" },
		{ id: "tr-progress", transition: "fade" },
		{ id: "tr-evidence", transition: "fade" },
		{ id: "tr-outro", transition: "fade" },
	],
};
export default timeline;
