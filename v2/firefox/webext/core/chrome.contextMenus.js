/* globals webext, EventEmitter */
'use strict';

/*
  webext.contextMenus
  Events: clicked
*/
{
  const callback = (info, tab) => {
    webext.contextMenus.emit('clicked', info, tab);
  };

  webext.contextMenus = new EventEmitter({
    clicked: {
      first: () => chrome.contextMenus.onClicked.addListener(callback),
      last: () => chrome.contextMenus.onClicked.removeListener(callback)
    }
  }, chrome.contextMenus);
}

webext.contextMenus.batch = arr => arr.forEach(createData => webext.contextMenus.create(createData));
webext.contextMenus.removeAll = () => new Promise(resolve => chrome.contextMenus.removeAll(resolve));
webext.contextMenus.remove = menuItemId => new Promise(resolve => chrome.contextMenus.remove(menuItemId, resolve));
