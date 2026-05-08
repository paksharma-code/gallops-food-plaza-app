import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

export default function ComingSoon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [plaza, setPlaza] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const p = await api.getPlaza(id as string);
        setPlaza(p);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const submit = async () => {
    if (!name.trim()) {
      Alert.alert('Missing', 'Please enter your name.');
      return;
    }
    if (!/^\+?\d{7,15}$/.test(mobile.trim())) {
      Alert.alert('Invalid mobile', 'Please enter a valid mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      await api.createNotifyRequest(id as string, name.trim(), mobile.trim());
      setDone(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !plaza) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.brandYellow} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.brandBlue }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 10 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.back} onPress={() => router.back()} testID="cs-back">
            <Ionicons name="arrow-back" size={22} color={theme.colors.brandBlueDeep} />
          </TouchableOpacity>
          <Image source={theme.brand.logo} style={styles.logo} resizeMode="contain" />
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.ribbon}>
          <Text style={styles.ribbonText}>COMING SOON</Text>
        </View>

        <Text style={styles.plazaName}>{plaza.name}</Text>
        <Text style={styles.sub}>Gallops Food Plaza · {plaza.city || 'Gujarat'}</Text>
        {!!plaza.expected_opening && (
          <Text style={styles.expected}>Expected: {plaza.expected_opening}</Text>
        )}

        {!!plaza.description && <Text style={styles.desc}>{plaza.description}</Text>}

        {!done ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Get notified when we open</Text>
            <Text style={styles.cardSub}>Be the first to know when {plaza.name} plaza opens its doors.</Text>

            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#888"
              testID="cs-name-input"
            />

            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={mobile}
              onChangeText={setMobile}
              placeholder="+91 98765 43210"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              testID="cs-mobile-input"
            />

            <TouchableOpacity
              style={[styles.btn, submitting && { opacity: 0.7 }]}
              onPress={submit}
              disabled={submitting}
              testID="cs-submit"
            >
              {submitting ? (
                <ActivityIndicator color={theme.colors.brandBlueDeep} />
              ) : (
                <>
                  <Ionicons name="notifications" size={18} color={theme.colors.brandBlueDeep} />
                  <Text style={styles.btnText}>Notify Me</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successBox}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color={theme.colors.brandBlueDeep} />
            </View>
            <Text style={styles.successTitle}>You're on the list!</Text>
            <Text style={styles.successSub}>
              We'll notify you as soon as {plaza.name} plaza is ready to welcome you.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={() => router.replace('/')} testID="cs-done">
              <Text style={styles.btnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.brandBlue },
  wrap: { padding: 20, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.brandYellow, alignItems: 'center', justifyContent: 'center',
  },
  logo: { width: 60, height: 60 },
  ribbon: {
    alignSelf: 'center', marginTop: 20, backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999,
  },
  ribbonText: { fontSize: 11, fontWeight: '900', color: theme.colors.brandBlueDeep, letterSpacing: 1 },
  plazaName: { fontSize: 34, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 16, letterSpacing: -0.8 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: 4 },
  expected: { fontSize: 13, color: theme.colors.brandYellow, textAlign: 'center', marginTop: 8, fontWeight: '700' },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 22, textAlign: 'center', marginTop: 16 },
  card: {
    backgroundColor: '#fff', marginTop: 30, borderRadius: 20, padding: 20,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: theme.colors.brandBlueDeep, marginBottom: 6 },
  cardSub: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6, marginTop: 8, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: theme.colors.textPrimary, backgroundColor: '#fff',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 18, backgroundColor: theme.colors.brandYellow, paddingVertical: 14, borderRadius: 12,
  },
  btnText: { color: theme.colors.brandBlueDeep, fontWeight: '900', fontSize: 14 },
  successBox: { alignItems: 'center', marginTop: 30, backgroundColor: '#fff', padding: 24, borderRadius: 20 },
  successIcon: {
    width: 70, height: 70, borderRadius: 35, backgroundColor: theme.colors.brandYellow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  successTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.brandBlueDeep, marginBottom: 6 },
  successSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});
