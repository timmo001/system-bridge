import assert from "assert";

import app from "../../../src/api/app";

describe("open service", () => {
  it("registered the service", () => {
    const service = app.service("open");
    assert.ok(service, "Registered the service");
  });
});
