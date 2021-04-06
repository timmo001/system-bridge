import assert from "assert";
import app from "../../../src/api/app";

describe("memory service", () => {
  it("registered the service", () => {
    const service = app.service("memory");
    assert.ok(service, "Registered the service");
  });memory
});
