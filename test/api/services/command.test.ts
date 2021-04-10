import assert from "assert";

import app from "../../../src/api/app";

describe("command service", () => {
  it("registered the service", () => {
    const service = app.service("command");
    assert.ok(service, "Registered the service");
  });
});
