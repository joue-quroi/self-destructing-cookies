/* globals webext, EventEmitter */
'use strict';

/*
  webext.runtime
  Events: start-up
*/
{
  const callback = () => webext.runtime.emit('start-up');
  const onMessage = (request, sender, response) => {
    const rtns = webext.runtime.emit('message', request, sender, response);
    if (rtns.some(r => r === true)) {
      return true;
    }
  };
  const onConnect = port => webext.runtime.emit('connect', port);

  webext.runtime = new EventEmitter({
    'start-up': {
      first: () => {
        chrome.runtime.onInstalled.addListener(callback);
        chrome.runtime.onStartup.addListener(callback);
      },
      last: () => {
        chrome.runtime.onInstalled.removeListener(callback);
        chrome.runtime.onStartup.removeListener(callback);
      }
    },
    'message': {
      first: () => {
        chrome.runtime.onMessage.addListener(onMessage);
      },
      last: () => {
        chrome.runtime.onMessage.removeListener(onMessage);
      }
    },
    'connect': {
      first: () => {
        chrome.runtime.onConnect.addListener(onConnect);
      },
      last: () => {
        chrome.runtime.onConnect.removeListener(onConnect);
      }
    }
  }, chrome.runtime);
}

webext.runtime.sendMessage = (request, response) => chrome.runtime.sendMessage(request, response);

webext.runtime.connectNative = (id, message) => {
  const channel = chrome.runtime.connectNative(id);
  const responses = [];

  return {
    onMessage: c => channel.onMessage.addListener(c),
    postMessage: o => channel.postMessage(o),
    build: () => new Promise((resolve, reject) => {
      channel.onDisconnect.addListener(() => reject(new Error('channel is broken')));
      channel.onMessage.addListener(r => {
        if (r && r.code === 0) {
          r.responses = responses;
          channel.disconnect();
          resolve(r);
        }
        else if (r && isNaN(r.code) === false) {
          channel.disconnect();
          reject(r);
        }
        else if (r) {
          responses.push(r);
        }
        else {
          channel.disconnect();
          reject(new Error('empty response'));
        }
      });
      if (message) {
        channel.postMessage(message);
      }
    })
  };
};
webext.runtime.Native = function(id) {
  this.id = id;
};
webext.runtime.Native.prototype.send = function(props) {
  return new Promise(resolve => chrome.runtime.sendNativeMessage(this.id, props, resolve));
};
