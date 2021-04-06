import assert from "assert";
import app from "../../../src/api/app";

describe("bluetooth service", () => {
  it("registered the service", () => {
    const service = app.service("bluetooth");
    assert.ok(service, "Registered the service");
  });
});
