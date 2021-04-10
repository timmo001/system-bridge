import assert from "assert";

import app from "../../../src/api/app";

describe("audio service", () => {
  it("registered the service", () => {
    const service = app.service("audio");
    assert.ok(service, "Registered the service");
  });

  it("responds", async () => {
    const service = app.service("audio");
    const response = await service.find();
    assert.ok(response, "Responds");
  });
});
