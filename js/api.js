/**
 * AdLoop Samsung app API layer.
 * Same endpoints as Android: branch, branches, device update, heartbeat.
 */
var AdLoopApi = (function () {
  function baseUrl() {
    var url = (typeof AdLoopConfig !== 'undefined' && AdLoopConfig.API_BASE_URL) || '';
    return url.replace(/\/$/, '');
  }

  function resolveUrl(path) {
    var base = baseUrl();
    if (!base) return null;
    return base + (path.indexOf('/') === 0 ? path : '/' + path);
  }

  function resolveVideoUrl(fileUrl) {
    if (!fileUrl) return null;
    if (fileUrl.indexOf('http://') === 0 || fileUrl.indexOf('https://') === 0) return fileUrl;
    try {
      return new URL(fileUrl, baseUrl() + '/').href;
    } catch (e) {
      return baseUrl() + (fileUrl.indexOf('/') === 0 ? fileUrl : '/' + fileUrl);
    }
  }

  /**
   * GET /api/v1/branch?device_id=<id>
   * Returns { branch_id, branch_updated_at, videos[], is_paused } or null if no branch / 404.
   * @param {string} deviceId
   * @returns {Promise<object|null>}
   */
  function getBranch(deviceId) {
    var url = resolveUrl('api/v1/branch') + '?device_id=' + encodeURIComponent(deviceId);
    if (!url || url.indexOf('undefined') >= 0) return Promise.reject(new Error('API_BASE_URL not set'));
    return fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (res.status === 404) return null;
        if (!res.ok) return Promise.reject(new Error('Branch request failed: ' + res.status));
        return res.text().then(function (text) {
          if (!text || text.trim() === 'null') return null;
          return JSON.parse(text);
        });
      });
  }

  /**
   * GET /api/v1/branches/
   * Returns list of branches. Filter client-side to is_active === true.
   * @returns {Promise<Array>}
   */
  function getBranches() {
    var url = resolveUrl('api/v1/branches/');
    if (!url || url.indexOf('undefined') >= 0) return Promise.reject(new Error('API_BASE_URL not set'));
    return fetch(url, { method: 'GET', headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) return Promise.reject(new Error('Branches request failed: ' + res.status));
        return res.json();
      });
  }

  /**
   * PUT /api/v1/devices/<device_id>/ with { branch_id: "<uuid>" }
   * @param {string} deviceId
   * @param {string} branchId
   * @returns {Promise<void>}
   */
  function updateDevice(deviceId, branchId) {
    var url = resolveUrl('api/v1/devices/' + encodeURIComponent(deviceId) + '/');
    if (!url || url.indexOf('undefined') >= 0) return Promise.reject(new Error('API_BASE_URL not set'));
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ branch_id: branchId })
    }).then(function (res) {
      if (!res.ok) return Promise.reject(new Error('Update device failed: ' + res.status));
    });
  }

  /**
   * POST /api/v1/heartbeat
   * Body: { device_id, current_video_id, uptime } (uptime in seconds). Optional cache fields.
   * @param {string} deviceId
   * @param {string} currentVideoId
   * @param {number} uptimeMs
   * @param {object} [opts] optional { cache_size_bytes, cached_video_count }
   * @returns {Promise<void>}
   */
  function sendHeartbeat(deviceId, currentVideoId, uptimeMs, opts) {
    var url = resolveUrl('api/v1/heartbeat');
    if (!url || url.indexOf('undefined') >= 0) return Promise.reject(new Error('API_BASE_URL not set'));
    var uptimeSec = Math.floor((uptimeMs || 0) / 1000);
    var body = {
      device_id: deviceId,
      current_video_id: currentVideoId || '',
      uptime: uptimeSec
    };
    if (opts) {
      if (opts.cache_size_bytes != null) body.cache_size_bytes = opts.cache_size_bytes;
      if (opts.cached_video_count != null) body.cached_video_count = opts.cached_video_count;
    }
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) return Promise.reject(new Error('Heartbeat failed: ' + res.status));
    });
  }

  return {
    getBranch: getBranch,
    getBranches: getBranches,
    updateDevice: updateDevice,
    sendHeartbeat: sendHeartbeat,
    resolveVideoUrl: resolveVideoUrl,
    baseUrl: baseUrl
  };
})();
