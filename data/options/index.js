/* globals webext */
'use strict';

webext.storage.get({
  whitelist: []
}).then(({whitelist}) => {
  console.log(whitelist);
  document.getElementById('whitelist').value = whitelist.join(', ');
});

document.getElementById('save').addEventListener('click', () => {
  const whitelist = document.getElementById('whitelist').value.split(/\s*,\s*/)
    .map(s => s.replace('http://', '')
    .replace('https://', '').split('/')[0].trim())
    .filter((h, i, l) => h && l.indexOf(h) === i);
  document.getElementById('whitelist').value = whitelist;
  webext.storage.set({whitelist}).then(() => {
    const info = document.getElementById('info');
    info.textContent = 'Options saved';
    window.setTimeout(() => info.textContent = '', 750);
  });
});
