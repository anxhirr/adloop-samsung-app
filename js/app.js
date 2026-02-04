/**
 * AdLoop Samsung app state machine.
 * Startup, branch fetch, branch selection, playback/messages, heartbeat & branch-check timers, visibility/resume.
 */
var AdLoopApp = (function () {
  var appStartTime = 0;
  var deviceId = '';
  var state = {
    hasBranch: false,
    hasVideos: false,
    isPaused: false,
    currentVideos: [],
    currentVideoId: '',
    lastBranchId: null,
    lastPaused: null
  };
  var heartbeatTimer = null;
  var branchCheckTimer = null;

  var SCREEN_BRANCH = 'branch';
  var SCREEN_MESSAGE = 'message';
  var SCREEN_VIDEO = 'video';

  function getEl(id) {
    return document.getElementById(id);
  }

  function showScreen(screen) {
    var branchScreen = getEl('adloop-branch-screen');
    var messageScreen = getEl('adloop-message-screen');
    var videoScreen = getEl('adloop-video-screen');
    if (branchScreen) branchScreen.classList.toggle('adloop-hidden', screen !== SCREEN_BRANCH);
    if (messageScreen) messageScreen.classList.toggle('adloop-hidden', screen !== SCREEN_MESSAGE);
    if (videoScreen) videoScreen.classList.toggle('adloop-hidden', screen !== SCREEN_VIDEO);
  }

  function setMessageText(text, subtext) {
    var msg = getEl('adloop-message-title');
    var sub = getEl('adloop-message-subtitle');
    if (msg) msg.textContent = text || '';
    if (sub) sub.textContent = subtext || '';
  }

  function startTimers() {
    stopTimers();
    var interval = (typeof AdLoopConfig !== 'undefined' && AdLoopConfig.HEARTBEAT_INTERVAL_MS) || 10000;
    heartbeatTimer = setInterval(sendHeartbeat, interval);
    branchCheckTimer = setInterval(checkBranch, (typeof AdLoopConfig !== 'undefined' && AdLoopConfig.BRANCH_CHECK_INTERVAL_MS) || 10000);
  }

  function stopTimers() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    if (branchCheckTimer) clearInterval(branchCheckTimer);
    branchCheckTimer = null;
  }

  function sendHeartbeat() {
    if (!deviceId || !AdLoopApi) return;
    var uptime = Date.now() - appStartTime;
    AdLoopApi.sendHeartbeat(deviceId, state.currentVideoId || '', uptime, { cache_size_bytes: 0, cached_video_count: 0 }).catch(function () {});
  }

  function applyBranch(branch) {
    if (!branch) {
      state.hasBranch = false;
      state.hasVideos = false;
      state.isPaused = false;
      state.currentVideos = [];
      state.currentVideoId = '';
      state.lastBranchId = null;
      state.lastPaused = null;
      AdLoopPlayer.stop();
      stopTimers();
      showScreen(SCREEN_BRANCH);
      loadBranchList();
      return;
    }
    state.hasBranch = true;
    state.isPaused = !!branch.is_paused;
    state.lastBranchId = branch.branch_id;
    state.lastPaused = branch.is_paused;
    if (state.isPaused) {
      state.hasVideos = false;
      state.currentVideoId = '';
      AdLoopPlayer.stop();
      stopTimers();
      sendHeartbeat();
      setMessageText('Display paused', 'Playback will resume when started again from the admin panel.');
      showScreen(SCREEN_MESSAGE);
      return;
    }
    state.currentVideos = branch.videos || [];
    state.hasVideos = state.currentVideos.length > 0;
    if (!state.hasVideos) {
      state.currentVideoId = '';
      AdLoopPlayer.stop();
      stopTimers();
      sendHeartbeat();
      setMessageText('No videos available', 'Waiting for videos to be assigned to this branch…');
      showScreen(SCREEN_MESSAGE);
      return;
    }
    AdLoopPlayer.setOnVideoStarted(function (video) {
      state.currentVideoId = video.id || '';
    });
    AdLoopPlayer.setOnVideoError(function () {});
    AdLoopPlayer.loadBranch(state.currentVideos);
    startTimers();
    showScreen(SCREEN_VIDEO);
  }

  function checkBranch() {
    if (!deviceId || !AdLoopApi) return;
    AdLoopApi.getBranch(deviceId)
      .then(function (branch) {
        if (branch === null) {
          applyBranch(null);
          return;
        }
        var branchChanged = state.lastBranchId !== null && state.lastBranchId !== branch.branch_id;
        var pausedChanged = state.lastPaused !== null && state.lastPaused !== branch.is_paused;
        var videosChanged = !state.currentVideos.length && (branch.videos || []).length > 0;
        if (branch.videos && state.currentVideos.length) {
          var sameIds = branch.videos.length === state.currentVideos.length &&
            branch.videos.every(function (v, i) {
              return state.currentVideos[i] && v.id === state.currentVideos[i].id && v.updated_at === state.currentVideos[i].updated_at;
            });
          if (!sameIds) videosChanged = true;
        } else if ((branch.videos || []).length !== state.currentVideos.length) videosChanged = true;
        if (branchChanged || pausedChanged || videosChanged || state.lastBranchId === null) {
          applyBranch(branch);
        }
      })
      .catch(function () {});
  }

  function loadBranchList() {
    var listEl = getEl('adloop-branch-list');
    var loadingEl = getEl('adloop-branch-loading');
    var errorEl = getEl('adloop-branch-error');
    var emptyEl = getEl('adloop-branch-empty');
    if (!listEl) return;
    if (loadingEl) loadingEl.classList.remove('adloop-hidden');
    if (errorEl) errorEl.classList.add('adloop-hidden');
    if (emptyEl) emptyEl.classList.add('adloop-hidden');
    listEl.innerHTML = '';
    if (!AdLoopApi) {
      if (loadingEl) loadingEl.classList.add('adloop-hidden');
      if (errorEl) { errorEl.classList.remove('adloop-hidden'); errorEl.textContent = 'API not configured.'; }
      return;
    }
    AdLoopApi.getBranches()
      .then(function (branches) {
        if (loadingEl) loadingEl.classList.add('adloop-hidden');
        var active = (branches || []).filter(function (b) { return b.is_active; });
        if (active.length === 0) {
          if (emptyEl) { emptyEl.classList.remove('adloop-hidden'); emptyEl.textContent = 'No active branches available.'; }
          return;
        }
        active.forEach(function (branch) {
          var item = document.createElement('button');
          item.type = 'button';
          item.className = 'adloop-branch-item';
          item.setAttribute('data-branch-id', branch.id);
          var name = (branch.name || 'Branch ' + branch.id).trim();
          var desc = (branch.description || '').trim();
          var count = (branch.video_count != null ? branch.video_count : 0);
          item.innerHTML = '<span class="adloop-branch-name">' + escapeHtml(name) + '</span>' +
            (desc ? '<span class="adloop-branch-desc">' + escapeHtml(desc) + '</span>' : '') +
            '<span class="adloop-branch-count">' + count + ' video(s)</span>';
          item.addEventListener('click', function () { onBranchSelect(branch.id, listEl, loadingEl, errorEl); });
          listEl.appendChild(item);
        });
      })
      .catch(function (err) {
        if (loadingEl) loadingEl.classList.add('adloop-hidden');
        if (errorEl) {
          errorEl.classList.remove('adloop-hidden');
          errorEl.textContent = 'Failed to load branches. ' + (err && err.message ? err.message : '');
        }
      });
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function onBranchSelect(branchId, listEl, loadingEl, errorEl) {
    var assigningEl = getEl('adloop-branch-assigning');
    if (assigningEl) assigningEl.classList.remove('adloop-hidden');
    if (listEl) listEl.style.pointerEvents = 'none';
    AdLoopApi.updateDevice(deviceId, branchId)
      .then(function () {
        if (assigningEl) assigningEl.classList.add('adloop-hidden');
        if (listEl) listEl.style.pointerEvents = '';
        checkBranch();
      })
      .catch(function (err) {
        if (assigningEl) assigningEl.classList.add('adloop-hidden');
        if (listEl) listEl.style.pointerEvents = '';
        var errorEl = getEl('adloop-branch-error');
        if (errorEl) {
          errorEl.classList.remove('adloop-hidden');
          errorEl.textContent = 'Failed to assign branch. ' + (err && err.message ? err.message : '');
        }
      });
  }

  function start() {
    appStartTime = Date.now();
    deviceId = (typeof AdLoopDeviceId !== 'undefined' && AdLoopDeviceId.getDeviceId) ? AdLoopDeviceId.getDeviceId() : '';
    if (!deviceId) deviceId = 'unknown_device_' + Date.now();

    showScreen(SCREEN_BRANCH);
    setMessageText('', '');
    var checkingEl = getEl('adloop-branch-checking');
    if (checkingEl) checkingEl.classList.remove('adloop-hidden');
    var listEl = getEl('adloop-branch-list');
    if (listEl) listEl.innerHTML = '';
    var loadingEl = getEl('adloop-branch-loading');
    var errorEl = getEl('adloop-branch-error');
    var emptyEl = getEl('adloop-branch-empty');
    if (loadingEl) loadingEl.classList.add('adloop-hidden');
    if (errorEl) errorEl.classList.add('adloop-hidden');
    if (emptyEl) emptyEl.classList.add('adloop-hidden');

    AdLoopApi.sendHeartbeat(deviceId, '', 0).then(function () {
      return AdLoopApi.getBranch(deviceId);
    }).then(function (branch) {
      if (checkingEl) checkingEl.classList.add('adloop-hidden');
      if (branch === null) {
        loadBranchList();
        return;
      }
      applyBranch(branch);
    }).catch(function () {
      if (checkingEl) checkingEl.classList.add('adloop-hidden');
      loadBranchList();
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkBranch();
    });
  }

  function init() {
    if (typeof tizen !== 'undefined' && tizen.application) {
      document.addEventListener('keydown', function (e) {
        if (e.keyCode === 10009) tizen.application.getCurrentApplication().exit();
      });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  return {
    init: init,
    checkBranch: checkBranch
  };
})();
