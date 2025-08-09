const collect = () => chrome.tabs.query({}, tabs => chrome.storage.session.set(tabs.reduce((p, t) => {
  p[t.id] = t.url;
  return p;
}, {})));

const tabs = {};
tabs.onRemoved = (id, removeInfo, href) => {
  const next = async href => {
    if (href.startsWith('http') === false) {
      return;
    }
    try {
      const {origin, hostname} = new URL(href);
      const prefs = await chrome.storage.local.get({
        mode: 'tabs', // mode: session, tabs
        enabled: true,
        exceptions: []
      });
      try {
        // Firefox calls the "chrome.tabs.onRemoved.addListener" before the tab is closed
        if (removeInfo) {
          if (/Firefox/.test(navigator.userAgent)) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        const tabs = await chrome.tabs.query({
          url: origin + '/*'
        });

        if (tabs.length === 0) {
          if (self.match(prefs.exceptions, href)) {
            console.log('tabs mode skipped for ' + origin);
            return;
          }
          if (prefs.enabled && prefs.mode === 'tabs') {
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

tabs.onUpdated = (id, info) => {
  if (info.url) {
    chrome.storage.session.get(id + '', prefs => {
      const href = prefs[id];
      // if tab's hostname is changed, call tabs.remove
      if (href) {
        try {
          const a = new URL(href);
          const b = new URL(info.url);

          if (a.hostname !== b.hostname) {
            tabs.onRemoved(undefined, undefined, href);
          }
        }
        catch (e) {}
      }

      chrome.storage.session.set({
        [id]: info.url
      });
    });
  }
};

{
  const check = () => chrome.storage.local.get({
    mode: 'tabs', // mode: session, tabs
    enabled: true
  }, prefs => {
    chrome.tabs.onRemoved.removeListener(tabs.onRemoved);
    chrome.tabs.onUpdated.removeListener(tabs.onUpdated);

    if (prefs.enabled && prefs.mode === 'tabs') {
      chrome.tabs.onRemoved.addListener(tabs.onRemoved);
      chrome.tabs.onUpdated.addListener(tabs.onUpdated);
      collect();
    }
  });
  chrome.runtime.onInstalled.addListener(check);
  chrome.runtime.onStartup.addListener(check);
  chrome.storage.onChanged.addListener(ps => {
    if (ps.enabled || ps.mode) {
      check();
    }
  });
}
