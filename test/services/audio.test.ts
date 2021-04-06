import assert from "assert";
import API from "../../src/api";

const api = new API();

describe("'audio' service", () => {
  it("registered the service", () => {
    // console.log(api);
    console.log(api.app);
    const service = api.app?.service("audio");
    console.log(service);
    assert.ok(service, "Registered the service");
  });
});
