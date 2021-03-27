import brightness from "brightness";

const value = Number(process.argv[2]);

if (value) {
  (async () => {
    await brightness.set(value);
  })();
}
