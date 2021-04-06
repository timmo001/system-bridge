import assert from "assert";
import app from "../../../src/api/app";

describe("filesystem service", () => {
  it("registered the service", () => {
    const service = app.service("filesystem");
    assert.ok(service, "Registered the service");
  });
});
