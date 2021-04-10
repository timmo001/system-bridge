import assert from "assert";

import app from "../../../src/api/app";

describe("system service", () => {
  it("registered the service", () => {
    const service = app.service("system");
    assert.ok(service, "Registered the service");
  });

  it("responds", async () => {
    const service = app.service("system");
    const response = await service.find();
    assert.ok(response, "Responds");
  });
});
