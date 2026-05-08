import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, isOutletOpen, formatSlots } from '../../src/api';
import { cache } from '../../src/cache';
import { theme } from '../../src/theme';
import OfferClaimModal from '../../src/components/OfferClaimModal';

export default function PlazaDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Hydrate immediately from cache so the screen renders without a spinner
  // when the user clicks a plaza after the home bootstrap has populated.
  const cachedPlaza = id ? cache.getPlaza(id as string) : null;
  const cachedOutletsLite = id ? cache.getOutletsLiteForPlaza(id as string) : [];
  const cachedFullOutlets = id ? cache.getFullOutletsForPlaza(id as string) : null;
  const cachedAllOffers = cache.getOffers();
  const initialOutletIds = new Set(cachedOutletsLite.map((x: any) => x.id));
  const initialOffers = (cachedAllOffers || [])
    .filter((of: any) => !of.outlet_id || initialOutletIds.has(of.outlet_id))
    .sort(
      (a: any, b: any) =>
        (b.is_offer_of_the_day ? 1 : 0) - (a.is_offer_of_the_day ? 1 : 0)
    );

  const [plaza, setPlaza] = useState<any | null>(cachedPlaza);
  const [outlets, setOutlets] = useState<any[]>(
    cachedFullOutlets || cachedOutletsLite || []
  );
  const [offers, setOffers] = useState<any[]>(initialOffers);
  // Only show full-screen spinner if we have nothing at all to render.
  const [loading, setLoading] = useState(!cachedPlaza);
  const [refreshing, setRefreshing] = useState(false);
  const [claimOffer, setClaimOffer] = useState<any | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!id) return;
      try {
        // If full outlets are already cached for this plaza and we are not
        // explicitly refreshing, just refresh offers in the background.
        const haveFull = !force && !!cache.getFullOutletsForPlaza(id as string);
        const [p, o, f] = await Promise.all([
          // Plaza detail is tiny and fast — always re-fetch fresh.
          api.getPlaza(id as string),
          haveFull
            ? Promise.resolve(cache.getFullOutletsForPlaza(id as string)!)
            : api.listOutlets(id as string),
          api.listOffers(),
        ]);
        setPlaza(p);
        setOutlets(o);
        if (!haveFull) cache.setFullOutletsForPlaza(id as string, o);
        const outletIds = new Set(o.map((x: any) => x.id));
        const plazaOffers = (f || []).filter(
          (of: any) => !of.outlet_id || outletIds.has(of.outlet_id)
        );
        plazaOffers.sort(
          (a: any, b: any) =>
            (b.is_offer_of_the_day ? 1 : 0) - (a.is_offer_of_the_day ? 1 : 0)
        );
        setOffers(plazaOffers);
      } catch (e) {
        console.log('plaza detail load error', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const openDial = (mobile: string, outletId?: string) => {
    if (outletId) api.trackClick(outletId, 'call');
    const url = `tel:${mobile}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = url;
    else Linking.openURL(url).catch(() => {});
  };

  const openWhatsApp = (mobile: string, outletName: string, outletId?: string) => {
    if (outletId) api.trackClick(outletId, 'whatsapp');
    const clean = mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hi ${outletName}, I'd like to know more.`);
    const url = `https://wa.me/${clean}?text=${msg}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank');
    else Linking.openURL(url).catch(() => {});
  };

  const openMap = () => {
    if (!plaza?.google_maps_url) return;
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(plaza.google_maps_url, '_blank');
    else Linking.openURL(plaza.google_maps_url).catch(() => {});
  };

  const callPlaza = () => {
    if (!plaza?.contact_phone) return;
    openDial(plaza.contact_phone);
  };

  if (loading || !plaza) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="plaza-detail-screen">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Hero */}
        <View>
          {plaza.image ? (
            <Image source={{ uri: plaza.image }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.heroPh]}>
              <Ionicons name="storefront" size={60} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.heroShade} />
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            testID="plaza-back-button"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          {plaza.is_head_office && (
            <View style={[styles.hqBadge, { top: insets.top + 14 }]}>
              <Text style={styles.hqBadgeText}>HEAD OFFICE</Text>
            </View>
          )}
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroTitle}>{plaza.name}</Text>
            {!!plaza.city && <Text style={styles.heroCity}>{plaza.city}, Gujarat</Text>}
          </View>
        </View>

        {/* About + Contact card */}
        <View style={styles.infoCard}>
          {!!plaza.description && <Text style={styles.desc}>{plaza.description}</Text>}
          {!!plaza.address && (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />{' '}
              {plaza.address}
            </Text>
          )}
          <View style={styles.actionRow}>
            {!!plaza.contact_phone && (
              <TouchableOpacity
                style={[styles.plazaActionBtn, { backgroundColor: theme.colors.primary }]}
                onPress={callPlaza}
                testID="plaza-call-button"
              >
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.plazaActionText}>Call Plaza</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Plaza Gallery Strip — only renders if at least one extra image is set */}
        {(!!plaza.image2 || !!plaza.image3) && (
          <View style={styles.galleryStrip} testID="plaza-gallery-strip">
            <FlatList
              data={[plaza.image2, plaza.image3].filter(Boolean) as string[]}
              horizontal
              keyExtractor={(uri, idx) => `${idx}-${uri.slice(0, 24)}`}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.galleryThumb} resizeMode="cover" />
              )}
            />
          </View>
        )}

        {/* Offers */}
        {plaza.is_offers_enabled !== false && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Offers</Text>
              <View style={styles.dot} />
            </View>
            {offers.length === 0 ? (
              <View style={styles.emptyOffers} testID="empty-offers-card">
                <View style={styles.emptyOffersIcon}>
                  <Ionicons
                    name="pricetag-outline"
                    size={26}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.emptyOffersTitle}>
                  Today's offer will be updated soon
                </Text>
                <Text style={styles.emptyOffersSub}>
                  Check back later for exclusive highway dining offers at {plaza.name}.
                </Text>
              </View>
            ) : (
              <FlatList
              data={offers}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(o) => o.id}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 14 }}
              renderItem={({ item }) => {
                // Figure out which outlet this offer belongs to (if any).
                const offerOutlet = item.outlet_id
                  ? outlets.find((o: any) => o.id === item.outlet_id)
                  : null;
                return (
                  <View style={styles.offerCard}>
                    {item.image ? (
                      <Image source={{ uri: item.image }} style={styles.offerImg} />
                    ) : (
                      <View style={[styles.offerImg, styles.offerPh]}>
                        <Ionicons name="pricetag" size={32} color={theme.colors.primary} />
                      </View>
                    )}
                    {item.is_offer_of_the_day && (
                      <View style={styles.otdBadge}>
                        <Ionicons name="star" size={11} color={theme.colors.brandBlueDeep} />
                        <Text style={styles.otdBadgeText}>Offer of the Day</Text>
                      </View>
                    )}
                    <View style={styles.offerOverlay}>
                      <Text style={styles.offerTitle} numberOfLines={2}>{item.title}</Text>
                      {!!item.description && (
                        <Text style={styles.offerDesc} numberOfLines={2}>{item.description}</Text>
                      )}
                      <TouchableOpacity
                        style={styles.viewOfferBtn}
                        onPress={() => setClaimOffer({ offer: item, outlet: offerOutlet })}
                        testID={`view-offer-${item.id}`}
                      >
                        <Ionicons name="gift-outline" size={14} color={theme.colors.brandBlueDeep} />
                        <Text style={styles.viewOfferText}>View Offer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
            )}
          </View>
        )}

        {/* Outlets */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Outlets</Text>
            <Text style={styles.sectionCount}>{outlets.length}</Text>
          </View>
          {outlets.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="construct-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>
                Outlet details for {plaza.name} will be updated shortly. Please check back soon!
              </Text>
            </View>
          ) : (
            outlets.map((outlet) => {
              const open = isOutletOpen(outlet);
              return (
                <TouchableOpacity
                  key={outlet.id}
                  activeOpacity={0.85}
                  style={styles.outletCard}
                  onPress={() => router.push(`/outlet/${outlet.id}`)}
                  testID={`outlet-card-${outlet.id}`}
                >
                  {outlet.logo ? (
                    <Image source={{ uri: outlet.logo }} style={styles.outletImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.outletImg, styles.outletImgPh]}>
                      <Ionicons name="restaurant" size={36} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.outletBody}>
                    <View style={styles.outletTopRow}>
                      <Text style={styles.outletName} numberOfLines={1}>{outlet.name}</Text>
                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: open ? theme.colors.open : theme.colors.closed },
                        ]}
                      >
                        <Text style={styles.statusText}>{open ? 'Open' : 'Closed'}</Text>
                      </View>
                    </View>
                    <Text style={styles.outletHours}>
                      <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />{' '}
                      {formatSlots(outlet)}
                    </Text>
                    {!!outlet.description && (
                      <Text style={styles.outletDesc} numberOfLines={2}>{outlet.description}</Text>
                    )}
                    <View style={styles.outletActions}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => openDial(outlet.mobile, outlet.id)}
                        testID={`call-outlet-${outlet.id}`}
                      >
                        <Ionicons name="call" size={16} color="#fff" />
                        <Text style={styles.actionText}>Call</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.whatsapp }]}
                        onPress={() => openWhatsApp(outlet.mobile, outlet.name, outlet.id)}
                        testID={`whatsapp-outlet-${outlet.id}`}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#fff" />
                        <Text style={styles.actionText}>WhatsApp</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: theme.colors.textPrimary }]}
                        onPress={() => router.push(`/outlet/${outlet.id}`)}
                        testID={`view-menu-${outlet.id}`}
                      >
                        <Ionicons name="chevron-forward" size={16} color="#fff" />
                        <Text style={styles.actionText}>Menu</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Gallery */}
        {plaza.gallery && plaza.gallery.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Gallery</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
              {plaza.gallery.map((img: string, i: number) => (
                <Image key={i} source={{ uri: img }} style={styles.galleryImg} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Feedback CTA */}
        <TouchableOpacity
          style={styles.feedbackCta}
          onPress={() => router.push('/feedback')}
          testID="plaza-feedback-button"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={theme.colors.primary} />
          <Text style={styles.feedbackCtaText}>Share your feedback</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      <OfferClaimModal
        visible={!!claimOffer}
        onClose={() => setClaimOffer(null)}
        outlet={claimOffer?.outlet || null}
        plazaId={plaza?.id || null}
        offer={claimOffer?.offer || null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  hero: { width: '100%', height: 280, backgroundColor: '#FFE8DF' },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  heroShade: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 120,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  heroTitleWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  heroTitle: { color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  heroCity: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginTop: 2 },
  backBtn: {
    position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  hqBadge: {
    position: 'absolute', right: 16, backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
  },
  hqBadgeText: { fontSize: 10, fontWeight: '900', color: theme.colors.brandBlueDeep, letterSpacing: 0.8 },
  infoCard: {
    marginTop: -24, marginHorizontal: 16,
    backgroundColor: theme.colors.surface, borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: theme.colors.borderLight, ...theme.shadow.card,
  },
  desc: { fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20, marginBottom: 10 },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  plazaActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 14,
  },
  plazaActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, marginBottom: 14,
  },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.3 },
  sectionCount: {
    fontSize: 12, color: theme.colors.textSecondary, backgroundColor: theme.colors.surface,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary },
  offerCard: { width: 300, height: 230, borderRadius: 24, overflow: 'hidden', backgroundColor: theme.colors.surface },
  offerImg: { width: '100%', height: '100%' },
  offerPh: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE8DF' },
  offerOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, backgroundColor: 'rgba(45,40,37,0.65)' },
  offerTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 2 },
  offerDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginBottom: 12 },
  viewOfferBtn: {
    alignSelf: 'stretch',
    backgroundColor: theme.colors.brandYellow,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewOfferText: { color: theme.colors.brandBlueDeep, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  otdBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.brandYellow,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  otdBadgeText: { fontSize: 11, fontWeight: '800', color: theme.colors.brandBlueDeep, letterSpacing: 0.3 },
  outletCard: {
    marginHorizontal: 20, marginBottom: 18, backgroundColor: theme.colors.surface,
    borderRadius: 24, overflow: 'hidden',
    borderWidth: 1, borderColor: theme.colors.borderLight, ...theme.shadow.card,
  },
  outletImg: { width: '100%', height: 160 },
  outletImgPh: { backgroundColor: '#FFE8DF', alignItems: 'center', justifyContent: 'center' },
  outletBody: { padding: 16 },
  outletTopRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6,
  },
  outletName: { fontSize: 19, fontWeight: '800', color: theme.colors.textPrimary, flex: 1, letterSpacing: -0.3 },
  outletHours: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  outletDesc: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 14, lineHeight: 18 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  outletActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 14,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  emptyBox: {
    marginHorizontal: 20, padding: 30, alignItems: 'center',
    backgroundColor: theme.colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.borderLight, borderStyle: 'dashed',
  },
  emptyText: { marginTop: 12, textAlign: 'center', color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },

  galleryStrip: { marginTop: 16, marginBottom: 4 },
  galleryThumb: {
    width: 130,
    height: 95,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
  },

  emptyOffers: {
    marginHorizontal: 20,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#FFF8F3',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderStyle: 'dashed',
  },
  emptyOffersIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyOffersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyOffersSub: {
    marginTop: 4,
    fontSize: 12.5,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  galleryImg: { width: 180, height: 120, borderRadius: 14, backgroundColor: theme.colors.border },
  feedbackCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 20, marginTop: 20, paddingVertical: 14,
    backgroundColor: '#FFF5F0', borderRadius: 14,
    borderWidth: 1, borderColor: theme.colors.primary, borderStyle: 'dashed',
  },
  feedbackCtaText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },
});
