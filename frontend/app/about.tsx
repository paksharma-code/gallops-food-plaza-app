import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { theme } from '../src/theme';

type Leader = { name: string; role: string; photo?: string; bio?: string };

type About = {
  title: string;
  body: string;
  hero_image?: string;
  hero_banner?: string;
  leadership?: Leader[];
  why_choose?: string[];
  franchise_title: string;
  franchise_description: string;
  franchise_phone: string;
  franchise_email?: string;
};

const WHY_ICONS: Record<string, any> = {
  'Fresh & Hygienic Food': 'nutrition-outline',
  'Multi-Cuisine Options': 'restaurant-outline',
  'EV Charging Stations': 'flash-outline',
  'Family-Friendly Spaces': 'people-outline',
  'Convenient Highway Locations': 'map-outline',
  'Clean Restrooms': 'water-outline',
};

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [about, setAbout] = useState<About | null>(null);
  const [loading, setLoading] = useState(true);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getAbout();
        setAbout(data);
      } catch (e) {
        setAbout({
          title: 'About Gallops Food Plaza',
          body: "Gallops Food Plaza is one of Gujarat's leading highway food destination chains.",
          franchise_title: 'Franchise Enquiry',
          franchise_description: 'Partner with us to grow the Gallops highway experience.',
          franchise_phone: '+918779515804',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(slide, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]).start();
    }
  }, [loading]);

  const cleanPhone = (p: string) => (p || '').replace(/[^0-9+]/g, '');

  const openUrl = (url: string, newTab = true) => {
    if (Platform.OS === 'web') (window as any).open(url, newTab ? '_blank' : '_self');
    else Linking.openURL(url);
  };

  const openCall = () => {
    if (!about) return;
    openUrl(`tel:${cleanPhone(about.franchise_phone)}`, false);
  };

  const openWhatsApp = () => {
    if (!about) return;
    const num = cleanPhone(about.franchise_phone).replace(/^\+/, '');
    const msg = encodeURIComponent(
      "Hi Gallops Food Plaza team — I'm interested in exploring a franchise opportunity. Please share more details.",
    );
    openUrl(`https://wa.me/${num}?text=${msg}`, true);
  };

  const openEmail = () => {
    if (!about?.franchise_email) return;
    const subject = encodeURIComponent('Gallops Food Plaza — Franchise Enquiry');
    const body = encodeURIComponent(
      "Hi Gallops Food Plaza team,\n\nI'm interested in learning more about franchise opportunities. Please get in touch.\n\nThanks,",
    );
    openUrl(`mailto:${about.franchise_email}?subject=${subject}&body=${body}`, false);
  };

  const openEnquiryForm = () => {
    // Pre-filled WhatsApp form OR Google form; using WhatsApp as primary quick-form
    openWhatsApp();
  };

  if (loading) {
    return (
      <View style={[styles.loadingWrap, { paddingTop: insets.top }]}>
        <ActivityIndicator color={theme.colors.brandYellow} size="large" />
      </View>
    );
  }

  const a = about!;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Top brand bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="about-back-btn">
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Image source={theme.brand.logo} style={styles.logo} resizeMode="contain" />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero image */}
        {a.hero_banner ? (
          <Image source={{ uri: a.hero_banner }} style={styles.hero} resizeMode="cover" />
        ) : a.hero_image ? (
          <Image source={{ uri: a.hero_image }} style={styles.hero} resizeMode="cover" />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="business" size={48} color={theme.colors.brandYellow} />
          </View>
        )}

        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: slide }],
            paddingHorizontal: 20,
            marginTop: 16,
          }}
        >
          {/* Title */}
          <View style={styles.titleRow}>
            <View style={styles.iconBubble}>
              <Ionicons name="business-outline" size={20} color={theme.colors.brandBlueDeep} />
            </View>
            <Text style={styles.title} testID="about-title">
              {a.title}
            </Text>
          </View>

          {/* Our Story */}
          <Text style={styles.sectionLabel}>Our Story</Text>
          <View style={styles.card} testID="about-body-card">
            <Text style={styles.body}>{a.body}</Text>
          </View>

          {/* Why Choose Gallops */}
          {!!(a.why_choose && a.why_choose.length) && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Why Choose Gallops?</Text>
              <View style={styles.whyGrid}>
                {a.why_choose!.map((item) => (
                  <View key={item} style={styles.whyCard} testID={`why-${item}`}>
                    <View style={styles.whyIconWrap}>
                      <Ionicons
                        name={(WHY_ICONS[item] || 'checkmark-circle-outline') as any}
                        size={22}
                        color={theme.colors.brandBlueDeep}
                      />
                    </View>
                    <Text style={styles.whyText}>{item}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Leadership */}
          {!!(a.leadership && a.leadership.length) && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 28 }]}>Leadership</Text>
              {a.leadership!.map((p, idx) => (
                <View key={`${p.name}-${idx}`} style={styles.leaderCard} testID={`leader-${idx}`}>
                  {p.photo ? (
                    <Image source={{ uri: p.photo }} style={styles.leaderPhoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.leaderPhoto, styles.leaderPhotoPh]}>
                      <Ionicons name="person" size={36} color={theme.colors.brandBlue} />
                    </View>
                  )}
                  <View style={{ padding: 16 }}>
                    <Text style={styles.leaderName}>{p.name}</Text>
                    {!!p.role && <Text style={styles.leaderRole}>{p.role}</Text>}
                    {!!p.bio && <Text style={styles.leaderBio}>{p.bio}</Text>}
                  </View>
                </View>
              ))}
            </>
          )}

          <View style={styles.divider} />

          {/* Franchise section */}
          <View style={styles.franchiseCard} testID="franchise-card">
            <View style={styles.franchiseHeader}>
              <View style={[styles.iconBubble, { backgroundColor: theme.colors.brandYellow }]}>
                <Ionicons name="call" size={18} color={theme.colors.brandBlueDeep} />
              </View>
              <Text style={styles.franchiseTitle}>{a.franchise_title}</Text>
            </View>
            {!!a.franchise_description && <Text style={styles.franchiseDesc}>{a.franchise_description}</Text>}

            <TouchableOpacity
              style={styles.contactRow}
              onPress={openCall}
              activeOpacity={0.85}
              testID="franchise-phone-row"
            >
              <Ionicons name="call-outline" size={16} color="rgba(255,255,255,0.9)" />
              <Text style={styles.contactText}>{a.franchise_phone}</Text>
            </TouchableOpacity>

            {!!a.franchise_email && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={openEmail}
                activeOpacity={0.85}
                testID="franchise-email-row"
              >
                <Ionicons name="mail-outline" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.contactText}>{a.franchise_email}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={[styles.cta, styles.ctaCall]}
                onPress={openCall}
                activeOpacity={0.85}
                testID="franchise-call-btn"
              >
                <Ionicons name="call" size={18} color="#fff" />
                <Text style={styles.ctaText}>Call Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cta, styles.ctaWA]}
                onPress={openWhatsApp}
                activeOpacity={0.85}
                testID="franchise-wa-btn"
              >
                <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                <Text style={styles.ctaText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.enquiryBtn}
              onPress={openEnquiryForm}
              activeOpacity={0.85}
              testID="franchise-enquiry-btn"
            >
              <Ionicons name="document-text-outline" size={18} color={theme.colors.brandBlueDeep} />
              <Text style={styles.enquiryBtnText}>Fill Enquiry Form</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>{theme.brand.tagline}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    backgroundColor: theme.colors.brandBlueDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: theme.colors.brandBlueDeep,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  logo: { width: 120, height: 50 },
  hero: { width: '100%', height: 200 },
  heroPlaceholder: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brandBlue,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF6CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.brandBlue,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  body: { fontSize: 15, lineHeight: 23, color: theme.colors.textSecondary },

  // Why choose grid
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  whyCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.colors.brandYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyText: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary },

  // Leadership
  leaderCard: {
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  leaderPhoto: { width: '100%', height: 260, backgroundColor: '#F5F5F5' },
  leaderPhotoPh: { alignItems: 'center', justifyContent: 'center' },
  leaderName: { fontSize: 18, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.2 },
  leaderRole: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brandBlue,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  leaderBio: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: 22,
    marginHorizontal: 40,
    opacity: 0.6,
  },

  // Franchise
  franchiseCard: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: theme.colors.brandBlueDeep,
    borderWidth: 1,
    borderColor: 'rgba(255,237,0,0.25)',
    overflow: 'hidden',
  },
  franchiseHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  franchiseTitle: {
    flex: 1,
    fontSize: 19,
    fontWeight: '800',
    color: theme.colors.brandYellow,
    letterSpacing: -0.3,
  },
  franchiseDesc: { fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.82)', marginBottom: 14 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  contactText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cta: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaCall: { backgroundColor: theme.colors.primary },
  ctaWA: { backgroundColor: '#25D366' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  enquiryBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.brandYellow,
  },
  enquiryBtnText: { color: theme.colors.brandBlueDeep, fontSize: 14, fontWeight: '800' },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.brandBlue,
    letterSpacing: 1,
    marginTop: 28,
    textTransform: 'uppercase',
  },
});
