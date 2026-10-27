import "./dashboard-strategy";
import "./section-strategy";
import "./view-strategy";

const DOCUMENTATION_URL =
  "https://system-bridge.timmo.dev/using/home-assistant/#dashboard";

const STRATEGIES = [
  {
    strategyType: "dashboard",
    description:
      "Your computer's System Bridge data, laid out like the web client.",
  },
  {
    strategyType: "section",
    description: "One part of a System Bridge page, such as a GPU or a disk.",
  },
] as const;

window.customStrategies ??= [];

for (const { strategyType, description } of STRATEGIES) {
  if (
    !window.customStrategies.some(
      (strategy) =>
        strategy.type === "system-bridge" &&
        strategy.strategyType === strategyType,
    )
  ) {
    window.customStrategies.push({
      type: "system-bridge",
      name: "System Bridge",
      description,
      documentationURL: DOCUMENTATION_URL,
      strategyType,
    });
  }
}
