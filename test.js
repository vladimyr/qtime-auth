'use strict';

let { QTIME_USERNAME: username, QTIME_PASSWORD: password } = process.env;
if (!username || !password) ({ username, password } = require('./credentials.json'));

const { login, logout } = require('./index.js');
const test = require('tape');

const isString = arg => typeof arg === 'string';
const isUrl = arg => /^https?:\/\//.test(arg);
const each = (obj, cb) => Object.keys(obj).forEach(key => cb(obj[key], key));

test('login using fake credentials', t => {
  login('test@extensionengine.com', 'test', true)
    .catch(err => {
      t.equal(err.message, 'Invalid credentials!',
        `Fake user did not successfully log in.`);
    })
    .then(() => t.end());
});

test('login using real credentials', t => {
  login(username, password, false)
    .then(res => {
      console.log(`sessionId = "${res.sessionId}"`);
      t.pass(`User (${username}) succesfully logged in.`);
      return logout(res.sessionId);
    })
    .then(t.end, t.end);
});

test('getting user data', t => {
  login(username, password, true)
    .then(res => {
      t.pass(`User (${username}) succesfully logged in.`);
      t.ok(isValidUser(res), 'User data is successfully fetched.');
      console.log('# user:');
      each(res, (val, key) => console.log(`${key}:\t${JSON.stringify(val)}`));
      return logout(res.sessionId);
    })
    .then(t.end, t.end);
});

test('logout', t => {
  login(username, password, false)
    .then(res => {
      console.log(`sessionId = "${res.sessionId}"`);
      return res.sessionId;
    })
    .then(sessionId => logout(sessionId))
    .then(() => {
      t.pass('Successfully logged out.');
      t.end();
    })
    .catch(err => t.end(err));
});

function isValidUser(data = {}) {
  const props = [
    'firstName',
    'lastName',
    'profilePicture',
    'email',
    'company'
  ];
  const values = props.map(it => data[it]);
  return values.every(it => isString(it) && it) &&
         isUrl(data.profilePicture);
}
