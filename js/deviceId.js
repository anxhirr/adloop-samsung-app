/**
 * Persistent device ID for AdLoop Samsung app.
 * Prefers Tizen device identifier; fallback: UUID stored in localStorage.
 */
var AdLoopDeviceId = (function () {
  var STORAGE_KEY = 'adloop_device_id';

  function generateUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Gets the device ID, creating it if needed.
   * Uses Tizen device ID if available (webapis), else UUID in localStorage.
   * @returns {string} Unique device identifier
   */
  function getDeviceId() {
    try {
      if (typeof webapis !== 'undefined' && webapis.systeminfo && webapis.systeminfo.getDeviceId) {
        return webapis.systeminfo.getDeviceId();
      }
    } catch (e) {
      console.warn('AdLoop: Tizen systeminfo not available, using localStorage fallback', e);
    }

    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
      var id = generateUuid();
      localStorage.setItem(STORAGE_KEY, id);
      return id;
    } catch (e) {
      return 'unknown_device_' + Date.now();
    }
  }

  return {
    getDeviceId: getDeviceId
  };
})();
