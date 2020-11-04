/* globals webext, EventEmitter */
'use strict';

/*
  webext.tabs
  Event: removed
*/
{
  const onRemoved = (tabId, removeInfo) => webext.tabs.emit('removed', tabId, removeInfo);
  const onCreated = tab => webext.tabs.emit('created', tab);
  const onUpdated = (tabId, changeInfo, tab) => webext.tabs.emit('updated', tabId, changeInfo, tab);

  webext.tabs = new EventEmitter({
    removed: {
      first: () => chrome.tabs.onRemoved.addListener(onRemoved),
      last: () => chrome.tabs.onRemoved.removeListener(onRemoved)
    },
    created: {
      first: () => chrome.tabs.onCreated.addListener(onCreated),
      last: () => chrome.tabs.onCreated.removeListener(onCreated)
    },
    updated: {
      first: () => chrome.tabs.onUpdated.addListener(onUpdated),
      last: () => chrome.tabs.onUpdated.removeListener(onUpdated)
    },
  }, chrome.tabs);
}

webext.tabs.query = queryInfo => new Promise(resolve => chrome.tabs.query(queryInfo, resolve));

webext.tabs.current = () => new Promise(resolve => chrome.tabs.query({
  active: true,
  currentWindow: true
}, ([tab]) => resolve(tab)));

webext.tabs.single = createProperties => new Promise(resolve => chrome.tabs.query({
  url: chrome.runtime.getURL(createProperties.url)
}, tabs => {
  if (tabs && tabs.length) {
    chrome.tabs.update(tabs[0].id, {
      active: true,
    }, () => resolve({
      tab: tabs[0],
      method: 'update'
    }));
    chrome.windows.update(tabs[0].windowId, {
      focused: true
    });
  }
  else {
    return webext.tabs.create(createProperties, tab => resolve({
      tab,
      method: 'create'
    }));
  }
}));

webext.tabs.execute = {};
webext.tabs.execute.script = (tabId, details) => new Promise((resolve, reject) => {
  chrome.tabs.executeScript(tabId, details, arr => {
    const lastError = chrome.runtime.lastError;
    if (lastError) {
      reject(new Error(lastError.message));
    }
    else {
      resolve(arr);
    }
  });

});
