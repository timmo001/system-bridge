const electronIsDev = (): boolean => {
  const getFromEnv = parseInt(process.env.ELECTRON_IS_DEV || "0", 10) === 1;
  const isDev = getFromEnv || process.env.NODE_ENV === "development";
  return isDev;
};

export default electronIsDev;
