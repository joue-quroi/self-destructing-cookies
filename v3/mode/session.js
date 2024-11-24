const session = o => {
  const {cause, cookie, removed} = o;

  if (cause === 'evicted' || cause === 'expired' || cause === 'expired_overwrite') {
    return;
  }
  if (removed) {
    return;
  }

  // do not get called if cookie is removed or if cookie is session only
  if (removed === false && cookie.session === false) {
    const domain = cookie.domain.replace(/^\./, '');

    chrome.storage.local.get({
      exceptions: []
    }, prefs => {
      cookie.url = (cookie.secure ? 'https://' : 'http://') + domain;
      if (self.match(prefs.exceptions, cookie.url)) {
        console.info('session mode skipped for ' + domain);
        return;
      }

      if (cookie.hostOnly) {
        delete cookie.domain;
      }
      delete cookie.hostOnly;
      delete cookie.session;
      delete cookie.expirationDate;

      self.button.print('Converting "' + cookie.name + '" for "' + cookie.url + '" to session only');

      chrome.cookies.set(cookie);
    });
  }
};

{
  const check = () => chrome.storage.local.get({
    mode: 'tabs', // mode: session, tabs
    enabled: true
  }, prefs => {
    chrome.cookies.onChanged.removeListener(session);

    if (prefs.enabled && prefs.mode === 'session') {
      chrome.cookies.onChanged.addListener(session);
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
