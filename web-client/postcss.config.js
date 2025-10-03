export default {
  plugins: {
    "@tailwindcss/postcss": {
      // Ensure CSS is generated for static export
      optimize: true,
    },
  },
};
