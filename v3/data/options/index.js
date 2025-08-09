'use strict';

const toast = document.getElementById('toast');

chrome.storage.local.get({
  'exceptions': [],
  'confirm-delete': true
}, prefs => {
  document.getElementById('exceptions').value = prefs.exceptions.join(', ');
  document.getElementById('confirm-delete').checked = prefs['confirm-delete'];
});

document.getElementById('save').addEventListener('click', () => {
  const exceptions = document.getElementById('exceptions').value.split(/\s*,\s*/)
    .map((s = '') => {
      if (s.startsWith('http')) {
        s = s.replace(/https*:\/\//, '').split('/')[0];
      }

      return s.trim();
    }).filter((h, i, l) => h && l.indexOf(h) === i);
  document.getElementById('exceptions').value = exceptions.join(', ');
  chrome.storage.local.set({
    exceptions,
    'confirm-delete': document.getElementById('confirm-delete').checked
  }).then(() => {
    toast.textContent = 'Options saved';
    setTimeout(() => toast.textContent = '', 750);
  });
});

// reset
document.getElementById('reset').addEventListener('click', e => {
  if (e.detail === 1) {
    toast.textContent = 'Double-click to reset!';
    setTimeout(() => toast.textContent = '', 750);
  }
  else {
    localStorage.clear();
    chrome.storage.local.clear(() => {
      chrome.runtime.reload();
      close();
    });
  }
});

// support
document.getElementById('support').addEventListener('click', () => chrome.tabs.create({
  url: chrome.runtime.getManifest().homepage_url + '?rd=donate'
}));

// links
for (const a of [...document.querySelectorAll('[data-href]')]) {
  if (a.hasAttribute('href') === false) {
    a.href = chrome.runtime.getManifest().homepage_url + '#' + a.dataset.href;
  }
}
