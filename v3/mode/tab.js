const collect = () => chrome.tabs.query({}, tabs => chrome.storage.session.set(tabs.reduce((p, t) => {
  p[t.id] = t.url;
  return p;
}, {})));

const tabs = {};
tabs.onRemoved = (id, removeInfo, href) => {
  const next = href => {
    if (href.startsWith('http')) {
      try {
        const {origin, hostname} = new URL(href);
        chrome.storage.local.get({
          mode: 'tabs', // mode: session, tabs
          enabled: true,
          exceptions: []
        }, prefs => {
          try {
            chrome.tabs.query({
              url: origin + '/*'
            }, tabs => {
              if (tabs.length === 0) {
                if (self.match(prefs.exceptions, href)) {
                  console.log('tabs mode skipped for ' + origin);
                  return;
                }
                if (prefs.enabled && prefs.mode === 'tabs') {
                  chrome.cookies.getAll({
                    url: href
                  }).then(cookies => {
                    if (cookies.length) {
                      const names = [];
                      for (const c of cookies) {
                        names.push(c.name);
                        chrome.cookies.remove({
                          name: c.name,
                          url: origin + '/*'
                        });
                      }
                      self.button.print('Latest Removed Cookies for ' + hostname + ':\n\n' + names.join(', '));
                    }
                  });
                }
              }
            });
          }
          catch (e) {}
        });
      }
      catch (e) {}
    }
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
