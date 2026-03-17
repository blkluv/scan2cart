import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config/constants';

// Token management
export async function getToken() {
  return await AsyncStorage.getItem('kroger_token');
}

export async function saveTokens(data) {
  await AsyncStorage.setItem('kroger_token', data.access_token);
  if (data.refresh_token) await AsyncStorage.setItem('kroger_refresh', data.refresh_token);
  await AsyncStorage.setItem('kroger_expiry', String(Date.now() + (data.expires_in || 1800) * 1000));
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(['kroger_token', 'kroger_refresh', 'kroger_expiry', 'kroger_store']);
}

export async function isLoggedIn() {
  const token = await AsyncStorage.getItem('kroger_token');
  const expiry = parseInt(await AsyncStorage.getItem('kroger_expiry') || '0');
  return !!token && Date.now() < expiry;
}

// Exchange OAuth code for tokens
export async function exchangeCode(code, redirectUri) {
  const res = await fetch(`${API_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: redirectUri })
  });
  return res.json();
}

// Refresh token
export async function refreshToken() {
  const refresh = await AsyncStorage.getItem('kroger_refresh');
  if (!refresh) return null;
  const res = await fetch(`${API_BASE}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh })
  });
  const data = await res.json();
  if (data.access_token) await saveTokens(data);
  return data;
}

// Kroger API proxy
export async function krogerApi(path) {
  let token = await getToken();
  const expiry = parseInt(await AsyncStorage.getItem('kroger_expiry') || '0');
  if (Date.now() >= expiry) {
    const data = await refreshToken();
    if (data?.access_token) token = data.access_token;
  }
  const proxyPath = path.startsWith('/') ? path.substring(1) : path;
  const res = await fetch(`${API_BASE}/kroger/${proxyPath}`, {
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
  });
  return res.json();
}

export async function krogerApiPut(path, body) {
  let token = await getToken();
  const res = await fetch(`${API_BASE}/kroger/${path.startsWith('/') ? path.substring(1) : path}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

// OCR
export async function ocrImage(base64Image) {
  const res = await fetch(`${API_BASE}/ocr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image })
  });
  return res.json();
}

// Voice parse
export async function parseVoice(text) {
  const res = await fetch(`${API_BASE}/parse-voice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  return res.json();
}

// Search Kroger products
export async function searchProduct(term, locationId) {
  let url = `products?filter.term=${encodeURIComponent(term)}&filter.limit=1`;
  if (locationId) url += `&filter.locationId=${locationId}`;
  const data = await krogerApi(url);
  if (data.errors || !data.data?.length) {
    // Retry without location
    const data2 = await krogerApi(`products?filter.term=${encodeURIComponent(term)}&filter.limit=1`);
    return data2;
  }
  return data;
}

// Add to cart
export async function addToCart(items) {
  return krogerApiPut('cart/add', {
    items: items.map(i => ({ upc: i.upc, quantity: 1 }))
  });
}

// Get stores
export async function searchStores(zipOrLatLng) {
  if (zipOrLatLng.includes(',')) {
    return krogerApi(`locations?filter.latLong.near=${zipOrLatLng}&filter.limit=5`);
  }
  return krogerApi(`locations?filter.zipCode.near=${zipOrLatLng}&filter.limit=5`);
}

// Admin settings
export async function getAdminSettings() {
  return JSON.parse(await AsyncStorage.getItem('scancart_settings') || '{}');
}

export async function saveAdminSettings(settings) {
  await AsyncStorage.setItem('scancart_settings', JSON.stringify(settings));
}
