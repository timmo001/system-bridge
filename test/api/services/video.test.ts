import { Server } from "http";
import assert from "assert";
import axios from "axios";

import app from "../../../src/api/app";
import { authenticatedRequest, getUrl } from "../app.test";

describe("video service", () => {
  let server: Server;

  before((done) => {
    server = app.listen(9170);
    server.once("listening", () => done());
  });

  after((done) => {
    server.close(done);
  });

  it("registered the service", () => {
    const service = app.service("video");
    assert.ok(service, "Registered the service");
  });

  it("request without auth returns 401", async () => {
    try {
      await axios.post(getUrl("video"));
      assert.fail("should never get here");
    } catch (error) {
      const { response } = error;
      assert.strictEqual(response.status, 401);
      assert.strictEqual(response.data.code, 401);
      assert.strictEqual(response.data.message, "Not authenticated");
      assert.strictEqual(response.data.name, "NotAuthenticated");
    }
  });

  it("post without type or url returns 400", async () => {
    try {
      await axios.post(getUrl("video"), {}, authenticatedRequest);
      assert.fail("should never get here");
    } catch (error) {
      const { response } = error;
      assert.strictEqual(response.status, 400);
      assert.strictEqual(response.data.code, 400);
      assert.strictEqual(
        response.data.message,
        "You must provide a path or url"
      );
      assert.strictEqual(response.data.name, "BadRequest");
    }
  });
});
