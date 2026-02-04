/**
 * AdLoop Samsung app configuration.
 * Set API_BASE_URL to your backend (e.g. http://<server-ip>:8000/).
 */
var AdLoopConfig = {
  /** Backend API base URL (no trailing slash). Example: http://192.168.1.100:8000 */
  // API_BASE_URL: 'http://127.0.0.1:8000',
  API_BASE_URL: 'http://ads.distribution.al:8000',

  /** Heartbeat interval in milliseconds (default 10 seconds). */
  HEARTBEAT_INTERVAL_MS: 10000,

  /** Branch check interval in milliseconds (default 10 seconds). */
  BRANCH_CHECK_INTERVAL_MS: 10000
};
