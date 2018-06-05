'use strict';

const Promise = require('bluebird');
const urlJoin = require('url-join');
const cheerio = require('cheerio');
const request = require('request');

const baseUrl = 'http://management.dbtouch.com/';
const makeUrl = (...parts) => urlJoin(baseUrl, ...parts);

function login(username, password, parseInfo = false) {
  const form = {
    'txt_username': username,
    'txt_password': password,
    'submit': ''
  };

  const jar = request.jar();
  const r = createClient(jar);

  return r.headAsync(makeUrl('/login/auth'))
    .then(() => r.postAsync(makeUrl('/login/saveAuth'), { form }))
    .then(resp => {
      if (!isSuccess(resp, path => path !== '/login/auth')) {
        return Promise.reject(new Error('Invalid credentials!'));
      }
      const sessionId = getSessionId(jar);
      if (!parseInfo) return { sessionId };
      return Object.assign({ sessionId }, parseUserInfo(resp.body));
    });
}

function logout(sessionId) {
  if (!sessionId) throw new Error('sessionId is required!');
  const r = createClient();
  return r.getAsync(makeUrl(`/logout/clear?sid=${sessionId}`))
    .then(resp => {
      if (!isSuccess(resp, path => path === '/login/auth')) {
        return Promise.reject(new Error('Logout failed!'));
      }
    });
}

function parseUserInfo(html) {
  const $ = cheerio.load(html);
  $.prototype.getText = function () { return this.text().trim(); };

  const profilePicture = $('.details-title .profile-picture').attr('src');

  const $dataRows = $('.details-content .row');
  const firstName = $dataRows.eq(0).find('div').text();
  const lastName = $dataRows.eq(1).find('div').text();
  const company = $dataRows.eq(3).find('div').text();
  const email = $dataRows.eq(4).find('div').text();
  const roles = $dataRows.eq(8).find('> div').children().map((_, el) => $(el).getText()).get();
  const groups = $dataRows.eq(9).find('em').map((_, el) => $(el).getText()).get();

  return {
    profilePicture,
    firstName,
    lastName,
    email,
    company,
    roles,
    groups
  };
}

module.exports = {
  login, logout, parseUserInfo
};

function createClient(cookieJar = request.jar()) {
  const r = request.defaults({
    jar: cookieJar,
    followRedirect: true,
    followAllRedirects: true
  });
  return Promise.promisifyAll(r);
}

function getSessionId(cookieJar) {
  const sessionCookie = cookieJar.getCookies(baseUrl).find(c => c.key === 'JSESSIONID');
  if (sessionCookie) return sessionCookie.value;
}

function isSuccess(resp, cb = () => false) {
  if (resp.statusCode !== 200) return false;
  return cb(resp.request.uri.pathname);
}
