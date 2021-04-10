import assert from "assert";

import app from "../../../src/api/app";

describe("display service", () => {
  it("registered the service", () => {
    const service = app.service("display");
    assert.ok(service, "Registered the service");
  });

  it("responds", async () => {
    const service = app.service("display");
    const response = await service.find();
    assert.ok(response, "Responds");
  });
});
