import type { Feature } from "./types";

export const FEATURES: Feature[] = [
	{
		icon: "zap",
		labelKey: "landing.featureInstantLabel",
		descKey: "landing.featureInstantDesc",
	},
	{
		icon: "copy",
		labelKey: "landing.featurePlainLabel",
		descKey: "landing.featurePlainDesc",
	},
	{
		icon: "shield",
		labelKey: "landing.featureEphemeralLabel",
		descKey: "landing.featureEphemeralDesc",
	},
];

export const TAG_KEYS = [
	"landing.tagPlain",
	"landing.tagInstant",
	"landing.tagNoAccount",
	"landing.tagExpiry",
];
