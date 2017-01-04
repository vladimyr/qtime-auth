'use strict';

const Promise = require('bluebird');
const urlJoin = require('url-join');
const cheerio = require('cheerio');
const request = require('request');

const baseUrl = 'http://management.dbtouch.com/';

function createClient(cookieJar) {
  let r = request.defaults({
    jar: cookieJar,
    followRedirect: true,
    followAllRedirects: true
  });
  return Promise.promisifyAll(r);
}

function getSessionId(cookieJar) {
  let sessionCookie = cookieJar.getCookies(baseUrl).find(c => c.key === 'JSESSIONID');
  if (sessionCookie) return sessionCookie.value;
}

function makeUrl(...parts) {
  return urlJoin(baseUrl, ...parts);
}

function isSuccess(resp) {
  if (resp.statusCode !== 200) return false;
  return resp.request.uri.pathname !== '/login/auth';
}

function login(username, password, parseInfo=false) {
  let form = {
    'txt_username': username,
    'txt_password': password,
    'submit': ''
  };

  let jar = request.jar();
  let r = createClient(jar);

  return r.headAsync(makeUrl('/login/auth'))
    .then(() => r.postAsync(makeUrl('/login/saveAuth'), { form }))
    .then(resp => {
      if (!isSuccess(resp)) return Promise.reject(new Error('Invalid credentials!'));
      let sessionId = getSessionId(jar);
      if (!parseInfo) return { sessionId };
      return Object.assign({ sessionId }, parseUserInfo(resp.body));
    });
}

function parseUserInfo(html) {
  let $ = cheerio.load(html);
  $.prototype.getText = function() { return this.text().trim(); }

  let profilePicture = $('.details-title .profile-picture').attr('src');

  let $dataRows = $('.details-content .row');
  let firstName = $dataRows.eq(0).find('div').text();
  let lastName = $dataRows.eq(1).find('div').text();
  let company = $dataRows.eq(3).find('div').text();
  let email = $dataRows.eq(4).find('div').text();
  let roles = $dataRows.eq(8).find('> div').children().map((_, el) => $(el).getText()).get();
  let groups = $dataRows.eq(9).find('em').map((_, el) => $(el).getText()).get();

  return {
    profilePicture,
    firstName, lastName,
    email,
    company,
    roles, groups
  };
}

module.exports = {
  login, parseUserInfo
};
