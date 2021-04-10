import assert from "assert";

import app from "../../../src/api/app";

describe("battery service", () => {
  it("registered the service", () => {
    const service = app.service("battery");
    assert.ok(service, "Registered the service");
  });

  it("responds", async () => {
    const service = app.service("battery");
    const response = await service.find();
    assert.ok(response, "Responds");
  });
});
