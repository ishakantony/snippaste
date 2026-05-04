import { FEATURES } from "./constants.js";
import { FeatureItem } from "./FeatureItem.js";

export function FeatureList() {
	return (
		<div className="flex flex-col gap-3">
			{FEATURES.map((f) => (
				<FeatureItem
					key={f.icon}
					icon={f.icon}
					labelKey={f.labelKey}
					descKey={f.descKey}
				/>
			))}
		</div>
	);
}
