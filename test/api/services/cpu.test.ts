import assert from "assert";

import app from "../../../src/api/app";

describe("cpu service", () => {
  it("registered the service", () => {
    const service = app.service("cpu");
    assert.ok(service, "Registered the service");
  });

  it("find responds", async () => {
    const service = app.service("cpu");
    const response = await service.find();
    assert.ok(response, "responds");
  });
});
