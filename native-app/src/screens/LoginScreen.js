import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { COLORS, KROGER_CLIENT_ID, SCOPES } from '../config/constants';
import { exchangeCode, saveTokens } from '../services/api';

const { width } = Dimensions.get('window');
const REDIRECT_URI = 'https://scan2cart.vercel.app/krog/callback.html';

export default function LoginScreen({ onLogin }) {
  async function handleLogin() {
    try {
      const authUrl = `https://api.kroger.com/v1/connect/oauth2/authorize?scope=${encodeURIComponent(SCOPES)}&response_type=code&client_id=${KROGER_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

      // Listen for the redirect back
      const listener = Linking.addEventListener('url', async (event) => {
        listener.remove();
        const url = event.url;
        if (url && url.includes('code=')) {
          const code = new URL(url).searchParams.get('code');
          if (code) {
            const data = await exchangeCode(code, REDIRECT_URI);
            if (data.access_token) {
              await saveTokens(data);
              onLogin();
            }
          }
        }
      });

      const result = await WebBrowser.openBrowserAsync(authUrl);

      // If browser was dismissed without completing, clean up listener
      if (result.type === 'cancel' || result.type === 'dismiss') {
        listener.remove();
      }
    } catch (e) {
      Alert.alert('Login Error', e.message || 'Something went wrong');
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.gradient} contentContainerStyle={styles.content}>
          <Text style={styles.icon}>🛒</Text>
          <Text style={styles.title}>Scan2Cart</Text>
          <Text style={styles.subtitle}>Scan your shopping list.{'\n'}Add items to your cart instantly.</Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>📷</Text>
              <Text style={styles.featureText}>Scan handwritten lists</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🎤</Text>
              <Text style={styles.featureText}>Speak your items</Text>
            </View>
            <View style={styles.featureRow}>
              <Text style={styles.featureIcon}>🛒</Text>
              <Text style={styles.featureText}>Auto-add to your store's cart</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Did you know? Stores like King Soopers, Fry's, Ralphs, Fred Meyer, and more are all part of the Kroger family. You'll sign in with your Kroger account — it's the same login you use for your store's app or website.</Text>
          </View>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Sign in with Kroger</Text>
          </TouchableOpacity>

          <View style={styles.storesBanner}>
            <Text style={styles.storesTitle}>Supported stores</Text>
            <View style={styles.storesGrid}>
              {['Kroger', 'King Soopers', 'Ralphs', 'Fred Meyer', 'Harris Teeter', "Smith's", "Fry's", 'QFC', 'Dillons', "Mariano's", 'Pick N Save', "Baker's", 'City Market', 'Metro Market', 'Pay Less', 'Gerbes'].map(name => (
                <View key={name} style={styles.storeChip}>
                  <Text style={styles.storeChipText}>{name}</Text>
                </View>
              ))}
            </View>
          </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, backgroundColor: COLORS.primary },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 40 },
  icon: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 42, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 18, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  features: { width: '100%', marginBottom: 40 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 20 },
  featureIcon: { fontSize: 24, marginRight: 14, width: 32 },
  featureText: { fontSize: 16, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  infoBox: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 14, marginBottom: 24, width: '100%' },
  infoText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  loginBtn: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 30, width: width - 80, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  storesBanner: { marginTop: 30, width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center' },
  storesTitle: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  storesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  storeChip: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, margin: 3 },
  storeChipText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '500' },
});
