import { PREMIUM_FEATURES } from "../constants/premiumFeatures.js";

export function FeaturesSection() {
  return (
    <div className="data">
      {PREMIUM_FEATURES.map((feature, index) => (
        <div key={index} className="description">
          <p dangerouslySetInnerHTML={{ __html: feature.title }}></p>
          <small dangerouslySetInnerHTML={{ __html: feature.description }}></small>
        </div>
      ))}
    </div>
  );
}