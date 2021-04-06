import assert from "assert";
import app from "../../../src/api/app";

describe("cpu service", () => {
  it("registered the service", () => {
    const service = app.service("cpu");
    assert.ok(service, "Registered the service");
  });
});
