import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { COLORS } from '../config/constants';
import { ocrImage, parseVoice, searchProduct } from '../services/api';

export default function HomeScreen({ store, onScanComplete, onPickStore, onSettings, onLogout }) {
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const finalTranscript = useRef('');

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript || event.transcript || '';
    if (transcript.trim()) {
      const prev = finalTranscript.current;
      const newText = prev ? prev + ', ' + transcript.trim() : transcript.trim();
      setVoiceText(newText);
      // Only update ref on final result
      if (event.isFinal || event.results?.[0]?.isFinal) {
        finalTranscript.current = newText;
      }
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech error:', event.error);
    setIsListening(false);
  });

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, allowsEditing: false });
    if (!result.canceled && result.assets?.[0]) {
      setPreviewImage(result.assets[0].uri);
      processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      setPreviewImage(result.assets[0].uri);
      processImage(result.assets[0].base64, result.assets[0].mimeType || 'image/jpeg');
    }
  }

  async function processImage(base64, mimeType) {
    setLoading(true);
    setLoadingText('Reading your list...');
    try {
      const dataUri = `data:${mimeType};base64,${base64}`;
      const data = await ocrImage(dataUri);
      if (data.items?.length) {
        await matchAndNavigate(data.items);
      } else {
        Alert.alert('Could not read list', 'Try again or type your items manually.');
        setLoading(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to process image');
      setLoading(false);
    }
  }

  async function processManual() {
    if (!manualText.trim()) return;
    const items = manualText.split('\n').map(l => l.trim()).filter(Boolean);
    if (!items.length) return;
    await matchAndNavigate(items);
  }

  async function startListening() {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) { Alert.alert('Microphone permission needed'); return; }
    finalTranscript.current = '';
    setVoiceText('');
    setIsListening(true);
    setShowVoice(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
  }

  function stopListening() {
    setIsListening(false);
    try { ExpoSpeechRecognitionModule.stop(); } catch(e) {}
  }

  function listenAgain() {
    // Keep previous text, append new results
    const prev = voiceText || '';
    finalTranscript.current = prev;
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: 'en-US' });
  }

  async function processVoice() {
    stopListening();
    if (!voiceText.trim()) return;
    setLoading(true);
    setLoadingText('Processing your list...');
    try {
      const data = await parseVoice(voiceText);
      if (data.items?.length) {
        await matchAndNavigate(data.items);
      } else {
        const items = voiceText.split(/,|and\s/i).map(s => s.trim()).filter(Boolean);
        await matchAndNavigate(items);
      }
    } catch (e) {
      setLoading(false);
    }
  }

  async function matchAndNavigate(itemNames) {
    setLoading(true);
    const results = [];
    for (let i = 0; i < itemNames.length; i++) {
      setLoadingText(`Finding: ${itemNames[i]} (${i+1}/${itemNames.length})`);
      try {
        const data = await searchProduct(itemNames[i], store?.id);
        const p = data.data?.[0];
        results.push({
          name: itemNames[i],
          checked: true,
          krogerProduct: p ? {
            upc: p.upc,
            productId: p.productId,
            description: p.description,
            brand: p.brand,
            image: p.images?.[0]?.sizes?.find(s => s.size === 'thumbnail')?.url || p.images?.[0]?.sizes?.[0]?.url || '',
            price: p.items?.[0]?.price?.regular || p.items?.[0]?.price?.promo || 0,
            size: p.items?.[0]?.size || ''
          } : null
        });
      } catch (e) {
        results.push({ name: itemNames[i], checked: true, krogerProduct: null });
      }
    }
    setLoading(false);
    setPreviewImage(null);
    setShowManual(false);
    setShowVoice(false);
    setManualText('');
    setVoiceText('');
    onScanComplete(results);
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Scan2Cart</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity onPress={onSettings}><Text style={styles.headerBtn}>⚙️</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Store bar */}
        <TouchableOpacity style={styles.storeBar} onPress={onPickStore}>
          <Text style={styles.storeIcon}>🏪</Text>
          <View style={styles.storeInfo}>
            <Text style={styles.storeName}>{store?.name || 'Select your store'}</Text>
            <Text style={styles.storeAddr}>{store?.address || 'Tap to find stores near you'}</Text>
          </View>
          <Text style={styles.storeArrow}>›</Text>
        </TouchableOpacity>

        {/* Preview image */}
        {previewImage && (
          <View style={styles.card}>
            <Image source={{ uri: previewImage }} style={styles.previewImage} />
          </View>
        )}

        {/* Main scan card */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📋</Text>
          <Text style={styles.cardTitle}>Add Your Shopping List</Text>
          <Text style={styles.cardDesc}>Choose how to input your items</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionBtn, styles.actionPrimary]} onPress={takePhoto}>
              <Text style={styles.actionIcon}>📷</Text>
              <Text style={[styles.actionLabel, styles.actionLabelLight]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={pickPhoto}>
              <Text style={styles.actionIcon}>🖼️</Text>
              <Text style={styles.actionLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={startListening}>
              <Text style={styles.actionIcon}>🎤</Text>
              <Text style={styles.actionLabel}>Voice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowManual(!showManual)}>
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionLabel}>Type</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Manual input */}
        {showManual && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Type Your List</Text>
            <Text style={styles.cardDesc}>One item per line</Text>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder={'milk\neggs\nbread\nchicken breast'}
              placeholderTextColor={COLORS.textSecondary}
              value={manualText}
              onChangeText={setManualText}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={processManual}>
              <Text style={styles.primaryBtnText}>🔍 Find Items</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice input */}
        {showVoice && (
          <View style={styles.card}>
            <Text style={[styles.cardIcon, { fontSize: isListening ? 60 : 40 }]}>{isListening ? '🔴' : '🎤'}</Text>
            <Text style={styles.cardTitle}>{isListening ? 'Listening...' : 'Speak Your List'}</Text>
            <Text style={styles.cardDesc}>{isListening ? 'Say each item clearly' : 'Tap the mic to start'}</Text>
            {voiceText ? (
              <View style={[styles.textArea, { marginBottom: 14, justifyContent: 'flex-start' }]}>
                <Text style={{ fontSize: 15, color: COLORS.text }}>{voiceText}</Text>
              </View>
            ) : null}
            {isListening ? (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.danger, marginBottom: 10 }]} onPress={stopListening}>
                <Text style={styles.primaryBtnText}>⏹ Stop Listening</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.success, marginBottom: 10 }]} onPress={listenAgain}>
                <Text style={styles.primaryBtnText}>🎤 {voiceText ? 'Add More Items' : 'Start Listening'}</Text>
              </TouchableOpacity>
            )}
            {voiceText ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={processVoice}>
                <Text style={styles.primaryBtnText}>🔍 Find Items</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How It Works</Text>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
            <Text style={styles.stepText}>Scan, speak, or type your shopping list</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
            <Text style={styles.stepText}>We match items to Kroger products</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
            <Text style={styles.stepText}>Review and add everything to your cart</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerBtns: { flexDirection: 'row', gap: 12 },
  headerBtn: { fontSize: 22 },
  scrollContent: { padding: 16 },
  storeBar: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  storeIcon: { fontSize: 28, marginRight: 12 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  storeAddr: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  storeArrow: { fontSize: 28, color: COLORS.textSecondary },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardIcon: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  actionGrid: { flexDirection: 'row', gap: 12, width: '100%' },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  actionPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionIcon: { fontSize: 26, marginBottom: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  actionLabelLight: { color: '#fff' },
  textArea: { width: '100%', minHeight: 120, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 15, textAlignVertical: 'top', marginBottom: 14, color: COLORS.text },
  primaryBtn: { backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  step: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 12 },
  stepNum: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  stepNumText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  stepText: { fontSize: 14, color: COLORS.text, flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 16, marginTop: 16 },
  previewImage: { width: '100%', height: 200, borderRadius: 12 },
});
