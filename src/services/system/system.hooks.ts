import * as authentication from "@feathersjs/authentication";
// Don't remove this comment. It's needed to format import lines nicely.

const { authenticate } = authentication.hooks;

export default {
  before: {
    all: [authenticate("api-key")],
    get: [],
  },
  after: {
    all: [],
    get: [],
  },
  error: {
    all: [],
    get: [],
  },
};
