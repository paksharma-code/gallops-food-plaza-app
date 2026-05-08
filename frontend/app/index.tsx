import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../src/api';
import { cache } from '../src/cache';
import { theme } from '../src/theme';

export default function GFPLanding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  // Hydrate from cache so re-mounts (e.g. coming back from a plaza page) are
  // instant. Falls back to network on cold start.
  const [plazas, setPlazas] = useState<any[]>(() => cache.getPlazas());
  const [loading, setLoading] = useState(!cache.isHydrated());
  const [refreshing, setRefreshing] = useState(false);

  const openMap = useCallback((plaza: any) => {
    // Priority 1: explicit google_maps_url from admin.
    // Priority 2: fallback to a Google Maps search for the actual business
    //            (prefixed with the brand so we land on the plaza itself,
    //             not the town boundary).
    let url = (plaza?.google_maps_url || '').trim();
    if (!url) {
      const parts = ['Gallops Food Plaza', plaza?.name, plaza?.city, 'Gujarat']
        .filter(Boolean)
        // de-dup when name == city (e.g. both "Limbdi")
        .filter((s, i, arr) => arr.indexOf(s) === i);
      const q = encodeURIComponent(parts.join(' '));
      url = `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    if (Platform.OS === 'web') {
      (window as any).open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api.bootstrap();
      cache.setBootstrap(data);
      setPlazas(data.plazas);
    } catch (e) {
      console.log('bootstrap load error', e);
      // Fallback: try plazas-only so the screen still renders something.
      try {
        const fallback = await api.listPlazas();
        setPlazas(fallback);
      } catch {
        /* swallow */
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Image source={theme.brand.logo} style={{ width: 200, height: 90, marginBottom: 20 }} resizeMode="contain" />
        <ActivityIndicator color={theme.colors.brandYellow} size="large" />
        <Text style={styles.tagline}>{theme.brand.tagline}</Text>
      </View>
    );
  }

  const operational = plazas.filter((p) => p.status === 'operational');
  const upcoming = plazas.filter((p) => p.status === 'upcoming');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="gfp-landing">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brandYellow} />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Brand Hero */}
        <View style={styles.hero}>
          <View style={styles.topBar}>
            <Image source={theme.brand.logo} style={styles.logoTop} resizeMode="contain" />
            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={styles.aboutBtn}
                onPress={() => router.push('/about')}
                testID="about-nav-btn"
              >
                <Ionicons name="information-circle-outline" size={16} color={theme.colors.brandYellow} />
                <Text style={styles.aboutBtnText}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => router.push('/admin/login')}
                testID="admin-login-nav-button"
              >
                <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.brandBlueDeep} />
                <Text style={styles.adminBtnText}>Admin</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.heroTitle}>Gallops Food Plaza</Text>
          <View style={styles.yellowBar} />
          <Text style={styles.heroSub}>India's Fastest Growing Highway Food Plaza Experience</Text>

          <Text style={styles.introText}>
            A premium highway food destination offering multi-cuisine experiences across Gujarat. Designed for travellers, families and food lovers — Gallops combines quality, hygiene and variety under one roof.
          </Text>
        </View>

        {/* Running Food Plazas */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.yellowDot} />
            <Text style={styles.sectionTitle}>Running Food Plazas</Text>
            <Text style={styles.sectionCount}>{operational.length}</Text>
          </View>

          <View style={styles.grid}>
            {operational.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                style={styles.plazaCard}
                onPress={() => router.push(`/plaza/${p.id}`)}
                testID={`plaza-card-${p.id}`}
              >
                {p.image ? (
                  <Image source={{ uri: p.image }} style={styles.plazaImg} />
                ) : (
                  <View style={[styles.plazaImg, styles.plazaImgPh]}>
                    <Ionicons name="storefront" size={40} color={theme.colors.brandBlue} />
                  </View>
                )}
                {p.is_head_office && (
                  <View style={styles.hqBadge}>
                    <Text style={styles.hqBadgeText}>HEAD OFFICE</Text>
                  </View>
                )}
                <View style={styles.plazaBody}>
                  <View style={styles.plazaTitleRow}>
                    <Text style={styles.plazaName} numberOfLines={1}>{p.name}</Text>
                    <TouchableOpacity
                      onPress={(e: any) => {
                        e.stopPropagation?.();
                        openMap(p);
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.pinBtn}
                      // @ts-ignore — web-only title attribute becomes a native tooltip
                      title="View Location"
                      accessibilityLabel="View Location on Google Maps"
                      testID={`plaza-map-${p.id}`}
                    >
                      <Ionicons name="location" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  {!!p.city && <Text style={styles.plazaCity}>{p.city}, Gujarat</Text>}
                  <View style={styles.viewRow}>
                    <Text style={styles.viewText}>View Details</Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.brandBlue} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Projects */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={styles.yellowDot} />
            <Text style={styles.sectionTitle}>Upcoming Projects</Text>
            <Text style={styles.sectionCount}>{upcoming.length}</Text>
          </View>

          <View style={styles.upcomingGrid}>
            {upcoming.map((p) => (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.85}
                style={styles.upcomingCard}
                onPress={() => router.push(`/coming-soon/${p.id}`)}
                testID={`upcoming-card-${p.id}`}
              >
                <View style={styles.comingRibbon}>
                  <Text style={styles.comingRibbonText}>COMING SOON</Text>
                </View>
                <TouchableOpacity
                  onPress={(e: any) => {
                    e.stopPropagation?.();
                    openMap(p);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.upcomingPinBtn}
                  // @ts-ignore
                  title="View Location"
                  accessibilityLabel="View Location on Google Maps"
                  testID={`upcoming-map-${p.id}`}
                >
                  <Ionicons name="location" size={20} color={theme.colors.brandYellow} />
                </TouchableOpacity>
                <Text style={styles.upcomingName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.upcomingSub}>Gujarat</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Us & Franchise CTA banner */}
        <TouchableOpacity
          style={styles.aboutBanner}
          onPress={() => router.push('/about')}
          activeOpacity={0.9}
          testID="about-franchise-banner"
        >
          <View style={styles.aboutBannerIconWrap}>
            <Ionicons name="business" size={22} color={theme.colors.brandBlueDeep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.aboutBannerTitle}>About Us & Franchise</Text>
            <Text style={styles.aboutBannerSub}>
              Learn our story · Explore franchise opportunities
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.footer}>
          Taste the Journey with Gallops ·{' '}
          <Text style={{ color: theme.colors.brandYellow }}>जहाँ स्वाद मिले सफर से</Text>
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brandBlue,
    padding: 40,
  },
  container: { flex: 1, backgroundColor: theme.colors.brandBlue },
  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  logoTop: { width: 130, height: 54 },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aboutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,237,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  aboutBtnText: { color: theme.colors.brandYellow, fontSize: 12, fontWeight: '800' },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  adminBtnText: { color: theme.colors.brandBlueDeep, fontSize: 12, fontWeight: '800' },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.8,
    marginTop: 8,
  },
  yellowBar: {
    width: 72,
    height: 5,
    backgroundColor: theme.colors.brandYellow,
    borderRadius: 3,
    marginTop: 10,
    marginBottom: 14,
  },
  heroSub: {
    color: theme.colors.brandYellow,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  tagline: {
    color: theme.colors.brandYellow,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    fontWeight: '700',
  },
  introText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 22,
  },
  section: { marginTop: 24 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  yellowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.brandYellow },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.4,
  },
  sectionCount: {
    fontSize: 11,
    color: theme.colors.brandBlueDeep,
    backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    fontWeight: '900',
  },
  grid: { paddingHorizontal: 16 },
  plazaCard: {
    backgroundColor: '#fff',
    marginHorizontal: 4,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  plazaImg: { width: '100%', height: 150, backgroundColor: theme.colors.brandBlueLight },
  plazaImgPh: { alignItems: 'center', justifyContent: 'center' },
  hqBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  hqBadgeText: { fontSize: 10, fontWeight: '900', color: theme.colors.brandBlueDeep, letterSpacing: 0.8 },
  plazaBody: { padding: 14 },
  plazaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pinBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  upcomingPinBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,237,0,0.35)',
  },
  plazaName: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.colors.brandBlueDeep, letterSpacing: -0.3 },
  plazaCity: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  viewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#F3F0FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  viewText: { color: theme.colors.brandBlue, fontSize: 12, fontWeight: '700' },
  upcomingGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  upcomingCard: {
    width: '47%',
    backgroundColor: theme.colors.brandBlueLight,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(253,199,47,0.3)',
  },
  comingRibbon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  comingRibbonText: { fontSize: 8, fontWeight: '900', color: theme.colors.brandBlueDeep, letterSpacing: 0.4 },
  upcomingName: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 10, letterSpacing: -0.3 },
  upcomingSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  aboutBanner: {
    marginTop: 30,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: theme.colors.brandBlue,
    borderWidth: 1,
    borderColor: 'rgba(255,237,0,0.35)',
  },
  aboutBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.brandYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aboutBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  aboutBannerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  footer: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
});
