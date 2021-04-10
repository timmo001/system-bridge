import { Server } from "http";
import assert from "assert";
import axios from "axios";

import app from "../../src/api/app";

const getUrl = (pathname?: string): string => {
  const u = new URL("http://localhost:9170");
  u.pathname = pathname;
  return u.toString();
};

describe("Feathers application tests", () => {
  let server: Server;

  before(function (done) {
    server = app.listen(9170);
    server.once("listening", () => done());
  });

  after(function (done) {
    server.close(done);
  });

  // it("starts and shows the index page", async () => {
  //   const { data } = await axios.get(getUrl());
  //   assert.ok(data.indexOf('<html lang="en">') !== -1);
  // });

  describe("404", function () {
    it("shows a 404 HTML page", async () => {
      try {
        await axios.get(getUrl("path/to/nowhere"), {
          headers: {
            Accept: "text/html",
          },
        });
        assert.fail("should never get here");
      } catch (error) {
        const { response } = error;

        assert.strictEqual(response.status, 404);
        assert.ok(response.data.indexOf("<html>") !== -1);
      }
    });

    it("shows a 404 JSON error without stack trace", async () => {
      try {
        await axios.get(getUrl("path/to/nowhere"));
        assert.fail("should never get here");
      } catch (error) {
        const { response } = error;

        assert.strictEqual(response.status, 404);
        assert.strictEqual(response.data.code, 404);
        assert.strictEqual(response.data.message, "Page not found");
        assert.strictEqual(response.data.name, "NotFound");
      }
    });
  });
});
