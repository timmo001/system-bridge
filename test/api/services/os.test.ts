import { Server } from "http";
import assert from "assert";
import axios from "axios";

import { getUrl } from "../app.test";
import app from "../../../src/api/app";

describe("os service", () => {
  let server: Server;

  before((done) => {
    server = app.listen(9170);
    server.once("listening", () => done());
  });

  after((done) => {
    server.close(done);
  });

  it("registered the service", () => {
    const service = app.service("os");
    assert.ok(service, "Registered the service");
  });

  it("find responds", async () => {
    const service = app.service("os");
    const response = await service.find();
    assert.ok(response, "responds");
  });

  it("request without auth returns 401", async () => {
    try {
      await axios.get(getUrl("os"));
      assert.fail("should never get here");
    } catch (error) {
      const { response } = error;
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.data.code, 401);
      assert.strictEqual(response.data.message, "Not authenticated");
      assert.strictEqual(response.data.name, "NotAuthenticated");
    }
  });
});
