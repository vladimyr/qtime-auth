'use strict';

const { username, password } = require('./credentials.json');
const { login } = require('./index.js');
const test = require('tape');

test('login using fake credentials', t => {
  login('test@extensionengine.com', 'test', true)
    .catch(err => {
      t.equal(err.message, 'Invalid credentials!',
        `Fake user did not successfully log in.`);
    })
    .then(() => t.end());
});

test('login using real credentials', t => {
  login(username, password, true)
    .then(res => {
      t.comment(`sessionId = ${ res.sessionId }]`);
      t.pass(`User (${ username }) succesfully logged in.`);
    })
    .catch(err => t.end(err));
});
