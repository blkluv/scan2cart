import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../config/constants';

export default function SettingsScreen({ onBack, onLogout }) {
  const [cjAffiliateId, setCjAffiliateId] = useState('');
  const [cjWebsiteId, setCjWebsiteId] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [krogerCartUrl, setKrogerCartUrl] = useState('https://www.kroger.com/cart');
  const [freeScansPerMonth, setFreeScansPerMonth] = useState('3');
  const [proPrice, setProPrice] = useState('2.99');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const data = JSON.parse(await AsyncStorage.getItem('scancart_admin') || '{}');
      if (data.cjAffiliateId) setCjAffiliateId(data.cjAffiliateId);
      if (data.cjWebsiteId) setCjWebsiteId(data.cjWebsiteId);
      if (data.affiliateLink) setAffiliateLink(data.affiliateLink);
      if (data.krogerCartUrl) setKrogerCartUrl(data.krogerCartUrl);
      if (data.freeScansPerMonth) setFreeScansPerMonth(data.freeScansPerMonth);
      if (data.proPrice) setProPrice(data.proPrice);
      if (data.analyticsEnabled !== undefined) setAnalyticsEnabled(data.analyticsEnabled);
    } catch (e) {}
  }

  async function saveSettings() {
    const data = {
      cjAffiliateId,
      cjWebsiteId,
      affiliateLink,
      krogerCartUrl: affiliateLink || krogerCartUrl,
      freeScansPerMonth,
      proPrice,
      analyticsEnabled
    };
    await AsyncStorage.setItem('scancart_admin', JSON.stringify(data));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function clearData() {
    Alert.alert('Clear All Data', 'This will log you out and clear all saved data.', [
      { text: 'Cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await AsyncStorage.clear();
        onLogout();
      }}
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity onPress={saveSettings}><Text style={styles.saveBtn}>{saved ? '✓ Saved' : 'Save'}</Text></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* CJ Affiliate */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 CJ Affiliate (Commission Junction)</Text>
          <Text style={styles.sectionDesc}>Earn commission on every Kroger order</Text>
          
          <Text style={styles.label}>CJ Affiliate ID</Text>
          <TextInput style={styles.input} value={cjAffiliateId} onChangeText={setCjAffiliateId} placeholder="Your CJ Publisher ID" placeholderTextColor={COLORS.textSecondary} />
          
          <Text style={styles.label}>CJ Website ID</Text>
          <TextInput style={styles.input} value={cjWebsiteId} onChangeText={setCjWebsiteId} placeholder="Your CJ Website/Property ID" placeholderTextColor={COLORS.textSecondary} />
          
          <Text style={styles.label}>Affiliate Cart Link</Text>
          <TextInput style={styles.input} value={affiliateLink} onChangeText={setAffiliateLink} placeholder="https://www.anrdoezrs.net/click-XXXXX-XXXXX?url=https://www.kroger.com/cart" placeholderTextColor={COLORS.textSecondary} multiline />
          <Text style={styles.hint}>Paste your full CJ deep link to Kroger cart. Users will be redirected here after adding items.</Text>
        </View>


        {/* General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ General</Text>

          <Text style={styles.label}>Default Kroger Cart URL</Text>
          <TextInput style={styles.input} value={krogerCartUrl} onChangeText={setKrogerCartUrl} placeholder="https://www.kroger.com/cart" placeholderTextColor={COLORS.textSecondary} />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Analytics Tracking</Text>
            <Switch value={analyticsEnabled} onValueChange={setAnalyticsEnabled} trackColor={{ true: COLORS.primary }} />
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>
          <TouchableOpacity style={styles.dangerBtn} onPress={onLogout}>
            <Text style={styles.dangerBtnText}>Sign Out of Kroger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dangerBtn, { marginTop: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.danger }]} onPress={clearData}>
            <Text style={[styles.dangerBtnText, { color: COLORS.danger }]}>Clear All Data</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Scan2Cart v1.0.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#fff', fontSize: 16, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  saveBtn: { color: '#fff', fontSize: 15, fontWeight: '600', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  content: { padding: 16 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  sectionDesc: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: COLORS.text },
  hint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6, lineHeight: 16 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchLabel: { fontSize: 15, color: COLORS.text },
  dangerBtn: { backgroundColor: COLORS.danger, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  dangerBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  version: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 12, marginTop: 20 },
});
