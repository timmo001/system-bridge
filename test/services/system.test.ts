import assert from 'assert';
import app from '../../src/app';

describe('\'system\' service', () => {
  it('registered the service', () => {
    const service = app.service('system');

    assert.ok(service, 'Registered the service');
  });
});
