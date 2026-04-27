import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { COLORS } from './src/config/constants';
import { exchangeCode, saveTokens } from './src/services/api';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StorePickerScreen from './src/screens/StorePickerScreen';

export default function App() {
  const [screen, setScreen] = useState('loading');
  const [scannedItems, setScannedItems] = useState([]);
  const [store, setStore] = useState(null);

  useEffect(() => {
    checkLogin();
    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, []);

  async function handleDeepLink(event) {
    const url = event.url;
    if (!url || !url.includes('code=')) return;
    try {
      const match = url.match(/code=([^&]+)/);
      if (match) {
        const data = await exchangeCode(decodeURIComponent(match[1]), 'https://scan2cart.vercel.app/krog/callback.html');
        if (data.access_token) {
          await saveTokens(data);
          setScreen('home');
        }
      }
    } catch (e) {}
  }

  async function checkLogin() {
    const token = await AsyncStorage.getItem('kroger_token');
    const expiry = parseInt(await AsyncStorage.getItem('kroger_expiry') || '0');
    const savedStore = await AsyncStorage.getItem('kroger_store');
    if (savedStore) setStore(JSON.parse(savedStore));
    setScreen(token && Date.now() < expiry ? 'home' : 'login');
  }

  async function onLogin() {
    await checkLogin();
    // Force store selection if no store is saved
    const savedStore = await AsyncStorage.getItem('kroger_store');
    if (savedStore) {
      setStore(JSON.parse(savedStore));
      setScreen('home');
    } else {
      setScreen('store');
    }
  }

  function onScanComplete(items) {
    setScannedItems(items);
    setScreen('results');
  }

  function onStoreSelect(s) {
    setStore(s);
    AsyncStorage.setItem('kroger_store', JSON.stringify(s));
    setScreen('home');
  }

  async function onLogout() {
    await AsyncStorage.multiRemove(['kroger_token', 'kroger_refresh', 'kroger_expiry']);
    setScreen('login');
  }

  if (screen === 'loading') return <View style={styles.container}><StatusBar style="light" /></View>;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen === 'login' && <LoginScreen onLogin={onLogin} />}
      {screen === 'home' && (
        <HomeScreen
          store={store}
          onScanComplete={onScanComplete}
          onPickStore={() => setScreen('store')}
          onSettings={() => setScreen('settings')}
          onLogout={onLogout}
        />
      )}
      {screen === 'results' && (
        <ResultsScreen
          items={scannedItems}
          setItems={setScannedItems}
          store={store}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'store' && (
        <StorePickerScreen
          onSelect={onStoreSelect}
          onBack={() => setScreen('home')}
          required={!store}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen onBack={() => setScreen('home')} onLogout={onLogout} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
