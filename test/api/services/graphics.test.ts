import assert from "assert";

import app from "../../../src/api/app";

describe("graphics service", () => {
  it("registered the service", () => {
    const service = app.service("graphics");
    assert.ok(service, "Registered the service");
  });

  it("find responds", async () => {
    const service = app.service("graphics");
    const response = await service.find();
    assert.ok(response, "responds");
  });
});
