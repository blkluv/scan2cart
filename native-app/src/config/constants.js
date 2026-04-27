// ----------------------------------------------------------------------
//  Environment-aware configuration – no hardcoded production URLs
// ----------------------------------------------------------------------

// Helper to get env variables (works with Vite, Create React App, and Node)
const getEnv = (key: string, defaultValue?: string): string => {
  // Vite: import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key] as string;
  }
  // Create React App / Webpack: process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return defaultValue || '';
};

// ----------------------------------------------------------------------
//  API & OAuth endpoints
// ----------------------------------------------------------------------

// Base URL for your backend API – default to localhost for development
export const API_BASE = getEnv('VITE_API_BASE') ||
                       getEnv('REACT_APP_API_BASE') ||
                       (typeof window !== 'undefined' ? window.location.origin + '/krog/api' : 'http://localhost:3000/krog/api');

// Kroger's OAuth2 authorization endpoint
export const KROGER_AUTH_URL = 'https://api.kroger.com/v1/connect/oauth2';

// Client ID – must be set in environment variables (VITE_KROGER_CLIENT_ID or REACT_APP_KROGER_CLIENT_ID)
export const KROGER_CLIENT_ID = getEnv('VITE_KROGER_CLIENT_ID') ||
                               getEnv('REACT_APP_KROGER_CLIENT_ID') ||
                               '';   // No fallback – you must set this in Vercel

// Redirect URI – dynamic based on where the app is running (root of the domain)
// This avoids hardcoded /krog/callback.html and works on any deployment URL.
export const REDIRECT_URI = typeof window !== 'undefined'
  ? window.location.origin + '/'   // e.g. https://scan2cart.vercel.app/
  : '';

// Required OAuth scopes
export const SCOPES = 'product.compact cart.basic:write profile.compact';

// ----------------------------------------------------------------------
//  UI constants (no change needed)
// ----------------------------------------------------------------------
export const COLORS = {
  primary: '#1a73e8',
  primaryDark: '#1557b0',
  secondary: '#34a853',
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#202124',
  textSecondary: '#5f6368',
  border: '#e8eaed',
  danger: '#ea4335',
  warning: '#fbbc04',
  success: '#34a853',
  gradient1: '#667eea',
  gradient2: '#764ba2',
};