/* global importScripts, URLPattern */

if (typeof importScripts !== 'undefined') {
  importScripts('mode/tab.js', 'mode/session.js');
}

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
}, id => setTimeout(chrome.notifications.clear, 5000, id));

self.button = {
  print(title, tabId) {
    const o = {
      title: title + '\n\n' + (new Date())
    };
    if (tabId) {
      o.tabId = tabId;
    }

    chrome.action.setTitle(o);
  },
  icon(type) {
    chrome.action.setIcon({
      path: {
        16: '/data/icons/' + type + '/16.png',
        32: '/data/icons/' + type + '/32.png',
        48: '/data/icons/' + type + '/48.png'
      }
    });
  }
};

self.match = (list, href) => {
  for (const s of list) {
    try {
      const pattern = new URLPattern(s.startsWith('{') ? JSON.parse(s) : {
        hostname: s
      });
      if (pattern.test(href)) {
        return true;
      }
    }
    catch (e) {
      console.warn(e);
    }
  }
  return false;
};

/* context menu */
{
  const once = () => {
    if (once.done) {
      return;
    }
    once.done = true;

    chrome.storage.local.get({
      mode: 'tabs'
    }, prefs => {
      chrome.contextMenus.create({
        id: 'session',
        title: 'Destroy cookies when browser is closed',
        contexts: ['action'],
        type: 'radio',
        checked: prefs.mode === 'session'
      });
      chrome.contextMenus.create({
        id: 'tabs',
        title: 'Destroy cookies when tab is closed',
        contexts: ['action'],
        type: 'radio',
        checked: prefs.mode === 'tabs'
      });
      chrome.contextMenus.create({
        id: 'exception-list',
        title: 'Add/Remove this hostname to/from exception list',
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*']
      });
    });
  };
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'tabs' || info.menuItemId === 'session') {
    chrome.storage.local.set({
      mode: info.menuItemId
    });
  }
  else if (info.menuItemId === 'exception-list') {
    if (tab.url.startsWith('http')) {
      try {
        const {hostname} = new URL(tab.url);

        chrome.storage.local.get({
          exceptions: []
        }, prefs => {
          const n = prefs.exceptions.indexOf(hostname);
          if (n === -1) {
            prefs.exceptions.push(hostname);
            notify(`"${hostname}" is added to the exception list`);
          }
          else {
            prefs.exceptions.splice(n, 1);
            notify(`"${hostname}" is removed from the exception list`);
          }
          chrome.storage.local.set(prefs);
        });
      }
      catch (e) {}
    }
    else {
      notify(tab.url + ' is not supported');
    }
  }
});

/* toggle */
chrome.action.onClicked.addListener(() => chrome.storage.local.get({
  enabled: true
}, prefs => chrome.storage.local.set({
  enabled: !prefs.enabled
})));
{
  const changed = () => chrome.storage.local.get({
    mode: 'tabs',
    enabled: true
  }, prefs => {
    if (prefs.enabled) {
      self.button.print(`Extension is active on "${prefs.mode}" mode`);
      self.button.icon('active');
    }
    else {
      self.button.print(`Extension is disabled`);
      self.button.icon('disabled');
    }
  });
  chrome.runtime.onInstalled.addListener(changed);
  chrome.runtime.onStartup.addListener(changed);
  chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled || ps.mode) {
      changed();
    }
  });
}

/* FAQs & Feedback */
{
  const {management, runtime: {onInstalled, setUninstallURL, getManifest}, storage, tabs} = chrome;
  if (navigator.webdriver !== true) {
    const {homepage_url: page, name, version} = getManifest();
    onInstalled.addListener(({reason, previousVersion}) => {
      management.getSelf(({installType}) => installType === 'normal' && storage.local.get({
        'faqs': true,
        'last-update': 0
      }, prefs => {
        if (reason === 'install' || (prefs.faqs && reason === 'update')) {
          const doUpdate = (Date.now() - prefs['last-update']) / 1000 / 60 / 60 / 24 > 45;
          if (doUpdate && previousVersion !== version) {
            tabs.query({active: true, lastFocusedWindow: true}, tbs => tabs.create({
              url: page + '?version=' + version + (previousVersion ? '&p=' + previousVersion : '') + '&type=' + reason,
              active: reason === 'install',
              ...(tbs && tbs.length && {index: tbs[0].index + 1})
            }));
            storage.local.set({'last-update': Date.now()});
          }
        }
      }));
    });
    setUninstallURL(page + '?rd=feedback&name=' + encodeURIComponent(name) + '&version=' + version);
  }
}
