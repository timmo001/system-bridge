import recommendedEffect from "@timmo001/oxlint-rules/configs/recommended-effect";

export default {
  extends: [recommendedEffect],
  options: {
    typeAware: true,
    maxWarnings: 0,
  },
};
