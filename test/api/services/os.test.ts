import assert from "assert";
import app from "../../../src/api/app";

describe("os service", () => {
  it("registered the service", () => {
    const service = app.service("os");
    assert.ok(service, "Registered the service");
  });
});
