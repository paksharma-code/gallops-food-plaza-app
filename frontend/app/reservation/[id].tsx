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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, formatDisplayDate } from '../../src/api';
import { theme } from '../../src/theme';

export default function ReservationForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [outlet, setOutlet] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const o = await api.getOutlet(id as string);
        setOutlet(o);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!/^\+?\d{7,15}$/.test(mobile.trim())) e.mobile = 'Enter a valid mobile number';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) e.date = 'Use format YYYY-MM-DD';
    if (!/^\d{2}:\d{2}$/.test(time.trim())) e.time = 'Use format HH:MM';
    if (guests < 1 || guests > 50) e.guests = 'Guests between 1 and 50';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await api.createReservation({
        outlet_id: id,
        name: name.trim(),
        mobile: mobile.trim(),
        date: date.trim(),
        time: time.trim(),
        guests,
        notes: notes.trim(),
      });
      setSuccess(true);
      // Auto-open WhatsApp to notify the outlet with all reservation details
      sendWhatsAppNotification();
    } catch (e: any) {
      Alert.alert('Reservation Failed', e.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendWhatsAppNotification = () => {
    if (!outlet?.mobile) return;
    const clean = outlet.mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `*New Table Reservation*\n\n` +
        `Hi ${outlet.name}, I'd like to reserve a table.\n\n` +
        `*Name:* ${name.trim()}\n` +
        `*Guests:* ${guests}\n` +
        `*Date:* ${formatDisplayDate(date.trim())}\n` +
        `*Time:* ${time.trim()}\n` +
        `*My Mobile:* ${mobile.trim()}` +
        (notes.trim() ? `\n*Notes:* ${notes.trim()}` : '') +
        `\n\nSent via Gallops Food Plaza app.`
    );
    const url = `https://wa.me/${clean}?text=${msg}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!outlet?.is_reservation_enabled) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top + 20 }]}>
        <Ionicons name="information-circle" size={42} color={theme.colors.primary} />
        <Text style={styles.notAllowed}>Reservations are only available at Gallops Restaurant.</Text>
        <TouchableOpacity style={styles.backCta} onPress={() => router.back()} testID="back-not-allowed">
          <Text style={styles.backCtaText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={[styles.successWrap, { paddingTop: insets.top + 40 }]} testID="reservation-success">
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={50} color="#fff" />
        </View>
        <Text style={styles.successTitle}>Reservation Received</Text>
        <Text style={styles.successSub}>
          Thanks {name}! We've saved your booking for {guests} on {formatDisplayDate(date)} at {time}.{'\n\n'}
          We've opened WhatsApp with your details ready to send to {outlet.name}. Just tap
          "Send" to notify the restaurant directly.
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.whatsapp, marginBottom: 12 }]}
          onPress={sendWhatsAppNotification}
          testID="reservation-resend-whatsapp"
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Send WhatsApp again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.colors.textPrimary }]}
          onPress={() => router.replace('/')}
          testID="reservation-done-button"
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
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()} testID="reservation-back">
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>Table Reservation</Text>
          <Text style={styles.headerTitle}>{outlet.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field
          label="Full Name"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          error={errors.name}
          testID="reservation-name-input"
        />
        <Field
          label="Mobile Number"
          value={mobile}
          onChangeText={setMobile}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
          error={errors.mobile}
          testID="reservation-mobile-input"
        />
        <Field
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="Pick a date"
          error={errors.date}
          inputType="date"
          testID="reservation-date-input"
        />
        <Field
          label="Time"
          value={time}
          onChangeText={setTime}
          placeholder="Pick a time"
          error={errors.time}
          inputType="time"
          testID="reservation-time-input"
        />

        <Text style={styles.label}>Number of Guests</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setGuests((g) => Math.max(1, g - 1))}
            testID="reservation-guests-decrement"
          >
            <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.counterVal} testID="reservation-guests-value">
            {guests}
          </Text>
          <TouchableOpacity
            style={styles.counterBtn}
            onPress={() => setGuests((g) => Math.min(50, g + 1))}
            testID="reservation-guests-increment"
          >
            <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Field
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special requests?"
          multiline
          testID="reservation-notes-input"
        />

        <TouchableOpacity
          style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
          onPress={submit}
          disabled={submitting}
          testID="reservation-submit-button"
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Confirm Reservation</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  multiline,
  testID,
  inputType,
  ...props
}: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' && inputType ? (
        // Use native HTML5 date/time input on web for reliable picker UX
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (require('react') as any).createElement('input', {
          type: inputType,
          value: props.value,
          onChange: (e: any) => props.onChangeText(e.target.value),
          'data-testid': testID,
          style: {
            width: '100%',
            boxSizing: 'border-box',
            border: `1px solid ${error ? theme.colors.closed : theme.colors.border}`,
            borderRadius: 16,
            padding: '14px',
            fontSize: 15,
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            fontFamily: 'inherit',
            outline: 'none',
          },
        })
      ) : (
        <TextInput
          style={[styles.input, multiline && { height: 80, textAlignVertical: 'top' }, error && { borderColor: theme.colors.closed }]}
          placeholderTextColor={theme.colors.textSecondary}
          multiline={multiline}
          testID={testID}
          {...props}
        />
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 20 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16 },
  headerBack: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  overline: { fontSize: 11, color: theme.colors.textSecondary, letterSpacing: 2, fontWeight: '700', textTransform: 'uppercase' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.4 },
  form: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  errorText: { color: theme.colors.closed, fontSize: 12, marginTop: 4 },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    marginBottom: 14,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  counterVal: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, minWidth: 40, textAlign: 'center' },
  primaryBtn: {
    marginTop: 10,
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  successWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 24, backgroundColor: theme.colors.background },
  successIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.open,
    marginBottom: 20,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, textAlign: 'center', marginBottom: 10 },
  successSub: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 30 },
  notAllowed: { fontSize: 15, color: theme.colors.textPrimary, textAlign: 'center', marginTop: 12 },
  backCta: {
    marginTop: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  backCtaText: { color: '#fff', fontWeight: '700' },
});
