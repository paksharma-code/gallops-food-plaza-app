import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { theme } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The outlet on whose page/card this modal opened (optional) */
  outlet?: { id: string; name?: string; plaza_id?: string | null } | null;
  /** Plaza id as fallback context if outlet is not passed */
  plazaId?: string | null;
  /** The specific offer the user tapped on (preferred) */
  offer?: { id: string; title?: string } | null;
};

type ClaimResult = {
  token: string;
  valid_until_display: string;
  offer: { title?: string; description?: string; image?: string } | null;
  outlet_name: string;
  plaza_name?: string;
  routed_to?: string;
  whatsapp_link: string;
  whatsapp_message: string;
  mobile: string;
  already_claimed?: boolean;
  message?: string;
};

export default function OfferClaimModal({ visible, onClose, outlet, plazaId, offer }: Props) {
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [dob, setDob] = useState('');
  const [anniversary, setAnniversary] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('form');
      setErrorMsg('');
      setResult(null);
    }
  }, [visible]);

  const handleMobile = (t: string) => {
    // Allow only digits, up to 10 chars
    const clean = t.replace(/[^0-9]/g, '').slice(0, 10);
    setMobile(clean);
  };

  /**
   * Normalise user-typed dates to ISO (YYYY-MM-DD) for storage.
   * Accepts:
   *   DD-MM-YYYY   DD/MM/YYYY   DD.MM.YYYY
   *   D-M-YYYY     D/M/YYYY     D.M.YYYY
   *   YYYY-MM-DD   YYYY/MM/DD   YYYY.MM.DD
   * Returns "" on invalid input (still allowed — these are optional fields
   * unless the user typed something non-empty, in which case we error).
   */
  const normaliseDate = (raw: string): { iso: string; ok: boolean } => {
    const s = (raw || '').trim();
    if (!s) return { iso: '', ok: true };
    const parts = s.split(/[-/.]/).map((x) => x.trim());
    if (parts.length !== 3) return { iso: '', ok: false };
    let day: string, month: string, year: string;
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      [year, month, day] = parts;
    } else {
      // DD-MM-YYYY
      [day, month, year] = parts;
    }
    if (year.length !== 4) return { iso: '', ok: false };
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return { iso: '', ok: false };
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
      return { iso: '', ok: false };
    }
    const dd = String(d).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return { iso: `${y}-${mm}-${dd}`, ok: true };
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (mobile.length !== 10 || !'6789'.includes(mobile[0])) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }
    const dobN = normaliseDate(dob);
    if (!dobN.ok) {
      setErrorMsg('Date of Birth must be DD-MM-YYYY (or leave blank).');
      return;
    }
    const annN = normaliseDate(anniversary);
    if (!annN.ok) {
      setErrorMsg('Anniversary must be DD-MM-YYYY (or leave blank).');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.createOfferClaim({
        name: name.trim(),
        mobile,
        dob: dobN.iso,
        anniversary: annN.iso,
        plaza_id: plazaId || outlet?.plaza_id || null,
        outlet_id: outlet?.id || null,
        offer_id: offer?.id || null,
      });
      setResult(data);
      setStep('result');
    } catch (e: any) {
      setErrorMsg(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = async () => {
    if (!result?.whatsapp_link) {
      Alert.alert(
        'WhatsApp unavailable',
        "This outlet hasn't configured a WhatsApp number yet. Please show the token at the counter."
      );
      return;
    }
    const waUrl = result.whatsapp_link; // https://wa.me/{digits}?text=...
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // We might be embedded inside an <iframe> (e.g. preview environment).
        // WhatsApp's api.whatsapp.com refuses to load in a frame, so we must
        // break out and open the link in the TOP window — either as a new tab
        // or by taking over the top-level location.
        const w: any = window as any;
        // 1) Try to open a new tab from the top window (escapes the iframe)
        try {
          const top = w.top || w;
          const popup = top.open(waUrl, '_blank', 'noopener,noreferrer');
          if (popup) return;
        } catch {
          /* cross-origin top access blocked — fall through */
        }
        // 2) Try a normal new-tab open from the current window
        const popup2 = w.open(waUrl, '_blank', 'noopener,noreferrer');
        if (popup2) return;
        // 3) Last resort: force the top window to navigate
        try {
          (w.top || w).location.href = waUrl;
          return;
        } catch {
          w.location.href = waUrl;
        }
        return;
      }
      // Native (Android / iOS): try the native deep link first, fall back to wa.me.
      const digitsMatch = waUrl.match(/wa\.me\/(\d+)/);
      const digits = digitsMatch ? digitsMatch[1] : '';
      const textMatch = waUrl.match(/\?text=(.*)$/);
      const textEncoded = textMatch ? textMatch[1] : '';
      const native = `whatsapp://send?phone=${digits}&text=${textEncoded}`;
      try {
        const can = await Linking.canOpenURL(native);
        if (can) {
          await Linking.openURL(native);
          return;
        }
      } catch {
        /* fall through */
      }
      await Linking.openURL(waUrl);
    } catch (e: any) {
      Alert.alert('Could not open WhatsApp', e?.message || 'Please try again.');
    }
  };

  const close = () => {
    // reset form fields on close
    setName('');
    setMobile('');
    setDob('');
    setAnniversary('');
    setResult(null);
    setErrorMsg('');
    setStep('form');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={close} />
        <View style={styles.sheet} testID="offer-claim-modal">
          <View style={styles.sheetHandle} />
          {step === 'form' ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Ionicons name="pricetag" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Claim Offer of the Day</Text>
                  <Text style={styles.subtitle}>
                    {outlet?.name
                      ? `Gallops Food Plaza · ${outlet.name}`
                      : 'Quick signup — no OTP needed'}
                  </Text>
                </View>
                <TouchableOpacity onPress={close} testID="offer-claim-close">
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>
                Name <Text style={styles.req}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                placeholderTextColor={theme.colors.textSecondary}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                testID="offer-claim-name"
              />

              <Text style={styles.label}>
                Mobile / WhatsApp Number <Text style={styles.req}>*</Text>
              </Text>
              <View style={styles.phoneRow}>
                <View style={styles.phonePrefix}>
                  <Text style={styles.phonePrefixText}>+91</Text>
                </View>
                <TextInput
                  style={[styles.input, styles.phoneInput]}
                  placeholder="98XXXXXXXX"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={mobile}
                  onChangeText={handleMobile}
                  keyboardType="number-pad"
                  maxLength={10}
                  testID="offer-claim-mobile"
                />
              </View>

              <Text style={styles.label}>Date of Birth <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={theme.colors.textSecondary}
                value={dob}
                onChangeText={setDob}
                testID="offer-claim-dob"
              />

              <Text style={styles.label}>Anniversary <Text style={styles.optional}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={theme.colors.textSecondary}
                value={anniversary}
                onChangeText={setAnniversary}
                testID="offer-claim-anniversary"
              />

              {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

              <TouchableOpacity
                style={[styles.primaryBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={submitting}
                testID="offer-claim-submit"
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="gift" size={18} color="#fff" />
                    <Text style={styles.primaryBtnText}>Show My Offer</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.disclaimer}>
                Your details are used only to deliver the offer and improve your experience.
                By continuing you agree to be contacted by Gallops Food Plaza.
              </Text>
            </ScrollView>
          ) : (
            // -------- Result screen --------
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <View style={[styles.headerIcon, { backgroundColor: theme.colors.brandYellow }]}>
                  <Ionicons name="sparkles" size={22} color={theme.colors.brandBlueDeep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>
                    {result?.already_claimed ? 'Already Claimed Today' : "You're All Set!"}
                  </Text>
                  <Text style={styles.subtitle}>
                    {result?.routed_to
                      ? `Sending to ${result.routed_to}`
                      : result?.outlet_name
                      ? `Show this token at ${result.outlet_name}`
                      : 'Show this token at the counter'}
                  </Text>
                </View>
                <TouchableOpacity onPress={close} testID="offer-claim-close-result">
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {result?.already_claimed && (
                <View style={styles.alreadyBanner} testID="offer-claim-already-banner">
                  <Ionicons name="information-circle" size={18} color="#92400E" />
                  <Text style={styles.alreadyBannerText}>
                    {result?.message ||
                      'You have already claimed an offer today. Here is your existing token — valid until end of day.'}
                  </Text>
                </View>
              )}

              {/* Offer card */}
              <View style={styles.offerCard}>
                {result?.offer?.image ? (
                  <Image source={{ uri: result.offer.image }} style={styles.offerImg} />
                ) : (
                  <View style={[styles.offerImg, styles.offerImgPh]}>
                    <Ionicons name="pricetag" size={40} color={theme.colors.brandBlue} />
                  </View>
                )}
                <Text style={styles.offerTitle}>
                  {result?.offer?.title || 'Offer of the Day'}
                </Text>
                {!!result?.offer?.description && (
                  <Text style={styles.offerDesc}>{result.offer.description}</Text>
                )}
              </View>

              {/* Token */}
              <View style={styles.tokenBox}>
                <Text style={styles.tokenLabel}>Your Offer Token</Text>
                <Text style={styles.tokenValue} testID="offer-claim-token">{result?.token}</Text>
                <Text style={styles.tokenHint}>
                  Valid till {result?.valid_until_display}
                </Text>
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="call-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.metaText}>+91{result?.mobile}</Text>
              </View>

              {/* WhatsApp CTA — we intentionally do NOT render this as an <a href>
                   anchor because when the app is embedded in an iframe (e.g. the
                   preview), the default navigation loads api.whatsapp.com inside
                   the iframe, and WhatsApp refuses to be framed → ERR_BLOCKED_BY_RESPONSE.
                   Instead, our onPress handler explicitly opens the link in the
                   TOP window / new tab (see openWhatsApp). */}
              <TouchableOpacity
                style={styles.waBtn}
                onPress={openWhatsApp}
                testID="offer-claim-whatsapp"
              >
                <Ionicons name="logo-whatsapp" size={20} color="#fff" />
                <Text style={styles.waBtnText}>Send Claim on WhatsApp</Text>
              </TouchableOpacity>

              {!result?.whatsapp_link && (
                <Text style={styles.disclaimer}>
                  This outlet hasn't set a WhatsApp number yet. Please show the token at the counter.
                </Text>
              )}

              <TouchableOpacity style={styles.secondaryBtn} onPress={close}>
                <Text style={styles.secondaryBtnText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  backdropTouch: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '92%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderLight || '#E5E7EB',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brandBlueDeep,
  },
  title: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary },
  subtitle: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  optional: { color: theme.colors.textSecondary, fontWeight: '400' },
  req: { color: '#DC2626' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
    backgroundColor: '#fff',
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  phonePrefix: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.brandBlueDeep,
  },
  phonePrefixText: { color: '#fff', fontWeight: '700' },
  phoneInput: { flex: 1 },

  errorText: {
    color: '#DC2626',
    fontSize: 13,
    marginTop: 10,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
  },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: theme.colors.brandBlueDeep,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
  },
  secondaryBtnText: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: 14 },

  disclaimer: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Result screen
  offerCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  offerImg: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  offerImgPh: {
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.textPrimary },
  offerDesc: { fontSize: 13, color: theme.colors.textPrimary, marginTop: 4, lineHeight: 18 },

  tokenBox: {
    backgroundColor: theme.colors.brandBlueDeep,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  tokenLabel: { color: '#CBD5F5', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  tokenValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  tokenHint: { color: '#FDE68A', fontSize: 12, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  metaText: { color: theme.colors.textSecondary, fontSize: 12 },

  waBtn: {
    marginTop: 14,
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  alreadyBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alreadyBannerText: {
    flex: 1,
    color: '#92400E',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
  },
});
