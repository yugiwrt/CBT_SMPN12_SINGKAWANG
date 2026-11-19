import { CONFIG } from './config.js';

export async function callGasApi(action, payload = {}) {
  const token = localStorage.getItem('cbt_token') || '';
  const res = await fetch(CONFIG.GAS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Bebas CORS preflight
    body: JSON.stringify({ action, token, payload })
  });
  const data = await res.json();
  if (data.code === 'UNAUTHORIZED') {
    localStorage.clear();
    window.location.reload();
  }
  return data;
}