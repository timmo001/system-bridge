import assert from "assert";

import app from "../../../src/api/app";

describe("network service", () => {
  it("registered the service", () => {
    const service = app.service("network");
    assert.ok(service, "Registered the service");
  });

  it("find responds", async () => {
    const service = app.service("network");
    const response = await service.find();
    assert.ok(response, "responds");
  });
});
