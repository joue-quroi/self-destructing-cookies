/* globals webext, EventEmitter */
'use strict';

/*
  webext.cookies
  Events: changed
*/
{
  const callback = obj => { // obj = {cause, cookie, removed}
    webext.cookies.emit('changed', obj);
  };

  webext.cookies = new EventEmitter({
    changed: {
      first: () => chrome.cookies.onChanged.addListener(callback),
      last: () => chrome.cookies.onChanged.removeListener(callback)
    }
  });
}

webext.cookies.get = ({name, url}) => new Promise((resolve, reject) => chrome.cookies.remove({
  url,
  name
}, cookie => {
  if (chrome.runtime.lastError) {
    return reject(chrome.runtime.lastError.message);
  }
  resolve(cookie);
}));

webext.cookies.remove = ({name, url}) => new Promise((resolve, reject) => chrome.cookies.remove({
  url,
  name
}, details => {
  if (chrome.runtime.lastError) {
    return reject(chrome.runtime.lastError.message);
  }
  resolve(details);
}));
webext.cookies.set = cookie => new Promise((resolve, reject) => {
  // only keep keys that are supported by cookie.set
  const valids = ['url', 'name', 'value', 'domain', 'path', 'secure', 'httpOnly', 'expirationDate'];
  Object.keys(cookie).filter(key => valids.indexOf(key) === -1).forEach(key => delete cookie[key]);

  chrome.cookies.set(cookie, cookie => {
    if (chrome.runtime.lastError) {
      return reject(chrome.runtime.lastError.message);
    }
    resolve(cookie);
  });
});
webext.cookies.getAll = details => new Promise((resolve, reject) => chrome.cookies.getAll(details, cookies => {
  if (chrome.runtime.lastError) {
    return reject(chrome.runtime.lastError.message);
  }
  resolve(cookies);
}));
