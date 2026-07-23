// Re-exporting from ./interceptors loads the module and registers the interceptors
// on `api` (side effect on load) before any use.
export { api } from './config'
export { setAccessToken, refreshAccessToken } from './interceptors'
