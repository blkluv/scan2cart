import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image, Alert, ActivityIndicator, Linking } from 'react-native';
import { COLORS } from '../config/constants';
import { addToCart } from '../services/api';

const CHAIN_CART_URLS = {
  'KROGER': 'https://www.kroger.com/cart',
  'KING SOOPERS': 'https://www.kingsoopers.com/cart',
  'RALPHS': 'https://www.ralphs.com/cart',
  'FRED MEYER': 'https://www.fredmeyer.com/cart',
  'HARRIS TEETER': 'https://www.harristeeter.com/cart',
  'SMITHS': 'https://www.smithsfoodanddrug.com/cart',
  "FRY'S": 'https://www.frysfood.com/cart',
  'QFC': 'https://www.qfc.com/cart',
  'DILLONS': 'https://www.dillons.com/cart',
  "MARIANO'S": 'https://www.marianos.com/cart',
  'CITY MARKET': 'https://www.citymarket.com/cart',
};

function getCartUrl(storeName) {
  const upper = (storeName || '').toUpperCase();
  for (const [chain, url] of Object.entries(CHAIN_CART_URLS)) {
    if (upper.includes(chain)) return url;
  }
  return 'https://www.kroger.com/cart';
}

export default function ResultsScreen({ items, setItems, store, onBack }) {
  const [loading, setLoading] = useState(false);

  function toggleItem(i) {
    const updated = [...items];
    updated[i] = { ...updated[i], checked: !updated[i].checked };
    setItems(updated);
  }

  function removeItem(i) {
    const updated = items.filter((_, idx) => idx !== i);
    setItems(updated);
  }

  const checkedItems = items.filter(i => i.checked && i.krogerProduct);
  const totalPrice = checkedItems.reduce((s, i) => s + (i.krogerProduct?.price || 0), 0);

  async function handleAddToCart() {
    if (!checkedItems.length) return;
    setLoading(true);
    try {
      await addToCart(checkedItems.map(i => i.krogerProduct));
      Alert.alert(
        'Added to Cart!',
        `${checkedItems.length} items added to your Kroger cart.`,
        [
          { text: 'Open Cart', onPress: () => Linking.openURL(getCartUrl(store?.chain || store?.name)) },
          { text: 'Done', onPress: onBack }
        ]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to add items to cart');
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>Your Items</Text>
        <Text style={styles.headerCount}>{items.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item, i) => (
          <View key={i} style={styles.itemCard}>
            <View style={styles.itemTop}>
              <TouchableOpacity style={[styles.checkbox, item.checked && styles.checkboxChecked]} onPress={() => toggleItem(i)}>
                {item.checked && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
              <Text style={[styles.itemName, !item.checked && styles.itemNameUnchecked]}>{item.name}</Text>
              <TouchableOpacity onPress={() => removeItem(i)}><Text style={styles.removeBtn}>✕</Text></TouchableOpacity>
            </View>
            {item.krogerProduct ? (
              <View style={styles.productRow}>
                {item.krogerProduct.image ? (
                  <Image source={{ uri: item.krogerProduct.image }} style={styles.productImg} />
                ) : <View style={[styles.productImg, styles.productImgPlaceholder]}><Text>🛒</Text></View>}
                <View style={styles.productInfo}>
                  <Text style={styles.productDesc} numberOfLines={2}>
                    {item.krogerProduct.brand} {item.krogerProduct.description}
                  </Text>
                  <Text style={styles.productSize}>{item.krogerProduct.size}</Text>
                </View>
                <Text style={styles.productPrice}>
                  {item.krogerProduct.price ? `$${item.krogerProduct.price.toFixed(2)}` : ''}
                </Text>
              </View>
            ) : (
              <Text style={styles.noMatch}>No match found</Text>
            )}
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom bar */}
      {checkedItems.length > 0 && (
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.cartCount}>{checkedItems.length} items</Text>
            <Text style={styles.cartTotal}>~${totalPrice.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={handleAddToCart} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.cartBtnText}>🛒 Add to Kroger Cart</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#fff', fontSize: 16, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1 },
  headerCount: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  itemCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  itemTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  checkboxChecked: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemName: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.text },
  itemNameUnchecked: { textDecorationLine: 'line-through', color: COLORS.textSecondary },
  removeBtn: { color: COLORS.danger, fontSize: 18, padding: 4 },
  productRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 10, padding: 10 },
  productImg: { width: 48, height: 48, borderRadius: 8, marginRight: 10 },
  productImgPlaceholder: { backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productDesc: { fontSize: 13, color: COLORS.text },
  productSize: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  productPrice: { fontSize: 16, fontWeight: '700', color: COLORS.success, marginLeft: 8 },
  noMatch: { fontSize: 13, color: COLORS.danger, fontStyle: 'italic', paddingLeft: 34 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10 },
  cartCount: { fontSize: 14, color: COLORS.textSecondary },
  cartTotal: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  cartBtn: { backgroundColor: COLORS.success, paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14 },
  cartBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
