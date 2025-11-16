/* global importScripts, URLPattern, tldjs */

if (typeof importScripts !== 'undefined') {
  importScripts('mode/tab.js', 'mode/session.js', 'tld.js');
}

const notify = e => chrome.notifications.create({
  type: 'basic',
  iconUrl: '/data/icons/48.png',
  title: chrome.runtime.getManifest().name,
  message: e.message || e
}, id => setTimeout(chrome.notifications.clear, 5000, id));

const askUserConfirmation = message => new Promise(resolve => {
  const notifId = 'confirm_' + Date.now();

  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: 'data/icons/48.png',
    title: 'Confirm Action',
    message,
    priority: 2
  });

  const handleClick = id => {
    if (id === notifId) {
      cleanup();
      chrome.notifications.clear(id);
      resolve(true);
    }
  };

  const handleClose = id => {
    if (id === notifId) {
      cleanup();
      resolve(false);
    }
  };

  const cleanup = () => {
    clearTimeout(timeoutId);
    chrome.notifications.onClicked.removeListener(handleClick);
    chrome.notifications.onClosed.removeListener(handleClose);
  };

  chrome.notifications.onClicked.addListener(handleClick);
  chrome.notifications.onClosed.addListener(handleClose);

  // Auto-timeout in 5 seconds
  const timeoutId = setTimeout(() => chrome.notifications.clear(notifId), 10000);
});


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
        id: 'delete',
        title: 'Delete cookies',
        contexts: ['action']
      });
      chrome.contextMenus.create({
        id: 'clear-site',
        title: `Delete cookies for this site now`,
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*'],
        parentId: 'delete'
      });
      chrome.contextMenus.create({
        id: 'clear-all',
        title: `Delete cookies for all websites now`,
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*'],
        parentId: 'delete'
      });
      chrome.contextMenus.create({
        id: 'exception-list',
        title: 'Exception list',
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*']
      });
      chrome.contextMenus.create({
        id: 'exception-list-hostname',
        title: 'Add or remove this hostname from the exception list',
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*'],
        parentId: 'exception-list'
      });
      chrome.contextMenus.create({
        id: 'exception-list-domain',
        title: 'Add or remove this domain and its subdomains from the exception list',
        contexts: ['action'],
        documentUrlPatterns: ['*://*/*'],
        parentId: 'exception-list'
      });
    });
  };
  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const cmd = info.menuItemId;
  if (cmd.startsWith('clear-')) {
    if (cmd === 'clear-site') {
      if (!tab || !tab.url || tab.url.startsWith('http') === false) {
        return notify('NOT_VALID_TAB_URL');
      }
    }

    chrome.storage.local.get({
      'confirm-delete': true
    }).then(async prefs => {
      if (prefs['confirm-delete']) {
        const msg = `This will delete all cookies for ${cmd === 'clear-site' ? '"this" website' : '"all" websites'}.

    Click to proceed. Ignore to cancel.`;
        const b = await askUserConfirmation(msg);
        if (!b) {
          return;
        }
      }
      const options = cmd === 'clear-site' ? {
        domain: (new URL(tab.url)).hostname
      } : {};
      const cookies = await chrome.cookies.getAll(options);
      if (!cookies || cookies.length === 0) {
        throw Error('NO_COOKIE_FOUND');
      }
      let n = 0;
      for (const cookie of cookies) {
        const cookieUrl = (cookie.secure ? 'https://' : 'http://') + cookie.domain.replace(/^\./, '') + cookie.path;
        try {
          const details = await chrome.cookies.remove({
            url: cookieUrl,
            name: cookie.name,
            storeId: cookie.storeId
          });
          if (details) {
            n += 1;
          }
          else {
            throw Error('EMPTY_REPLY');
          }
        }
        catch (e) {
          console.error(`Failed to delete cookie: "${cookie.name}" for "${cookieUrl}". `, e);
        }
      }
      notify('Total number of deleted cookies: ' + n);
    }).catch(e => {
      console.error(e);
      setTimeout(() => notify(e), 1000);
    });
  }
  else if (cmd === 'tabs' || cmd === 'session') {
    chrome.storage.local.set({
      mode: cmd
    });
  }
  else if (cmd.startsWith('exception-list-')) {
    if (tab.url.startsWith('http')) {
      // find all existing matching rules
      chrome.storage.local.get({
        exceptions: []
      }, prefs => {
        try {
          const ns = [];
          prefs.exceptions.forEach((rule, n) => {
            try {
              const pattern = new URLPattern(rule.startsWith('{') ? JSON.parse(rule) : {
                hostname: rule
              });
              if (pattern.test(tab.url)) {
                ns.push(n);
              }
            }
            catch (e) {}
          });
          // there is no matching rule
          if (ns.length === 0) {
            if (cmd === 'exception-list-domain') {
              prefs.exceptions.push(`{"hostname": "*.${tldjs.getDomain(tab.url)}"}`);
            }
            else {
              prefs.exceptions.push((new URL(tab.url)).hostname);
            }

            notify(`One new rule is added to the exception list`);
          }
          else {
            ns.reverse();
            for (const n of ns) {
              prefs.exceptions.splice(n, 1);
            }

            notify(`${ns.length} rules ${ns.length < 2 ? 'is' : 'are'} removed from the exception list`);
          }
          chrome.storage.local.set(prefs);
        }
        catch (e) {
          console.error(e);
          notify(e);
        }
      });
    }
    else {
      notify(tab.url + ' is not supported');
    }
  }
});

/* toggle */
chrome.action.onClicked.addListener(async () => {
  const prefs = await chrome.storage.local.get({
    enabled: true
  });
  chrome.storage.local.set({
    enabled: !prefs.enabled
  });
});
{
  const changed = async () => {
    const prefs = await chrome.storage.local.get({
      mode: 'tabs',
      enabled: true
    });
    if (prefs.enabled) {
      self.button.print(`Extension is active on "${prefs.mode}" mode`);
      self.button.icon('active');
    }
    else {
      self.button.print(`Extension is disabled`);
      self.button.icon('disabled');
    }
  };

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
