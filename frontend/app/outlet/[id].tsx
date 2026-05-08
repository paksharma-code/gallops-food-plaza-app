import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  FlatList,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, isOutletOpen, formatSlots } from '../../src/api';
import { theme } from '../../src/theme';

export default function OutletDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [outlet, setOutlet] = useState<any | null>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [o, m, f] = await Promise.all([
          api.getOutlet(id as string),
          api.listMenu(id as string),
          api.listOffers(id as string),
        ]);
        setOutlet(o);
        setMenu(m);
        setOffers(f);
        if (m.length > 0) setActiveCategory(m[0].category);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    menu.forEach((m) => s.add(m.category));
    return Array.from(s);
  }, [menu]);

  const filtered = useMemo(
    () => (activeCategory ? menu.filter((m) => m.category === activeCategory) : menu),
    [menu, activeCategory]
  );

  if (loading || !outlet) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const open = isOutletOpen(outlet);
  const openDial = () => {
    api.trackClick(outlet.id, 'call');
    const url = `tel:${outlet.mobile}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = url;
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };
  const openWA = () => {
    api.trackClick(outlet.id, 'whatsapp');
    const clean = outlet.mobile.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(`Hi ${outlet.name}, I'd like to know more.`);
    const url = `https://wa.me/${clean}?text=${msg}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.container} testID="outlet-detail-screen">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View>
          {outlet.logo ? (
            <Image source={{ uri: outlet.logo }} style={styles.hero} />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Ionicons name="restaurant" size={60} color={theme.colors.primary} />
            </View>
          )}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 10 }]}
            onPress={() => router.back()}
            testID="outlet-back-button"
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{outlet.name}</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: open ? theme.colors.open : theme.colors.closed },
              ]}
            >
              <Text style={styles.statusText}>{open ? 'Open' : 'Closed'}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />{' '}
            {formatSlots(outlet)}
          </Text>
          {!!outlet.address && (
            <Text style={styles.meta}>
              <Ionicons name="location-outline" size={13} color={theme.colors.textSecondary} />{' '}
              {outlet.address}
            </Text>
          )}
          {!!outlet.description && <Text style={styles.desc}>{outlet.description}</Text>}

          {/* Outlet Gallery Strip — only renders if at least one extra image is set */}
          {(!!outlet.image2 || !!outlet.image3) && (
            <FlatList
              data={[outlet.image2, outlet.image3].filter(Boolean) as string[]}
              horizontal
              keyExtractor={(uri, idx) => `${idx}-${uri.slice(0, 24)}`}
              contentContainerStyle={styles.galleryContent}
              style={styles.galleryStrip}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item }} style={styles.galleryThumb} resizeMode="cover" />
              )}
              testID="outlet-gallery-strip"
            />
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              onPress={openDial}
              testID="detail-call-button"
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: theme.colors.whatsapp }]}
              onPress={openWA}
              testID="detail-whatsapp-button"
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          {outlet.is_reservation_enabled && (
            <TouchableOpacity
              style={styles.reservationBtn}
              onPress={() => router.push(`/reservation/${outlet.id}`)}
              testID="reserve-table-button"
            >
              <Ionicons name="calendar" size={18} color="#fff" />
              <Text style={styles.reservationText}>Reserve a Table</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.feedbackLink}
            onPress={() => router.push(`/feedback?outletId=${outlet.id}`)}
            testID="outlet-feedback-button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.feedbackLinkText}>Share feedback about {outlet.name}</Text>
          </TouchableOpacity>
        </View>

        {/* Offers for this outlet */}
        {offers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Current Offers</Text>
            <FlatList
              data={offers}
              horizontal
              keyExtractor={(o) => o.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.offerChip}>
                  <Ionicons name="pricetag" size={14} color={theme.colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offerChipTitle}>{item.title}</Text>
                    {!!item.description && (
                      <Text style={styles.offerChipDesc} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menu</Text>
          {categories.length > 0 ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
              >
                {categories.map((c) => {
                  const active = c === activeCategory;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => setActiveCategory(c)}
                      style={[
                        styles.chip,
                        active && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
                      ]}
                      testID={`category-chip-${c}`}
                    >
                      <Text style={[styles.chipText, active && { color: '#fff' }]}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={{ paddingHorizontal: 20, marginTop: 16, gap: 8 }}>
                {filtered.map((item) => (
                  <View key={item.id} style={styles.menuItem} testID={`menu-item-${item.id}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuName}>{item.name}</Text>
                    </View>
                    <Text style={styles.menuPrice}>₹{item.price}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Menu coming soon.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background },
  hero: { width: '100%', height: 260 },
  heroPlaceholder: { backgroundColor: '#FFE8DF', alignItems: 'center', justifyContent: 'center' },
  galleryStrip: { marginTop: 14, marginBottom: 4, marginHorizontal: -20 },
  galleryContent: { paddingHorizontal: 20, gap: 10 },
  galleryThumb: {
    width: 130,
    height: 95,
    borderRadius: 12,
    backgroundColor: theme.colors.border,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    marginTop: -28,
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  name: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, flex: 1, letterSpacing: -0.5 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  meta: { fontSize: 13, color: theme.colors.textSecondary, marginBottom: 4 },
  desc: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  reservationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 10,
    backgroundColor: theme.colors.textPrimary,
  },
  reservationText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  feedbackLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  feedbackLinkText: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  offerChip: {
    width: 260,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  offerChipTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  offerChipDesc: { fontSize: 12, color: theme.colors.textSecondary },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  menuImg: { width: 80, height: 80, borderRadius: 14 },
  menuImgPlaceholder: { backgroundColor: '#FFE8DF', alignItems: 'center', justifyContent: 'center' },
  menuName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  menuDesc: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 6 },
  menuPrice: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
  emptyText: { color: theme.colors.textSecondary, fontSize: 14, paddingHorizontal: 20 },
});
