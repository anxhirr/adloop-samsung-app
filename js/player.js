/**
 * AdLoop Samsung app video player.
 * HTML5 <video> playlist: loop, next on ended/error, current-video callback.
 */
var AdLoopPlayer = (function () {
  var videoEl = null;
  var currentVideos = [];
  var currentIndex = 0;
  var onVideoStarted = null;
  var onVideoError = null;

  function getVideoElement() {
    if (videoEl) return videoEl;
    videoEl = document.getElementById('adloop-video');
    if (!videoEl) return null;
    videoEl.addEventListener('ended', onEnded);
    videoEl.addEventListener('error', onError);
    return videoEl;
  }

  function onEnded() {
    if (currentVideos.length === 0) return;
    currentIndex = (currentIndex + 1) % currentVideos.length;
    playCurrent();
  }

  function onError() {
    var video = currentVideos[currentIndex];
    if (video && typeof onVideoError === 'function') onVideoError(video);
    if (currentVideos.length <= 1) return;
    currentIndex = (currentIndex + 1) % currentVideos.length;
    playCurrent();
  }

  function playCurrent() {
    var el = getVideoElement();
    if (!el || currentVideos.length === 0) return;
    var video = currentVideos[currentIndex];
    var url = (typeof AdLoopApi !== 'undefined' && AdLoopApi.resolveVideoUrl) ? AdLoopApi.resolveVideoUrl(video.file_url) : video.file_url;
    if (!url) {
      if (typeof onVideoError === 'function') onVideoError(video);
      onEnded();
      return;
    }
    el.src = url;
    el.load();
    el.play().catch(function (e) {
      console.warn('AdLoop player play() failed', e);
      if (typeof onVideoError === 'function') onVideoError(video);
      onEnded();
    });
    if (typeof onVideoStarted === 'function') onVideoStarted(video);
  }

  /**
   * Load a playlist and start playback. Loops to start after last video.
   * @param {Array<{id: string, file_url: string, duration?: number, updated_at?: string}>} videos
   */
  function loadBranch(videos) {
    stop();
    if (!videos || videos.length === 0) return;
    currentVideos = videos;
    currentIndex = 0;
    playCurrent();
  }

  /**
   * Stop playback and clear playlist.
   */
  function stop() {
    var el = getVideoElement();
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
    currentVideos = [];
    currentIndex = 0;
  }

  /**
   * Resume playback if we have a playlist.
   */
  function play() {
    if (currentVideos.length === 0) return;
    var el = getVideoElement();
    if (el && el.src) el.play();
  }

  /**
   * Pause playback.
   */
  function pause() {
    var el = getVideoElement();
    if (el) el.pause();
  }

  /**
   * Set callback when a video starts playing.
   * @param {function({id: string})} fn
   */
  function setOnVideoStarted(fn) {
    onVideoStarted = fn;
  }

  /**
   * Set callback when a video fails.
   * @param {function({id: string})} fn
   */
  function setOnVideoError(fn) {
    onVideoError = fn;
  }

  /**
   * Get currently playing video item, or null.
   */
  function getCurrentVideo() {
    return currentVideos[currentIndex] || null;
  }

  return {
    loadBranch: loadBranch,
    stop: stop,
    play: play,
    pause: pause,
    setOnVideoStarted: setOnVideoStarted,
    setOnVideoError: setOnVideoError,
    getCurrentVideo: getCurrentVideo
  };
})();
