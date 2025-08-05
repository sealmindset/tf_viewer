// Simple browser-side logger
// Usage: import log from './logger.js'; log('step:name', { optional: 'data' });
export default function log(step, data = {}) {
  console.log(`[%c${step}%c]`, 'color: #03A9F4; font-weight:bold;', 'color: inherit;', data);
}
