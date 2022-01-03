'use strict';

var webext = {};

{
  const cache = [];
  webext.policy = root => {
    Object.keys(root.policy).forEach(key => {
      const pointer = root[key];
      const storage = root.policy[key].storage;
      cache.push(root.policy[key]);

      root[key] = function() {
        if (localStorage.getItem(storage) === 'deny') {
          return;
        }
        pointer.apply(this, arguments);
      };
    });
  };
  webext.policy.collect = () => cache;
}
