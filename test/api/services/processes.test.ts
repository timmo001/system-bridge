import assert from "assert";

import app from "../../../src/api/app";

describe("processes service", () => {
  it("registered the service", () => {
    const service = app.service("processes");
    assert.ok(service, "Registered the service");
  });

  it("find responds", async () => {
    const service = app.service("processes");
    const response = await service.find();
    assert.ok(response, "responds");
  });
});
