/* globals webext, EventEmitter */
'use strict';

/*
  webext.contextMenus
  Events: clicked
*/
{
  const callback = tab => {
    webext.browserAction.emit('clicked', tab);
  };

  webext.browserAction = new EventEmitter({
    clicked: {
      first: () => chrome.browserAction.onClicked.addListener(callback),
      last: () => chrome.browserAction.onClicked.removeListener(callback)
    }
  }, chrome.browserAction);

  if ('browserAction' in chrome) {
    chrome.browserAction.setBadgeBackgroundColor({
      color: '#929292'
    });
  }
}
