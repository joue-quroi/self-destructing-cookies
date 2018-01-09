/* globals webext, notify */
'use strict';

// context-menu

webext.runtime.on('start-up', () => {
  webext.storage.get({
    mode: 'tabs'
  }).then(({mode}) => {
    webext.contextMenus.create({
      id: 'session',
      title: 'Destroy cookies when browser is closed',
      contexts: ['browser_action'],
      type: 'radio',
      checked: mode === 'session'
    });
    webext.contextMenus.create({
      id: 'tabs',
      title: 'Destroy cookies when tab is closed',
      contexts: ['browser_action'],
      type: 'radio',
      checked: mode === 'tabs'
    });
    webext.contextMenus.create({
      id: 'whitelist',
      title: 'Add this hostname to whitelist',
      contexts: ['browser_action'],
      documentUrlPatterns: ['*://*/*']
    });
  });
});

webext.storage.on('changed', ({mode}) => {
  webext.contextMenus.update('session', {
    checked: mode.newValue === 'session'
  });
  webext.contextMenus.update('tabs', {
    checked: mode.newValue === 'tabs'
  });
}).if(prefs => prefs.mode);

webext.contextMenus.on('clicked', ({menuItemId}) => {
  webext.storage.set({
    mode: menuItemId
  });
}).if(({menuItemId}) => menuItemId === 'session' || menuItemId === 'tabs');

webext.contextMenus.on('clicked', (info, {url}) => {
  if (url.startsWith('http')) {
    const {hostname} = new URL(url);
    if (hostname) {
      webext.storage.get({
        whitelist: []
      }).then(({whitelist}) => {
        whitelist.push(hostname);
        whitelist = whitelist.filter((s, i, l) => l.indexOf(s) === i);
        webext.storage.set({whitelist});
        notify(`"${hostname}" is added to the whitelist`);
      });
    }
  }
  else {
    notify('this tab does not have a valid hostname');
  }
}).if(({menuItemId}) => menuItemId === 'whitelist');

// browser-action
webext.browserAction.on('clicked', () => webext.storage.get({
  enabled: true
}).then(({enabled}) => {
  enabled = !enabled;
  webext.storage.set({enabled});
}));
