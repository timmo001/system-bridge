const electronIsDev = async (): Promise<boolean> => {
  try {
    return (await import("electron-is-dev")).default;
  } catch (e) {
    return false;
  }
};

export default electronIsDev;
