/* globals webext */
'use strict';

var whitelist = [];
webext.storage.get({whitelist}).then(prefs => whitelist = prefs.whitelist);
webext.storage.on('changed', prefs => whitelist = prefs.whitelist.newValue).if(prefs => prefs.whitelist);

var notify = e => webext.notifications.create({
  message: e.message || e
});

var button = {};
button.update = msg => {
  button.cache.push(`${(new Date()).toLocaleTimeString()} ${msg}`);
  button.cache = button.cache.slice(-5);
  webext.browserAction.setTitle({
    title: button.cache.join('\n')
  });
};
button.cache = [];
button.enabled = (bol, mode) => {
  if (bol) {
    webext.browserAction.setIcon({
      'path': {
        '16': 'data/icons/16.png',
        '32': 'data/icons/32.png',
        '48': 'data/icons/48.png',
        '64': 'data/icons/64.png'
      }
    });
    webext.browserAction.setTitle({
      title: webext.runtime.getManifest().name + ` (${mode})`
    });
  }
  else {
    webext.browserAction.setIcon({
      'path': {
        '16': 'data/icons/disabled/16.png',
        '32': 'data/icons/disabled/32.png',
        '48': 'data/icons/disabled/48.png',
        '64': 'data/icons/disabled/64.png'
      }
    });
    webext.browserAction.setTitle({
      title: webext.runtime.getManifest().name + ' (disabled)'
    });
  }
};

var session = ({cookie}) => {
  const {name, domain} = cookie;
  if (whitelist.indexOf(domain) !== -1) {
    return console.log('domain is whitelisted');
  }

  const url = 'http://' + domain;

  webext.cookies.remove({
    url,
    name
  }).then(() => {
    cookie.url = url;
    // convert to session cookie
    delete cookie.expirationDate;
    webext.cookies.set(cookie);
    button.update(`"${name}" on ${domain} is modified`);
  });
};

var tabs = {
  cache: {}
};
tabs.onRemoved = tabId => {
  const url = tabs.cache[tabId];
  if (url && url.startsWith('http')) {
    const {origin, hostname} = new URL(url);
    delete tabs.cache[tabId];
    if (whitelist.indexOf(hostname) !== -1) {
      return console.log('domain is whitelisted');
    }

    if (Object.values(tabs.cache).some(s => s.startsWith(origin))) {
      // do not delete cookies if still there is a tab with the same origin
      console.log('skipped; there are some tabs with the same origin');
      return;
    }
    webext.cookies.getAll({
      url
    }).then(cookies => {
      Promise.all(cookies.map(c => webext.cookies.remove({
        name: c.name,
        url
      }))).catch(e => console.log(e)).then(() => {
        button.update(`${cookies.length} cookies are removed from ${hostname}`);
      });
    });
  }
};
tabs.onUpdated = (tabId, changeInfo) => tabs.cache[tabId] = changeInfo.url;

var setup = () => webext.storage.get({
  enabled: true,
  mode: 'tabs' // mode: session, tabs
}).then(({mode, enabled}) => {
  button.enabled(enabled, mode);
  if (enabled === false) {
    webext.cookies.off('changed', session);
    webext.tabs.off('removed', tabs.onRemoved);
    webext.tabs.off('updated', tabs.onUpdated);

    console.log('all monitors are disabled');
    return;
  }
  if (mode === 'session') {
    console.log('session mode');
    webext.cookies.off('changed', session);
    webext.cookies.on('changed', session)
      // do not get called if cookie is removed or if cookie is session only
      .if(({cookie, removed}) => removed === false && cookie.session === false);
  }
  else {
    console.log('tab-close mode');
    // remove chrome.cookies.onChanged listener when it is not needed
    webext.cookies.off('changed', session);

    webext.tabs.off('removed', tabs.onRemoved);
    webext.tabs.on('removed', tabs.onRemoved);
    //
    webext.tabs.query({
      url: '*://*/*'
    }).then(tbs => tbs.forEach(t => tabs.cache[t.id] = t.url));
    webext.tabs.off('updated', tabs.onUpdated);
    webext.tabs.on('updated', tabs.onUpdated).if((tabId, changeInfo) => changeInfo.url);
  }
});

webext.runtime.on('start-up', setup);
webext.storage.on('changed', setup).if(prefs => prefs.mode || prefs.enabled);
