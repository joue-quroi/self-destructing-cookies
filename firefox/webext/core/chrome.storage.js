/* globals webext, EventEmitter */
'use strict';

/*
  webext.storage
  Event: changed
*/
{
  const callback = changes => {
    webext.storage.emit('changed', changes);
  };

  webext.storage = new EventEmitter({
    changed: {
      first: () => chrome.storage.onChanged.addListener(callback),
      last: () => chrome.storage.onChanged.removeListener(callback)
    }
  }, chrome.storage.local);
}
webext.storage.get = items => new Promise(resolve => chrome.storage.local.get(items, resolve));
webext.storage.set = items => new Promise(resolve => chrome.storage.local.set(items, resolve));
