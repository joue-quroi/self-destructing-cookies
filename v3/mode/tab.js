// store addresses of each tab
{
  const collect = async () => {
    const tabs = await chrome.tabs.query({});
    const prefs = {};
    for (const tab of tabs) {
      if (tab.url && tab.url.startsWith('http')) {
        prefs[tab.id] = tab.url;
      }
    }
    chrome.storage.session.set(prefs);
  };

  const check = async () => {
    const prefs = await chrome.storage.local.get({
      mode: 'tabs', // mode: session, tabs
      enabled: true
    });
    if (prefs.enabled && prefs.mode === 'tabs') {
      collect();
    }
  };

  const once = () => {
    if (once.done) {
      return;
    }
    once.done = true;
    check();
  };

  chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled || ps.mode) {
      check();
    }
  });

  chrome.runtime.onStartup.addListener(once);
  chrome.runtime.onInstalled.addListener(once);
}


const tabs = {};
tabs.onRemoved = (id, removeInfo, href) => {
  const next = async href => {
    if (href.startsWith('http') === false) {
      return;
    }
    try {
      const prefs = await chrome.storage.local.get({
        mode: 'tabs', // mode: session, tabs
        enabled: true,
        exceptions: []
      });
      if (!prefs.enabled || prefs.mode !== 'tabs') {
        return;
      }
      if (self.match(prefs.exceptions, href)) {
        console.info('tabs mode skipped for ' + origin);
        return;
      }

      const {origin, hostname} = new URL(href);

      try {
        // Firefox calls the "chrome.tabs.onRemoved.addListener" before the tab is closed
        if (removeInfo) {
          if (/Firefox/.test(navigator.userAgent)) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // do we have another tab on the same origin
        const tabs = await chrome.tabs.query({
          url: origin + '/*'
        });

        if (tabs.length === 0) {
          const cookies = await chrome.cookies.getAll({
            url: href
          });

          if (cookies.length) {
            const names = [];

            for (const cookie of cookies) {
              const cookieUrl = (cookie.secure ? 'https://' : 'http://') +
                cookie.domain.replace(/^\./, '') + cookie.path;
              try {
                const details = await chrome.cookies.remove({
                  url: cookieUrl,
                  name: cookie.name,
                  storeId: cookie.storeId
                });
                if (details) {
                  names.push(cookie.name);
                }
                else {
                  console.info(`Failed to delete cookie: "${cookie.name}" for "${cookieUrl}". `);
                }
              }
              catch (e) {
                console.error(`Failed to delete cookie: "${cookie.name}" for "${cookieUrl}". `, e);
              }
            }
            if (names.length) {
              self.button.print('Latest Removed Cookies for ' + hostname + ':\n\n' + names.join(', '));
            }
          }
        }
      }
      catch (e) {}
    }
    catch (e) {}
  };
  if (href) {
    next(href);
  }
  else {
    chrome.storage.session.get(id + '', prefs => {
      const href = prefs[id] || '';
      if (href) {
        chrome.storage.session.remove(id + '');
        next(href);
      }
    });
  }
};

tabs.onUpdated = async (id, info) => {
  if (!info.url) {
    return;
  }
  const prefs = await chrome.storage.session.get(id + '');
  const href = prefs[id];
  // if tab's hostname is changed, call tabs.remove
  if (href) {
    try {
      const a = new URL(href);
      const b = new URL(info.url);

      if (a.hostname !== b.hostname) {
        tabs.onRemoved(id, undefined, href);
      }
    }
    catch (e) {}
  }

  if (info.url.startsWith('http')) {
    chrome.storage.session.set({
      [id]: info.url
    });
  }
  else {
    chrome.storage.session.remove(id + '');
  }
};

{
  const check = async () => {
    const prefs = await chrome.storage.local.get({
      mode: 'tabs', // mode: session, tabs
      enabled: true
    });
    chrome.tabs.onRemoved.removeListener(tabs.onRemoved);
    chrome.tabs.onUpdated.removeListener(tabs.onUpdated);

    if (prefs.enabled && prefs.mode === 'tabs') {
      chrome.tabs.onRemoved.addListener(tabs.onRemoved);
      chrome.tabs.onUpdated.addListener(tabs.onUpdated);
    }
  };

  check();
  chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled || ps.mode) {
      check();
    }
  });
}
