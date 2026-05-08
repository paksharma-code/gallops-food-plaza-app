import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/api';
import { theme } from '../../src/theme';

const CATEGORIES = ['Food', 'Service', 'Cleanliness', 'Ambience', 'Other'];

export default function FeedbackScreen() {
  const { outletId: initialOutletId } = useLocalSearchParams<{ outletId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [outlets, setOutlets] = useState<any[]>([]);
  const [outletId, setOutletId] = useState<string | null>(initialOutletId || null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('Food');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const o = await api.listOutlets();
        setOutlets(o);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name';
    if (rating < 1) e.rating = 'Please give a star rating';
    if (!message.trim()) e.message = 'Please share your feedback';
    if (mobile.trim() && !/^\+?\d{7,15}$/.test(mobile.trim())) e.mobile = 'Invalid mobile';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createFeedback({
        outlet_id: outletId,
        name: name.trim(),
        mobile: mobile.trim(),
        rating,
        category,
        message: message.trim(),
      });
      setSuccess(true);
    } catch (e: any) {
      Alert.alert('Submission failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.successWrap, { paddingTop: insets.top + 50 }]} testID="feedback-success">
        <View style={styles.successIcon}>
          <Ionicons name="heart" size={42} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successSub}>
          Your feedback helps us serve you better. We truly appreciate {name}'s time.
        </Text>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/')}
          testID="feedback-done-button"
        >
          <Text style={styles.primaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} testID="feedback-back">
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>Share Feedback</Text>
          <Text style={styles.headerTitle}>We'd love your thoughts</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Which outlet?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            style={[styles.chip, outletId === null && styles.chipActive]}
            onPress={() => setOutletId(null)}
            testID="fb-outlet-overall"
          >
            <Text style={[styles.chipText, outletId === null && { color: '#fff' }]}>Overall Plaza</Text>
          </TouchableOpacity>
          {outlets.map((o) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.chip, outletId === o.id && styles.chipActive]}
              onPress={() => setOutletId(o.id)}
              testID={`fb-outlet-${o.id}`}
            >
              <Text style={[styles.chipText, outletId === o.id && { color: '#fff' }]}>{o.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.label, { marginTop: 18 }]}>Your rating</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setRating(s)} testID={`fb-star-${s}`}>
              <Ionicons name={s <= rating ? 'star' : 'star-outline'} size={36} color={s <= rating ? '#E0A300' : theme.colors.border} />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={styles.ratingLabel}>
            {['', 'Poor', 'Okay', 'Good', 'Great', 'Excellent'][rating]}
          </Text>
        )}
        {!!errors.rating && <Text style={styles.errorText}>{errors.rating}</Text>}

        <Text style={[styles.label, { marginTop: 18 }]}>What's this about?</Text>
        <View style={styles.catRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.catChip, category === c && styles.catChipActive]}
              onPress={() => setCategory(c)}
              testID={`fb-cat-${c}`}
            >
              <Text style={[styles.catChipText, category === c && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 18 }]}>Your name</Text>
        <TextInput
          style={[styles.input, errors.name && { borderColor: theme.colors.closed }]}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={theme.colors.textSecondary}
          testID="fb-name-input"
        />
        {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

        <Text style={[styles.label, { marginTop: 14 }]}>Mobile (optional)</Text>
        <TextInput
          style={[styles.input, errors.mobile && { borderColor: theme.colors.closed }]}
          value={mobile}
          onChangeText={setMobile}
          placeholder="+91 98765 43210"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="phone-pad"
          testID="fb-mobile-input"
        />
        {!!errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}

        <Text style={[styles.label, { marginTop: 14 }]}>Your feedback</Text>
        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: 'top' }, errors.message && { borderColor: theme.colors.closed }]}
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Tell us what you liked or what we can improve..."
          placeholderTextColor={theme.colors.textSecondary}
          testID="fb-message-input"
        />
        {!!errors.message && <Text style={styles.errorText}>{errors.message}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          testID="fb-submit"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  headerBack: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  overline: { fontSize: 11, color: theme.colors.textSecondary, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.4 },
  form: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  starsRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 10 },
  ratingLabel: { textAlign: 'center', color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  catChipActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },
  catChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 15, color: theme.colors.textPrimary,
  },
  errorText: { color: theme.colors.closed, fontSize: 12, marginTop: 4 },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  successWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 24, backgroundColor: theme.colors.background },
  successIcon: {
    width: 90, height: 90, borderRadius: 45,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginBottom: 20,
  },
  successTitle: { fontSize: 28, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 10, letterSpacing: -0.5 },
  successSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 30 },
});
