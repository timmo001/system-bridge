import assert from "assert";
import app from "../../../src/api/app";

describe("graphics service", () => {
  it("registered the service", () => {
    const service = app.service("graphics");
    assert.ok(service, "Registered the service");
  });
});
