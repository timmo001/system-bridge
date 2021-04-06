import assert from "assert";
import app from "../../../src/api/app";

describe("audio service", () => {
  it("registered the service", () => {
    console.log(app.services);
    const service = app.service("audio");
    console.log(service);
    assert.ok(service, "Registered the service");
  });
});
