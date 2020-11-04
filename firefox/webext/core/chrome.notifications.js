/* globals webext, EventEmitter */
'use strict';

{
  const onClicked = changes => {
    webext.notifications.emit('clicked', changes);
  };

  webext.notifications = new EventEmitter({
    clicked: {
      first: () => chrome.notifications.onClicked.addListener(onClicked),
      last: () => chrome.notifications.onClicked.removeListener(onClicked)
    }
  }, chrome.notifications);
}

webext.notifications.policy = {
  create: {
    storage: 'notifications.create',
    description: 'Display desktop notifications'
  }
};

webext.notifications.create = options => {
  options = Object.assign({
    title: chrome.runtime.getManifest().name,
    type: 'basic',
    iconUrl: 'data/icons/48.png',
  }, options);
  chrome.notifications.create(options);
};
webext.policy(webext.notifications);
