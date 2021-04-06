import assert from "assert";
import app from "../../../src/api/app";

describe("network service", () => {
  it("registered the service", () => {
    const service = app.service("network");
    assert.ok(service, "Registered the service");
  });
});
