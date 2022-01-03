/* globals webext */
'use strict';

const toast = document.getElementById('toast');

webext.storage.get({
  whitelist: []
}).then(({whitelist}) => {
  document.getElementById('whitelist').value = whitelist.join(', ');
});

document.getElementById('save').addEventListener('click', () => {
  const whitelist = document.getElementById('whitelist').value.split(/\s*,\s*/)
    .map(s => s.replace('http://', '').replace('https://', '').split('/')[0].trim())
    .filter((h, i, l) => h && l.indexOf(h) === i);
  document.getElementById('whitelist').value = whitelist;
  webext.storage.set({whitelist}).then(() => {
    toast.textContent = 'Options saved';
    window.setTimeout(() => toast.textContent = '', 750);
  });
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    window.setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      window.close();
    });
  }
});
// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));
