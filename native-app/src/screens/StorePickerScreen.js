import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../config/constants';
import { searchStores } from '../services/api';

export default function StorePickerScreen({ onSelect, onBack, required }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zip, setZip] = useState('');

  useEffect(() => {
    findNearby();
  }, []);

  async function findNearby() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        const data = await searchStores(`${loc.coords.latitude},${loc.coords.longitude}`);
        if (data.data?.length) { setStores(data.data); setLoading(false); return; }
      }
    } catch (e) {}
    setLoading(false);
  }

  async function searchByZip() {
    if (!zip.trim()) return;
    setLoading(true);
    const data = await searchStores(zip.trim());
    setStores(data.data || []);
    setLoading(false);
  }

  function selectStore(s) {
    const addr = s.address ? `${s.address.addressLine1}, ${s.address.city}` : '';
    onSelect({ id: s.locationId, name: s.name, address: addr });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!required && <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>}
        <Text style={styles.headerTitle}>{required ? 'Select Your Store' : 'Select Store'}</Text>
      </View>
      {required && (
        <View style={{ backgroundColor: 'rgba(26,115,232,0.08)', padding: 14, marginHorizontal: 16, marginTop: 8, borderRadius: 12 }}>
          <Text style={{ fontSize: 13, color: COLORS.text, textAlign: 'center', lineHeight: 19 }}>Choose your local store so we can find the right products and prices for you.</Text>
        </View>
      )}

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter zip code..."
          placeholderTextColor={COLORS.textSecondary}
          value={zip}
          onChangeText={setZip}
          keyboardType="number-pad"
          onSubmitEditing={searchByZip}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={searchByZip}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingTxt}>Finding stores...</Text></View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={s => s.locationId}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No stores found. Try a different zip code.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.storeCard} onPress={() => selectStore(item)}>
              <Text style={styles.storeIcon}>🏪</Text>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{item.name}</Text>
                <Text style={styles.storeAddr}>
                  {item.address ? `${item.address.addressLine1}, ${item.address.city} ${item.address.state}` : ''}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#fff', fontSize: 16, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  searchBar: { flexDirection: 'row', padding: 16, gap: 10 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  storeIcon: { fontSize: 32, marginRight: 14 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  storeAddr: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTxt: { marginTop: 12, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 15 },
});
