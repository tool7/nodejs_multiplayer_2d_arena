(function () {

  class SimpleEventEmitter {

    constructor () {
      this.events = {};
    }
    
    registerEventListener (eventName, listener) {
      if (!this.events[eventName]) {
        this.events[eventName] = [];
      }

      this.events[eventName].push(listener);
    }

    unregisterEventListener (eventName, listener) {
      if (!this.events[eventName]) { return; }
      
      const index = this.events[eventName].indexOf(listener);
      if (index > -1) {
        this.events[eventName].splice(index, 1);
      }
    }

    dispatch (eventName, data) {
      if (!this.events[eventName]) { return; }

      this.events[eventName].forEach(listener => listener(data));
    }
  }

  if ('undefined' !== typeof global) {
    module.exports = global.SimpleEventEmitter = SimpleEventEmitter;
  }
  else {
    window.SimpleEventEmitter = SimpleEventEmitter;
  }
}());
