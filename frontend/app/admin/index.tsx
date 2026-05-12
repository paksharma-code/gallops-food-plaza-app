import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { pickAndEncodeImage } from '../../src/imagePicker';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { api, getToken, setToken, formatDisplayDate } from '../../src/api';
import { theme } from '../../src/theme';

type TabKey = 'analytics' | 'plazas' | 'outlets' | 'menu' | 'offers' | 'claims' | 'reservations' | 'feedback' | 'notify' | 'about';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('analytics');
  const [plazas, setPlazas] = useState<any[]>([]);
  const [outlets, setOutlets] = useState<any[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [offerClaims, setOfferClaims] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);

  const [editorType, setEditorType] = useState<TabKey | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    (async () => {
      const t = await getToken();
      if (!t) {
        router.replace('/admin/login');
        return;
      }
      try {
        await api.me();
        setChecking(false);
      } catch {
        await setToken(null);
        router.replace('/admin/login');
      }
    })();
  }, [router]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [o, f, r, a, fb, pz, nr] = await Promise.all([
        api.listOutlets(),
        api.listOffers(undefined),
        api.adminListReservations(),
        api.adminAnalytics().catch(() => null),
        api.adminListFeedback().catch(() => []),
        api.listPlazas().catch(() => []),
        api.adminListNotifyRequests().catch(() => []),
      ]);
      setOutlets(o);
      setOffers(f);
      setReservations(r);
      setAnalyticsData(a);
      setFeedbacks(fb);
      setPlazas(pz);
      setNotifyRequests(nr);
      // Menu is heavy (can be 1000+ items) — load lazily when the Menu tab is opened.
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checking) loadAll();
  }, [checking, loadAll]);

  /**
   * Run a delete API call safely:
   *  - 404 "not found" is silently swallowed (item already gone — stale list,
   *    double-tap, or another admin deleted it) because the user's intent
   *    (to remove it) is effectively satisfied.
   *  - Any other error surfaces via a friendly Alert so we never show a
   *    red Uncaught-Error screen just because a delete failed.
   *  - The list is always refreshed afterwards.
   */
  const safeDelete = async (fn: () => Promise<any>, label = 'Delete') => {
    try {
      await fn();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (!/not found/i.test(msg)) {
        Alert.alert(`${label} failed`, msg || 'Please try again.');
      }
    } finally {
      loadAll();
    }
  };

  const logout = async () => {
    await setToken(null);
    router.replace('/');
  };

  if (checking || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
    { key: 'plazas', label: 'Plazas', icon: 'business-outline' },
    { key: 'outlets', label: 'Outlets', icon: 'storefront-outline' },
    { key: 'menu', label: 'Menu', icon: 'restaurant-outline' },
    { key: 'offers', label: 'Offers', icon: 'pricetag-outline' },
    { key: 'claims', label: 'Offer Claims', icon: 'gift-outline' },
    { key: 'reservations', label: 'Reservations', icon: 'calendar-outline' },
    { key: 'feedback', label: 'Feedback', icon: 'chatbubble-ellipses-outline' },
    { key: 'notify', label: 'Notify Requests', icon: 'notifications-outline' },
    { key: 'about', label: 'About Page', icon: 'information-circle-outline' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="admin-dashboard">
      <ConfirmDialog />
      <View style={styles.topBar}>
        <View>
          <Text style={styles.overline}>Gallops Admin</Text>
          <Text style={styles.title}>Dashboard</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setShowChangePassword(true)}
            testID="admin-change-password-button"
          >
            <Ionicons name="key-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={styles.logoutText}>Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout} testID="admin-logout-button">
            <Ionicons name="log-out-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={async () => {
                setTab(t.key);
                // Lazy-load heavy datasets when their tab is opened for the first time
                if (t.key === 'menu' && menu.length === 0) {
                  try {
                    const m = await api.adminListMenu();
                    setMenu(m);
                  } catch {}
                }
                if (t.key === 'claims') {
                  try {
                    const c = await api.adminListOfferClaims();
                    setOfferClaims(c);
                  } catch {}
                }
              }}
              style={[styles.tab, active && styles.tabActive]}
              testID={`admin-tab-${t.key}`}
            >
              <Ionicons name={t.icon} size={16} color={active ? '#fff' : theme.colors.textPrimary} />
              <Text style={[styles.tabText, active && { color: '#fff' }]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === 'analytics' && (
          <AnalyticsTab data={analyticsData} onRefresh={loadAll} />
        )}
        {tab === 'plazas' && (
          <PlazasTab
            plazas={plazas}
            outlets={outlets}
            onAdd={() => {
              setEditing(null);
              setEditorType('plazas');
            }}
            onEdit={(p: any) => {
              setEditing(p);
              setEditorType('plazas');
            }}
            onDelete={async (p: any) => {
              await safeDelete(() => api.adminDeletePlaza(p.id), 'Delete plaza');
            }}
          />
        )}
        {tab === 'outlets' && (
          <OutletsTab
            outlets={outlets}
            plazas={plazas}
            onAdd={() => {
              setEditing(null);
              setEditorType('outlets');
            }}
            onEdit={(o) => {
              setEditing(o);
              setEditorType('outlets');
            }}
            onDelete={async (o) => {
              await safeDelete(() => api.adminDeleteOutlet(o.id), 'Delete outlet');
            }}
          />
        )}
        {tab === 'menu' && (
          <MenuTab
            menu={menu}
            outlets={outlets}
            plazas={plazas}
            onAdd={() => {
              setEditing(null);
              setEditorType('menu');
            }}
            onBulkImport={() => setShowBulkImport(true)}
            onManageCategories={() => setShowCategories(true)}
            onEdit={(m) => {
              setEditing(m);
              setEditorType('menu');
            }}
            onDelete={async (m) => {
              // Optimistically remove the item from the local list — menu is
              // lazy-loaded and not refreshed by loadAll(), so we must update
              // state directly. If the server call fails for a real reason
              // (not a 404), restore the item.
              const snapshot = menu;
              setMenu((prev) => prev.filter((x) => x.id !== m.id));
              try {
                await api.adminDeleteMenu(m.id);
              } catch (e: any) {
                const msg = String(e?.message || '');
                if (/not found/i.test(msg)) {
                  // Server says it's already gone → our optimistic removal is correct.
                  return;
                }
                // Real error — restore and notify.
                setMenu(snapshot);
                Alert.alert('Delete menu item failed', msg || 'Please try again.');
              }
            }}
          />
        )}
        {tab === 'offers' && (
          <OffersTab
            offers={offers}
            outlets={outlets}
            onAdd={() => {
              setEditing(null);
              setEditorType('offers');
            }}
            onEdit={(o) => {
              setEditing(o);
              setEditorType('offers');
            }}
            onDelete={async (o) => {
              await safeDelete(() => api.adminDeleteOffer(o.id), 'Delete offer');
            }}
          />
        )}
        {tab === 'claims' && (
          <OfferClaimsTab
            plazas={plazas}
            outlets={outlets}
            claims={offerClaims}
            onRefresh={async (params?: any) => {
              try {
                const c = await api.adminListOfferClaims(params || {});
                setOfferClaims(c);
              } catch (e: any) {
                Alert.alert('Error', e.message);
              }
            }}
            onToggleAvailed={async (c: any, v: boolean) => {
              await api.adminUpdateOfferClaimAvailed(c.id, v);
              setOfferClaims((prev) => prev.map((x) => (x.id === c.id ? { ...x, offer_availed: v } : x)));
            }}
            onDelete={async (c: any) => {
              try {
                await api.adminDeleteOfferClaim(c.id);
              } catch (e: any) {
                if (!/not found/i.test(String(e?.message || ''))) {
                  Alert.alert('Delete claim failed', e?.message || 'Please try again.');
                  return; // don't remove from local list if it really failed
                }
              }
              setOfferClaims((prev) => prev.filter((x) => x.id !== c.id));
            }}
          />
        )}
        {tab === 'reservations' && (
          <ReservationsTab
            reservations={reservations}
            outlets={outlets}
            onStatusChange={async (r, status) => {
              await api.adminUpdateReservationStatus(r.id, status);
              loadAll();
            }}
            onDelete={async (r) => {
              await safeDelete(() => api.adminDeleteReservation(r.id), 'Delete reservation');
            }}
          />
        )}
        {tab === 'feedback' && (
          <FeedbackTab
            feedbacks={feedbacks}
            outlets={outlets}
            onDelete={async (f) => {
              await safeDelete(() => api.adminDeleteFeedback(f.id), 'Delete feedback');
            }}
          />
        )}
        {tab === 'notify' && (
          <NotifyRequestsTab
            requests={notifyRequests}
            plazas={plazas}
            onDelete={async (r: any) => {
              await safeDelete(() => api.adminDeleteNotifyRequest(r.id), 'Delete request');
            }}
          />
        )}
        {tab === 'about' && <AboutEditorTab />}
      </ScrollView>

      <Modal visible={editorType !== null} animationType="slide" onRequestClose={() => setEditorType(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {editorType === 'plazas' && (
            <PlazaEditor
              initial={editing}
              onClose={() => setEditorType(null)}
              onSaved={() => {
                setEditorType(null);
                loadAll();
              }}
            />
          )}
          {editorType === 'outlets' && (
            <OutletEditor
              initial={editing}
              plazas={plazas}
              onClose={() => setEditorType(null)}
              onSaved={() => {
                setEditorType(null);
                loadAll();
              }}
            />
          )}
          {editorType === 'menu' && (
            <MenuEditor
              initial={editing}
              outlets={outlets}
              onClose={() => setEditorType(null)}
              onSaved={() => {
                setEditorType(null);
                loadAll();
              }}
            />
          )}
          {editorType === 'offers' && (
            <OfferEditor
              initial={editing}
              outlets={outlets}
              onClose={() => setEditorType(null)}
              onSaved={() => {
                setEditorType(null);
                loadAll();
              }}
            />
          )}
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showBulkImport} animationType="slide" onRequestClose={() => setShowBulkImport(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <BulkMenuImporter
            outlets={outlets}
            onClose={() => setShowBulkImport(false)}
            onDone={() => {
              setShowBulkImport(false);
              loadAll();
            }}
          />
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showCategories} animationType="slide" onRequestClose={() => setShowCategories(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <CategoriesManager
            outlets={outlets}
            plazas={plazas}
            onClose={() => setShowCategories(false)}
            onDataChanged={async () => {
              // Refresh the Menu items list in case categories were renamed / deleted
              try {
                const m = await api.adminListMenu();
                setMenu(m);
              } catch {}
            }}
          />
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showChangePassword} animationType="slide" onRequestClose={() => setShowChangePassword(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// -------------------- Tabs --------------------
function ListActionBar({ title, count, onAdd, addTestId }: any) {
  return (
    <View style={styles.listHeader}>
      <View>
        <Text style={styles.listTitle}>{title}</Text>
        <Text style={styles.listCount}>{count} total</Text>
      </View>
      {onAdd && (
        <TouchableOpacity style={styles.addBtn} onPress={onAdd} testID={addTestId}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function OutletsTab({ outlets, plazas, onAdd, onEdit, onDelete }: any) {
  const [plazaFilter, setPlazaFilter] = useState<string>('all');
  const filtered = useMemo(
    () => (plazaFilter === 'all' ? outlets : outlets.filter((o: any) => o.plaza_id === plazaFilter)),
    [outlets, plazaFilter],
  );
  const plazaName = (id?: string) => plazas.find((p: any) => p.id === id)?.name || 'Unassigned';
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtered.forEach((o: any) => {
      const key = o.plaza_id || '__unassigned__';
      (g[key] ||= []).push(o);
    });
    return g;
  }, [filtered]);

  const orderedKeys = useMemo(() => {
    const operationalIds = plazas.filter((p: any) => p.status === 'operational').map((p: any) => p.id);
    const upcomingIds = plazas.filter((p: any) => p.status === 'upcoming').map((p: any) => p.id);
    return [...operationalIds, ...upcomingIds, '__unassigned__'].filter((k) => grouped[k]);
  }, [plazas, grouped]);

  return (
    <View>
      <ListActionBar title="Outlets" count={filtered.length} onAdd={onAdd} addTestId="admin-add-outlet" />
      <PlazaFilterBar plazas={plazas} value={plazaFilter} onChange={setPlazaFilter} />
      {orderedKeys.map((pid) => (
        <View key={pid}>
          {plazaFilter === 'all' && (
            <Text style={styles.plazaGroupTitle}>
              {pid === '__unassigned__' ? 'Unassigned' : plazaName(pid)} · {grouped[pid].length}
            </Text>
          )}
          {grouped[pid].map((o: any) => (
            <View key={o.id} style={styles.adminCard} testID={`admin-outlet-${o.id}`}>
              {o.logo && <Image source={{ uri: o.logo }} style={styles.thumb} />}
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{o.name}</Text>
                <Text style={styles.cardSub}>{o.mobile}</Text>
                <Text style={styles.cardSub}>
                  {o.opening_time} – {o.closing_time}
                  {o.is_reservation_enabled ? '  ·  Reservations ON' : ''}
                </Text>
              </View>
              <View style={styles.rowBtns}>
                <IconBtn name="create-outline" onPress={() => onEdit(o)} testID={`edit-outlet-${o.id}`} />
                <IconBtn
                  name="trash-outline"
                  destructive
                  testID={`delete-outlet-${o.id}`}
                  onPress={() =>
                    confirm(`Delete ${o.name}? All its menu & offers will also be removed.`, () => onDelete(o))
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PlazaFilterBar({
  plazas,
  value,
  onChange,
  allowAll = true,
  testID,
}: any) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      testID={testID || 'plaza-filter-bar'}
    >
      {allowAll && (
        <TouchableOpacity
          style={[styles.filterChip, value === 'all' && styles.filterChipActive]}
          onPress={() => onChange('all')}
          testID="plaza-filter-all"
        >
          <Text style={[styles.filterChipText, value === 'all' && { color: '#fff' }]}>
            All
          </Text>
        </TouchableOpacity>
      )}
      {plazas.map((p: any) => (
        <TouchableOpacity
          key={p.id}
          style={[styles.filterChip, value === p.id && styles.filterChipActive]}
          onPress={() => onChange(p.id)}
          testID={`plaza-filter-${p.id}`}
        >
          <View
            style={[
              styles.filterChipDot,
              { backgroundColor: p.status === 'operational' ? theme.colors.open : theme.colors.brandYellow },
            ]}
          />
          <Text style={[styles.filterChipText, value === p.id && { color: '#fff' }]}>
            {p.name}
            {p.is_head_office ? ' · HQ' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function PlazasTab({ plazas, outlets, onAdd, onEdit, onDelete }: any) {
  const outletCount = (plazaId: string) =>
    outlets.filter((o: any) => o.plaza_id === plazaId).length;
  const operational = plazas.filter((p: any) => p.status === 'operational');
  const upcoming = plazas.filter((p: any) => p.status === 'upcoming');
  return (
    <View>
      <ListActionBar title="Plazas" count={plazas.length} onAdd={onAdd} addTestId="admin-add-plaza" />

      {operational.length > 0 && (
        <Text style={styles.plazaGroupTitle}>Operational · {operational.length}</Text>
      )}
      {operational.map((p: any) => (
        <PlazaCard
          key={p.id}
          plaza={p}
          outletCount={outletCount(p.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}

      {upcoming.length > 0 && (
        <Text style={styles.plazaGroupTitle}>Upcoming · {upcoming.length}</Text>
      )}
      {upcoming.map((p: any) => (
        <PlazaCard
          key={p.id}
          plaza={p}
          outletCount={outletCount(p.id)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

function AboutEditorTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [franchiseTitle, setFranchiseTitle] = useState('');
  const [franchiseDesc, setFranchiseDesc] = useState('');
  const [franchisePhone, setFranchisePhone] = useState('');
  const [franchiseEmail, setFranchiseEmail] = useState('');
  const [heroBanner, setHeroBanner] = useState('');
  const [whyChoose, setWhyChoose] = useState<string>('');
  const [leadershipJson, setLeadershipJson] = useState<string>('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const a = await api.getAbout();
      setTitle(a.title || '');
      setBody(a.body || '');
      setHeroImage(a.hero_image || '');
      setHeroBanner(a.hero_banner || '');
      setFranchiseTitle(a.franchise_title || '');
      setFranchiseDesc(a.franchise_description || '');
      setFranchisePhone(a.franchise_phone || '');
      setFranchiseEmail(a.franchise_email || '');
      setWhyChoose((a.why_choose || []).join('\n'));
      setLeadershipJson(JSON.stringify(a.leadership || [], null, 2));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pickHero = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setHeroImage(uri);
  };

  const save = async () => {
    if (!title.trim() || !body.trim() || !franchisePhone.trim()) {
      Alert.alert('Missing', 'Title, body and franchise phone are required.');
      return;
    }
    let leadership: any = undefined;
    try {
      leadership = leadershipJson.trim() ? JSON.parse(leadershipJson) : [];
      if (!Array.isArray(leadership)) throw new Error('Leadership must be an array');
    } catch (e: any) {
      Alert.alert('Invalid leadership JSON', e?.message || 'Fix the JSON format and try again.');
      return;
    }
    try {
      setSaving(true);
      await api.adminUpdateAbout({
        title: title.trim(),
        body: body.trim(),
        hero_image: heroImage,
        hero_banner: heroBanner,
        leadership,
        why_choose: whyChoose
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        franchise_title: franchiseTitle.trim(),
        franchise_description: franchiseDesc.trim(),
        franchise_phone: franchisePhone.trim(),
        franchise_email: franchiseEmail.trim(),
      });
      Alert.alert('Saved', 'About page content updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View>
      <View style={{ paddingVertical: 8, paddingHorizontal: 4, marginBottom: 8 }}>
        <Text style={styles.listTitle}>About Page</Text>
        <Text style={[styles.cardSub, { marginTop: 6 }]}>
          Edit the public About Us & Franchise Enquiry page shown at the "/about" route in the mobile app.
        </Text>
      </View>

      <AdminField label="Page Title" value={title} onChangeText={setTitle} testID="about-title-input" />
      <AdminField
        label="About Body (use blank lines for paragraphs)"
        value={body}
        onChangeText={setBody}
        multiline
        testID="about-body-input"
      />
      <ImagePickerBlock
        label="Top Hero Banner (wide, optional)"
        value={heroBanner}
        onChangeText={setHeroBanner}
        onPick={async () => {
          const uri = await pickAndEncodeImage();
          if (uri) setHeroBanner(uri);
        }}
        testID="about-hero-banner"
      />
      <ImagePickerBlock
        label="Inline Hero Image (fallback / legacy, optional)"
        value={heroImage}
        onChangeText={setHeroImage}
        onPick={pickHero}
        testID="about-hero"
      />

      <AdminField
        label={'Why Choose Gallops — one bullet per line'}
        value={whyChoose}
        onChangeText={setWhyChoose}
        multiline
        testID="about-why-choose-input"
      />

      <AdminField
        label={'Leadership (JSON array: name, role, photo, bio)'}
        value={leadershipJson}
        onChangeText={setLeadershipJson}
        multiline
        testID="about-leadership-input"
      />

      <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 16 }} />

      <AdminField
        label="Franchise Section Title"
        value={franchiseTitle}
        onChangeText={setFranchiseTitle}
        testID="franchise-title-input"
      />
      <AdminField
        label="Franchise Description"
        value={franchiseDesc}
        onChangeText={setFranchiseDesc}
        multiline
        testID="franchise-desc-input"
      />
      <AdminField
        label="Franchise Phone (with country code)"
        value={franchisePhone}
        onChangeText={setFranchisePhone}
        keyboardType="phone-pad"
        testID="franchise-phone-input"
      />
      <AdminField
        label="Franchise Email (optional)"
        value={franchiseEmail}
        onChangeText={setFranchiseEmail}
        keyboardType="email-address"
        testID="franchise-email-input"
      />

      <TouchableOpacity
        style={[styles.primaryCta, saving && { opacity: 0.7 }]}
        onPress={save}
        disabled={saving}
        testID="about-save-btn"
      >
        <Ionicons name={saving ? 'hourglass-outline' : 'save-outline'} size={18} color="#fff" />
        <Text style={styles.primaryCtaText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotifyRequestsTab({ requests, plazas, onDelete }: any) {
  const plazaName = (id: string) => plazas.find((p: any) => p.id === id)?.name || 'Unknown';

  // Group by plaza
  const byPlaza: Record<string, any[]> = {};
  (requests || []).forEach((r: any) => {
    (byPlaza[r.plaza_id] ||= []).push(r);
  });
  const plazaIds = Object.keys(byPlaza).sort(
    (a, b) => (byPlaza[b].length - byPlaza[a].length),
  );

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const openDial = (mobile: string) => {
    if (!mobile) return;
    const url = `tel:${mobile.replace(/\s+/g, '')}`;
    if (Platform.OS === 'web') (window as any).open(url, '_self');
    else Linking.openURL(url);
  };

  const openWA = (mobile: string) => {
    if (!mobile) return;
    const num = mobile.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${num}?text=${encodeURIComponent(
      "Hi! Thanks for your interest in Gallops Food Plaza. We're excited to share that our upcoming location is making progress — we'll keep you updated on the opening.",
    )}`;
    if (Platform.OS === 'web') (window as any).open(url, '_blank');
    else Linking.openURL(url);
  };

  return (
    <View>
      <ListActionBar title="Notify Requests" count={(requests || []).length} />
      {(!requests || requests.length === 0) && (
        <Text style={styles.emptyText}>
          No notify requests yet. These will show up when customers subscribe on an upcoming plaza's "Coming Soon" page.
        </Text>
      )}
      {plazaIds.map((pid) => (
        <View key={pid}>
          <Text style={styles.plazaGroupTitle}>
            {plazaName(pid)} · {byPlaza[pid].length}
          </Text>
          {byPlaza[pid].map((r: any) => (
            <View key={r.id} style={styles.adminCard} testID={`admin-notify-${r.id}`}>
              <View
                style={[
                  styles.notifyAvatar,
                  { backgroundColor: theme.colors.brandBlueLight },
                ]}
              >
                <Text style={styles.notifyAvatarText}>
                  {(r.name || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.name || 'Anonymous'}</Text>
                <Text style={styles.cardSub}>{r.mobile}</Text>
                {!!r.created_at && (
                  <Text style={styles.cardSub}>Signed up {formatDate(r.created_at)}</Text>
                )}
              </View>
              <View style={styles.rowBtns}>
                <IconBtn
                  name="call-outline"
                  onPress={() => openDial(r.mobile)}
                  testID={`notify-call-${r.id}`}
                />
                <IconBtn
                  name="logo-whatsapp"
                  onPress={() => openWA(r.mobile)}
                  testID={`notify-wa-${r.id}`}
                />
                <IconBtn
                  name="trash-outline"
                  destructive
                  testID={`notify-delete-${r.id}`}
                  onPress={() =>
                    confirm(`Remove this notify request from ${r.name || 'this lead'}?`, () => onDelete(r))
                  }
                />
              </View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PlazaCard({ plaza, outletCount, onEdit, onDelete }: any) {
  return (
    <View style={styles.adminCard} testID={`admin-plaza-${plaza.id}`}>
      {plaza.image ? (
        <Image source={{ uri: plaza.image }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE8DF' }]}>
          <Ionicons name="business" size={22} color={theme.colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={styles.cardTitle}>{plaza.name}</Text>
          {plaza.is_head_office && (
            <View style={styles.hqBadgeSm}>
              <Text style={styles.hqBadgeSmText}>HQ</Text>
            </View>
          )}
          <View
            style={[
              styles.statusDot,
              { backgroundColor: plaza.status === 'operational' ? theme.colors.open : theme.colors.brandYellow },
            ]}
          />
        </View>
        {!!plaza.city && <Text style={styles.cardSub}>{plaza.city}, Gujarat</Text>}
        <Text style={styles.cardSub}>
          {outletCount} outlet{outletCount !== 1 ? 's' : ''}
          {plaza.status === 'upcoming' && plaza.expected_opening ? `  ·  ETA: ${plaza.expected_opening}` : ''}
        </Text>
      </View>
      <View style={styles.rowBtns}>
        <IconBtn name="create-outline" onPress={() => onEdit(plaza)} testID={`edit-plaza-${plaza.id}`} />
        <IconBtn
          name="trash-outline"
          destructive
          testID={`delete-plaza-${plaza.id}`}
          onPress={() =>
            confirm(
              outletCount > 0
                ? `Delete ${plaza.name}? This plaza has ${outletCount} outlet(s) which will become orphaned.`
                : `Delete ${plaza.name}?`,
              () => onDelete(plaza),
            )
          }
        />
      </View>
    </View>
  );
}

function MenuTab({ menu, outlets, plazas, onAdd, onBulkImport, onEdit, onDelete, onManageCategories }: any) {
  // Default to first plaza to avoid rendering 1000+ items at once
  const defaultPlaza = plazas?.find((p: any) => p.is_head_office)?.id || plazas?.[0]?.id || '';
  const [plazaFilter, setPlazaFilter] = useState<string>(defaultPlaza);
  const [outletFilter, setOutletFilter] = useState<string>('all');

  const plazaOutlets = useMemo(
    () => outlets.filter((o: any) => o.plaza_id === plazaFilter),
    [outlets, plazaFilter],
  );
  const outletIds = useMemo(() => plazaOutlets.map((o: any) => o.id), [plazaOutlets]);

  const filteredMenu = useMemo(() => {
    if (!plazaFilter) return menu;
    if (outletFilter === 'all') {
      return menu.filter((m: any) => outletIds.includes(m.outlet_id));
    }
    return menu.filter((m: any) => m.outlet_id === outletFilter);
  }, [menu, plazaFilter, outletFilter, outletIds]);

  const outletName = (id: string) => outlets.find((o: any) => o.id === id)?.name || 'Unknown';
  const plazaTotal = filteredMenu.length;

  return (
    <View>
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Menu Items</Text>
          <Text style={styles.listCount}>{plazaTotal} in view · {menu.length} total</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.bulkBtn} onPress={onManageCategories} testID="admin-manage-categories">
            <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.bulkBtnText}>Categories</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkBtn} onPress={onBulkImport} testID="admin-bulk-import-menu">
            <Ionicons name="cloud-upload-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.bulkBtnText}>Bulk Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={onAdd} testID="admin-add-menu">
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <PlazaFilterBar
        plazas={plazas}
        value={plazaFilter}
        onChange={(v: string) => {
          setPlazaFilter(v);
          setOutletFilter('all');
        }}
        allowAll={false}
        testID="menu-plaza-filter"
      />

      {plazaOutlets.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterRow, { marginTop: 4 }]}
          testID="menu-outlet-filter"
        >
          <TouchableOpacity
            style={[styles.filterChipSm, outletFilter === 'all' && styles.filterChipSmActive]}
            onPress={() => setOutletFilter('all')}
          >
            <Text style={[styles.filterChipSmText, outletFilter === 'all' && { color: '#fff' }]}>
              All outlets
            </Text>
          </TouchableOpacity>
          {plazaOutlets.map((o: any) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.filterChipSm, outletFilter === o.id && styles.filterChipSmActive]}
              onPress={() => setOutletFilter(o.id)}
            >
              <Text style={[styles.filterChipSmText, outletFilter === o.id && { color: '#fff' }]}>
                {o.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {filteredMenu.length === 0 ? (
        <Text style={styles.emptyText}>
          No menu items for this selection yet. Click "Add" or "Bulk Import" to get started.
        </Text>
      ) : (
        filteredMenu.map((m: any) => (
          <View key={m.id} style={styles.adminCard} testID={`admin-menu-${m.id}`}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{m.name}</Text>
              <Text style={styles.cardSub}>
                {m.category} · {outletName(m.outlet_id)}
              </Text>
              <Text style={[styles.cardSub, { color: theme.colors.primary, fontWeight: '700' }]}>₹{m.price}</Text>
            </View>
            <View style={styles.rowBtns}>
              <IconBtn name="create-outline" onPress={() => onEdit(m)} testID={`edit-menu-${m.id}`} />
              <IconBtn
                name="trash-outline"
                destructive
                testID={`delete-menu-${m.id}`}
                onPress={() => confirm(`Delete ${m.name}?`, () => onDelete(m))}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}


// -------------------- Categories Manager --------------------
function CategoriesManager({ outlets, plazas, onClose, onDataChanged }: any) {
  const insets = useSafeAreaInsets();
  const [filterPlaza, setFilterPlaza] = useState<string | null>(null);
  const [filterOutlet, setFilterOutlet] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState<{ outlet_id: string; category: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const outletsForPlaza = useMemo(() => {
    if (!filterPlaza) return outlets;
    return outlets.filter((o: any) => o.plaza_id === filterPlaza);
  }, [outlets, filterPlaza]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminListCategories(filterOutlet || undefined);
      // Further filter by plaza if selected but no outlet chosen
      let filtered = data || [];
      if (filterPlaza && !filterOutlet) {
        const plazaOutletIds = new Set(
          outlets.filter((o: any) => o.plaza_id === filterPlaza).map((o: any) => o.id),
        );
        filtered = filtered.filter((r: any) => plazaOutletIds.has(r.outlet_id));
      }
      setRows(filtered);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [filterPlaza, filterOutlet, outlets]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVisibility = async (row: any) => {
    const next = !row.is_hidden;
    // Optimistic update
    setRows((prev) =>
      prev.map((r) =>
        r.outlet_id === row.outlet_id && r.category === row.category
          ? { ...r, is_hidden: next }
          : r,
      ),
    );
    try {
      await api.adminSetCategoryVisibility(row.outlet_id, row.category, next);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      load();
    }
  };

  const startRename = (row: any) => {
    setRenaming({ outlet_id: row.outlet_id, category: row.category });
    setRenameValue(row.category);
  };

  const commitRename = async () => {
    if (!renaming) return;
    const newName = renameValue.trim();
    if (!newName || newName === renaming.category) {
      setRenaming(null);
      return;
    }
    try {
      await api.adminRenameCategory(renaming.outlet_id, renaming.category, newName);
      setRenaming(null);
      await load();
      onDataChanged?.();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const deleteCategory = (row: any) => {
    confirm(
      `Delete category "${row.category}" and all ${row.item_count} item(s) in it for ${row.outlet_name}?`,
      async () => {
        try {
          await api.adminDeleteCategory(row.outlet_id, row.category);
          setRows((prev) =>
            prev.filter(
              (r) => !(r.outlet_id === row.outlet_id && r.category === row.category),
            ),
          );
          onDataChanged?.();
        } catch (e: any) {
          if (!/not found/i.test(String(e?.message || ''))) {
            Alert.alert('Delete failed', e?.message || 'Please try again.');
          } else {
            setRows((prev) =>
              prev.filter(
                (r) => !(r.outlet_id === row.outlet_id && r.category === row.category),
              ),
            );
          }
        }
      },
    );
  };

  // Group rows by outlet for a cleaner layout
  const grouped = useMemo(() => {
    const byOutlet: Record<string, { name: string; outlet_id: string; categories: any[] }> = {};
    for (const r of rows) {
      const key = r.outlet_id || 'unassigned';
      if (!byOutlet[key]) {
        byOutlet[key] = { name: r.outlet_name || 'Unassigned', outlet_id: key, categories: [] };
      }
      byOutlet[key].categories.push(r);
    }
    return Object.values(byOutlet).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={[styles.editorBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={styles.editorClose} testID="categories-close">
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.editorTitle}>Manage Categories</Text>
        <View style={{ width: 70 }} />
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
        <Text style={styles.filterLabel}>Plaza</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterPlaza === null && styles.filterChipActive]}
            onPress={() => { setFilterPlaza(null); setFilterOutlet(null); }}
          >
            <Text style={[styles.filterChipText, filterPlaza === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {plazas.map((p: any) => {
            const a = filterPlaza === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterChip, a && styles.filterChipActive]}
                onPress={() => { setFilterPlaza(p.id); setFilterOutlet(null); }}
              >
                <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, { marginTop: 8 }]}>Outlet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterOutlet === null && styles.filterChipActive]}
            onPress={() => setFilterOutlet(null)}
          >
            <Text style={[styles.filterChipText, filterOutlet === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {outletsForPlaza.map((o: any) => {
            const a = filterOutlet === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.filterChip, a && styles.filterChipActive]}
                onPress={() => setFilterOutlet(o.id)}
              >
                <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{o.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color={theme.colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          {grouped.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="list-outline" size={32} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                No categories found for this selection.
              </Text>
            </View>
          ) : (
            grouped.map((g) => (
              <View key={g.outlet_id} style={{ marginBottom: 18 }}>
                <Text style={styles.catGroupTitle}>{g.name}</Text>
                {g.categories.map((row) => {
                  const isRenaming =
                    renaming?.outlet_id === row.outlet_id && renaming?.category === row.category;
                  return (
                    <View key={`${row.outlet_id}-${row.category}`} style={styles.catRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        {isRenaming ? (
                          <TextInput
                            style={styles.catRenameInput}
                            value={renameValue}
                            onChangeText={setRenameValue}
                            autoFocus
                            onBlur={commitRename}
                            onSubmitEditing={commitRename}
                            testID={`cat-rename-${row.outlet_id}-${row.category}`}
                          />
                        ) : (
                          <Text style={[styles.catName, row.is_hidden && { color: theme.colors.textSecondary }]}>
                            {row.category}
                            {row.is_hidden && '  (hidden)'}
                          </Text>
                        )}
                        <Text style={styles.catMeta}>
                          {row.item_count} item{row.item_count === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <View style={styles.catActions}>
                        <Switch
                          value={!row.is_hidden}
                          onValueChange={() => toggleVisibility(row)}
                          testID={`cat-toggle-${row.outlet_id}-${row.category}`}
                        />
                        <IconBtn
                          name="create-outline"
                          onPress={() => startRename(row)}
                          testID={`cat-edit-${row.outlet_id}-${row.category}`}
                        />
                        <IconBtn
                          name="trash-outline"
                          destructive
                          onPress={() => deleteCategory(row)}
                          testID={`cat-delete-${row.outlet_id}-${row.category}`}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
          <Text style={styles.bulkHint}>
            Tip: Toggle a category OFF to temporarily hide it from customers without deleting any items.
            Toggle back ON to show it again.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}


function OffersTab({ offers, outlets, onAdd, onEdit, onDelete }: any) {
  const outletName = (id?: string | null) => (id ? outlets.find((o: any) => o.id === id)?.name || 'Unknown' : 'All Outlets');
  return (
    <View>
      <ListActionBar title="Offers" count={offers.length} onAdd={onAdd} addTestId="admin-add-offer" />
      {offers.map((o: any) => (
        <View key={o.id} style={styles.adminCard} testID={`admin-offer-${o.id}`}>
          {o.image && <Image source={{ uri: o.image }} style={styles.thumb} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{o.title}</Text>
            <Text style={styles.cardSub}>{outletName(o.outlet_id)}</Text>
            {!!o.description && (
              <Text style={styles.cardSub} numberOfLines={2}>
                {o.description}
              </Text>
            )}
          </View>
          <View style={styles.rowBtns}>
            <IconBtn name="create-outline" onPress={() => onEdit(o)} testID={`edit-offer-${o.id}`} />
            <IconBtn
              name="trash-outline"
              destructive
              testID={`delete-offer-${o.id}`}
              onPress={() => confirm(`Delete offer "${o.title}"?`, () => onDelete(o))}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// -------------------- Offer Claims Tab --------------------
function OfferClaimsTab({ plazas, outlets, claims, onRefresh, onToggleAvailed, onDelete }: any) {
  const [filterPlaza, setFilterPlaza] = useState<string | null>(null);
  const [filterOutlet, setFilterOutlet] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMobile, setFilterMobile] = useState('');
  const [filterAvailed, setFilterAvailed] = useState<'' | 'yes' | 'no'>('');
  const [exporting, setExporting] = useState(false);

  const outletsForPlaza = useMemo(() => {
    if (!filterPlaza) return outlets;
    return outlets.filter((o: any) => o.plaza_id === filterPlaza);
  }, [outlets, filterPlaza]);

  const applyFilters = () => {
    onRefresh({
      plaza_id: filterPlaza || undefined,
      outlet_id: filterOutlet || undefined,
      date_from: filterDateFrom || undefined,
      date_to: filterDateTo || undefined,
      mobile: filterMobile || undefined,
      availed: filterAvailed || undefined,
    });
  };

  const clearFilters = () => {
    setFilterPlaza(null);
    setFilterOutlet(null);
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterMobile('');
    setFilterAvailed('');
    onRefresh({});
  };

  const exportXlsx = async () => {
    try {
      setExporting(true);
      const url = await api.adminOfferClaimsExportUrl({
        plaza_id: filterPlaza || undefined,
        outlet_id: filterOutlet || undefined,
        date_from: filterDateFrom || undefined,
        date_to: filterDateTo || undefined,
        mobile: filterMobile || undefined,
        availed: filterAvailed || undefined,
      });
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        (window as any).open(url, '_blank');
      } else {
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open export URL'));
      }
    } finally {
      setExporting(false);
    }
  };

  const fmt = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return iso;
    }
  };

  // Convert ISO YYYY-MM-DD to DD-MM-YYYY for display
  const fmtDate = (iso: string) => {
    if (!iso) return '—';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
  };

  return (
    <View>
      <View style={styles.claimsHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listTitle}>Offer Claims</Text>
          <Text style={styles.listCount}>{claims.length} entries</Text>
        </View>
        <TouchableOpacity
          style={styles.exportBtn}
          onPress={exportXlsx}
          disabled={exporting}
          testID="offer-claims-export"
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="download-outline" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>Export .xlsx</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter card */}
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Plaza</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterPlaza === null && styles.filterChipActive]}
            onPress={() => { setFilterPlaza(null); setFilterOutlet(null); }}
          >
            <Text style={[styles.filterChipText, filterPlaza === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {plazas.map((p: any) => {
            const a = filterPlaza === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.filterChip, a && styles.filterChipActive]}
                onPress={() => { setFilterPlaza(p.id); setFilterOutlet(null); }}
              >
                <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{p.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.filterLabel, { marginTop: 10 }]}>Outlet</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterOutlet === null && styles.filterChipActive]}
            onPress={() => setFilterOutlet(null)}
          >
            <Text style={[styles.filterChipText, filterOutlet === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {outletsForPlaza.map((o: any) => {
            const a = filterOutlet === o.id;
            return (
              <TouchableOpacity
                key={o.id}
                style={[styles.filterChip, a && styles.filterChipActive]}
                onPress={() => setFilterOutlet(o.id)}
              >
                <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{o.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.filterRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>From (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.filterInput}
              value={filterDateFrom}
              onChangeText={setFilterDateFrom}
              placeholder="2026-06-01"
              placeholderTextColor={theme.colors.textSecondary}
              testID="claims-filter-date-from"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>To (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.filterInput}
              value={filterDateTo}
              onChangeText={setFilterDateTo}
              placeholder="2026-06-30"
              placeholderTextColor={theme.colors.textSecondary}
              testID="claims-filter-date-to"
            />
          </View>
        </View>

        <View style={styles.filterRow}>
          <View style={{ flex: 2 }}>
            <Text style={styles.filterLabel}>Mobile Search</Text>
            <TextInput
              style={styles.filterInput}
              value={filterMobile}
              onChangeText={setFilterMobile}
              keyboardType="number-pad"
              placeholder="98XXXXXXXX"
              placeholderTextColor={theme.colors.textSecondary}
              testID="claims-filter-mobile"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.filterLabel}>Availed</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[
                { v: '', label: 'All' },
                { v: 'yes', label: 'Y' },
                { v: 'no', label: 'N' },
              ].map((opt) => {
                const a = filterAvailed === (opt.v as any);
                return (
                  <TouchableOpacity
                    key={opt.v}
                    style={[styles.filterChip, a && styles.filterChipActive, { paddingHorizontal: 10 }]}
                    onPress={() => setFilterAvailed(opt.v as any)}
                  >
                    <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.filterActionBtn, { backgroundColor: theme.colors.admin }]}
            onPress={applyFilters}
            testID="claims-apply-filters"
          >
            <Ionicons name="funnel" size={14} color="#fff" />
            <Text style={styles.filterActionText}>Apply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterActionBtn, { backgroundColor: theme.colors.borderLight || '#E5E7EB' }]}
            onPress={clearFilters}
            testID="claims-clear-filters"
          >
            <Ionicons name="refresh" size={14} color={theme.colors.textPrimary} />
            <Text style={[styles.filterActionText, { color: theme.colors.textPrimary }]}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {claims.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="gift-outline" size={32} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            No offer claims yet. Customers will appear here once they claim the Offer of the Day.
          </Text>
        </View>
      ) : (
        claims.map((c: any) => (
          <View key={c.id} style={styles.claimCard} testID={`claim-${c.id}`}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.claimName}>{c.name}</Text>
                <View
                  style={[
                    styles.availedPill,
                    c.offer_availed
                      ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                      : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
                  ]}
                >
                  <Text style={{
                    color: c.offer_availed ? '#166534' : '#92400E',
                    fontSize: 11, fontWeight: '700',
                  }}>
                    {c.offer_availed ? 'Availed' : 'Pending'}
                  </Text>
                </View>
              </View>
              <Text style={styles.claimSub}>+91{c.mobile}</Text>
              <Text style={styles.claimSub}>
                {c.plaza_name || '—'} · {c.outlet_name || 'Any outlet'}
              </Text>
              {!!c.offer_title && (
                <Text style={styles.claimOffer} numberOfLines={1}>
                  🎁 {c.offer_title}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <Text style={styles.claimMeta}>Token: <Text style={{ fontWeight: '800' }}>{c.token}</Text></Text>
                <Text style={styles.claimMeta}>DOB: {fmtDate(c.dob)}</Text>
                <Text style={styles.claimMeta}>Anniv: {fmtDate(c.anniversary)}</Text>
              </View>
              <Text style={styles.claimMeta}>{fmt(c.created_at)} IST</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={styles.availedToggleRow}>
                <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>Availed</Text>
                <Switch
                  value={!!c.offer_availed}
                  onValueChange={(v) => onToggleAvailed(c, v)}
                  testID={`claim-availed-${c.id}`}
                />
              </View>
              <IconBtn
                name="trash-outline"
                destructive
                testID={`claim-delete-${c.id}`}
                onPress={() => confirm(`Delete claim for ${c.name}?`, () => onDelete(c))}
              />
            </View>
          </View>
        ))
      )}
    </View>
  );
}



function ReservationsTab({ reservations, outlets, onStatusChange, onDelete }: any) {
  const [filterOutlet, setFilterOutlet] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const outletName = (id: string) => outlets.find((o: any) => o.id === id)?.name || 'Unknown';

  const filtered = reservations.filter((r: any) => {
    if (filterOutlet && r.outlet_id !== filterOutlet) return false;
    if (filterDate && r.date !== filterDate) return false;
    return true;
  });

  return (
    <View>
      <ListActionBar title="Reservations" count={filtered.length} />
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, filterOutlet === null && styles.filterChipActive]}
            onPress={() => setFilterOutlet(null)}
            testID="reservations-filter-all"
          >
            <Text style={[styles.filterChipText, filterOutlet === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          {outlets
            .filter((o: any) => o.is_reservation_enabled)
            .map((o: any) => (
              <TouchableOpacity
                key={o.id}
                style={[styles.filterChip, filterOutlet === o.id && styles.filterChipActive]}
                onPress={() => setFilterOutlet(o.id)}
                testID={`reservations-filter-${o.id}`}
              >
                <Text style={[styles.filterChipText, filterOutlet === o.id && { color: '#fff' }]}>{o.name}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
        <TextInput
          value={filterDate}
          onChangeText={setFilterDate}
          placeholder="Filter date YYYY-MM-DD"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.adminInput}
          testID="reservations-filter-date"
        />
      </View>

      {filtered.length === 0 && <Text style={styles.emptyText}>No reservations yet.</Text>}

      {filtered.map((r: any) => (
        <View key={r.id} style={styles.adminCard} testID={`admin-reservation-${r.id}`}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>
              {r.name} · {r.guests} guest{r.guests > 1 ? 's' : ''}
            </Text>
            <Text style={styles.cardSub}>
              {formatDisplayDate(r.date)} at {r.time} · {outletName(r.outlet_id)}
            </Text>
            <Text style={styles.cardSub}>
              <Ionicons name="call-outline" size={12} color={theme.colors.textSecondary} /> {r.mobile}
            </Text>
            {!!r.notes && (
              <Text style={styles.cardSub} numberOfLines={2}>
                Notes: {r.notes}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {['pending', 'confirmed', 'cancelled'].map((s) => {
                const active = r.status === s;
                const colors: any = {
                  pending: '#C89932',
                  confirmed: theme.colors.open,
                  cancelled: theme.colors.closed,
                };
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusChip,
                      active ? { backgroundColor: colors[s], borderColor: colors[s] } : {},
                    ]}
                    onPress={() => onStatusChange(r, s)}
                    testID={`res-status-${r.id}-${s}`}
                  >
                    <Text style={[styles.statusChipText, active && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <IconBtn
            name="trash-outline"
            destructive
            testID={`delete-reservation-${r.id}`}
            onPress={() => confirm('Delete this reservation?', () => onDelete(r))}
          />
        </View>
      ))}
    </View>
  );
}

// -------------------- Editors --------------------
function PlazaEditor({ initial, onClose, onSaved }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [city, setCity] = useState(initial?.city || '');
  const [status, setStatus] = useState<'operational' | 'upcoming'>(initial?.status || 'operational');
  const [isHeadOffice, setIsHeadOffice] = useState(!!initial?.is_head_office);
  const [description, setDescription] = useState(initial?.description || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [image, setImage] = useState(initial?.image || '');
  const [image2, setImage2] = useState(initial?.image2 || '');
  const [image3, setImage3] = useState(initial?.image3 || '');
  const [mapsUrl, setMapsUrl] = useState(initial?.google_maps_url || '');
  const [contactPhone, setContactPhone] = useState(initial?.contact_phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(initial?.whatsapp_number || '');
  const [expectedOpening, setExpectedOpening] = useState(initial?.expected_opening || '');
  const [orderIndex, setOrderIndex] = useState(
    initial?.order_index != null ? String(initial.order_index) : '0',
  );
  const [offersOn, setOffersOn] = useState(
    initial ? initial.is_offers_enabled !== false : true,
  );
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage(uri);
  };
  const pickImage2 = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage2(uri);
  };
  const pickImage3 = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage3(uri);
  };

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Missing', 'Plaza name is required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        city: city.trim(),
        status,
        is_head_office: isHeadOffice,
        description: description.trim(),
        address: address.trim(),
        image: image || null,
        image2: image2 || null,
        image3: image3 || null,
        gallery: initial?.gallery || [],
        google_maps_url: mapsUrl.trim(),
        contact_phone: contactPhone.trim(),
        whatsapp_number: whatsappNumber.trim(),
        expected_opening: expectedOpening.trim(),
        order_index: parseInt(orderIndex, 10) || 0,
        is_offers_enabled: offersOn,
      };
      if (initial) await api.adminUpdatePlaza(initial.id, data);
      else await api.adminCreatePlaza(data);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorShell title={initial ? 'Edit Plaza' : 'New Plaza'} onClose={onClose} onSave={save} saving={saving}>
      <AdminField label="Plaza Name" value={name} onChangeText={setName} testID="plaza-name-input" />
      <AdminField label="City" value={city} onChangeText={setCity} testID="plaza-city-input" />

      <Text style={styles.adminLabel}>Status</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['operational', 'upcoming'] as const).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.segmentBtn, status === s && styles.segmentBtnActive]}
            onPress={() => setStatus(s)}
            testID={`plaza-status-${s}`}
          >
            <Text style={[styles.segmentBtnText, status === s && { color: '#fff' }]}>
              {s === 'operational' ? 'Operational' : 'Upcoming'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {status === 'upcoming' && (
        <AdminField
          label="Expected Opening (e.g. Q2 2026)"
          value={expectedOpening}
          onChangeText={setExpectedOpening}
          testID="plaza-expected-opening-input"
        />
      )}

      <AdminField
        label="Address"
        value={address}
        onChangeText={setAddress}
        multiline
        testID="plaza-address-input"
      />
      <AdminField
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        testID="plaza-description-input"
      />
      <AdminField
        label="Contact Phone (plaza-level)"
        value={contactPhone}
        onChangeText={setContactPhone}
        keyboardType="phone-pad"
        testID="plaza-contact-phone-input"
      />
      <AdminField
        label="WhatsApp Number (plaza-level) — used for offer claims when no outlet WA is set"
        value={whatsappNumber}
        onChangeText={setWhatsappNumber}
        keyboardType="phone-pad"
        testID="plaza-whatsapp-input"
      />
      <AdminField
        label="Google Maps URL (e.g. https://maps.app.goo.gl/…) — tapped by the pin icon on home"
        value={mapsUrl}
        onChangeText={setMapsUrl}
        testID="plaza-maps-url-input"
      />
      <AdminField
        label="Display Order (lower = earlier)"
        value={orderIndex}
        onChangeText={setOrderIndex}
        keyboardType="numeric"
        testID="plaza-order-index-input"
      />

      <ImagePickerBlock
        label="Hero Image"
        value={image}
        onChangeText={setImage}
        onPick={pickImage}
        testID="plaza-image"
      />
      <ImagePickerBlock
        label="Gallery Image 2 (optional)"
        value={image2}
        onChangeText={setImage2}
        onPick={pickImage2}
        testID="plaza-image2"
      />
      <ImagePickerBlock
        label="Gallery Image 3 (optional)"
        value={image3}
        onChangeText={setImage3}
        onPick={pickImage3}
        testID="plaza-image3"
      />

      <View style={styles.toggleRow}>
        <Text style={styles.adminLabel}>Offers Enabled</Text>
        <Switch value={offersOn} onValueChange={setOffersOn} testID="plaza-offers-toggle" />
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.adminLabel}>Mark as Head Office</Text>
        <Switch value={isHeadOffice} onValueChange={setIsHeadOffice} testID="plaza-head-office-toggle" />
      </View>
    </EditorShell>
  );
}

function OutletEditor({ initial, plazas = [], onClose, onSaved }: any) {
  const [name, setName] = useState(initial?.name || '');
  const [mobile, setMobile] = useState(initial?.mobile || '');
  const [plazaId, setPlazaId] = useState<string>(initial?.plaza_id || '');
  const initialSlots: { open: string; close: string }[] =
    initial?.time_slots && initial.time_slots.length > 0
      ? initial.time_slots
      : [{ open: initial?.opening_time || '09:00', close: initial?.closing_time || '22:00' }];
  const [slots, setSlots] = useState(initialSlots);
  const [logo, setLogo] = useState(initial?.logo || '');
  const [image2, setImage2] = useState(initial?.image2 || '');
  const [image3, setImage3] = useState(initial?.image3 || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [address, setAddress] = useState(initial?.address || '');
  const [reservationOn, setReservationOn] = useState(!!initial?.is_reservation_enabled);
  const [offersOn, setOffersOn] = useState(initial ? initial.is_offers_enabled !== false : true);
  const [orderIndex, setOrderIndex] = useState(
    initial?.order_index != null ? String(initial.order_index) : '0'
  );
  const [saving, setSaving] = useState(false);
  const [plazaPickerOpen, setPlazaPickerOpen] = useState(false);

  const selectedPlaza = plazas.find((p: any) => p.id === plazaId);

  const updateSlot = (i: number, field: 'open' | 'close', v: string) => {
    setSlots((curr) => curr.map((s, idx) => (idx === i ? { ...s, [field]: v } : s)));
  };
  const addSlot = () => setSlots((c) => [...c, { open: '19:00', close: '23:00' }]);
  const removeSlot = (i: number) => setSlots((c) => c.filter((_, idx) => idx !== i));

  const pickImage = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setLogo(uri);
  };
  const pickImage2 = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage2(uri);
  };
  const pickImage3 = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage3(uri);
  };

  const save = async () => {
    if (!name.trim() || !mobile.trim()) {
      Alert.alert('Missing', 'Name and mobile are required.');
      return;
    }
    if (!plazaId) {
      Alert.alert('Select a plaza', 'Please choose the plaza this outlet belongs to.');
      return;
    }
    const timeRe = /^\d{2}:\d{2}$/;
    if (!slots.every((s) => timeRe.test(s.open) && timeRe.test(s.close))) {
      Alert.alert('Invalid time', 'Each slot must be in HH:MM format (e.g. 11:00).');
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        name: name.trim(),
        mobile: mobile.trim(),
        plaza_id: plazaId,
        opening_time: slots[0].open,
        closing_time: slots[slots.length - 1].close,
        time_slots: slots,
        logo,
        image2: image2 || null,
        image3: image3 || null,
        description,
        address,
        is_reservation_enabled: reservationOn,
        is_offers_enabled: offersOn,
        order_index: parseInt(orderIndex, 10) || 0,
      };
      if (initial) await api.adminUpdateOutlet(initial.id, data);
      else await api.adminCreateOutlet(data);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorShell title={initial ? 'Edit Outlet' : 'New Outlet'} onClose={onClose} onSave={save} saving={saving}>
      <Text style={styles.adminLabel}>Plaza *</Text>
      <TouchableOpacity
        style={styles.pickerBtn}
        onPress={() => setPlazaPickerOpen(true)}
        testID="outlet-plaza-picker"
      >
        <Text
          style={[
            styles.pickerBtnText,
            !selectedPlaza && { color: theme.colors.textSecondary },
          ]}
        >
          {selectedPlaza ? selectedPlaza.name : 'Select the plaza this outlet belongs to'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
      {plazaPickerOpen && (
        <View style={styles.pickerList} testID="outlet-plaza-list">
          {(plazas || []).map((p: any) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pickerItem, plazaId === p.id && styles.pickerItemActive]}
              onPress={() => {
                setPlazaId(p.id);
                setPlazaPickerOpen(false);
              }}
              testID={`outlet-plaza-option-${p.id}`}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.pickerItemText,
                    plazaId === p.id && { color: '#fff', fontWeight: '800' },
                  ]}
                >
                  {p.name}
                  {p.is_head_office ? '  · HQ' : ''}
                </Text>
                <Text
                  style={[
                    styles.pickerItemSub,
                    plazaId === p.id && { color: 'rgba(255,255,255,0.8)' },
                  ]}
                >
                  {p.status === 'operational' ? 'Operational' : 'Upcoming'}
                  {p.city ? `  ·  ${p.city}` : ''}
                </Text>
              </View>
              {plazaId === p.id && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <AdminField label="Name" value={name} onChangeText={setName} testID="outlet-name-input" />
      <AdminField label="Mobile Number" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" testID="outlet-mobile-input" />

      <Text style={styles.adminLabel}>Operating Hours</Text>
      {slots.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotSub}>Session {i + 1} — Open</Text>
            <TextInput
              style={styles.adminInput}
              value={s.open}
              onChangeText={(v) => updateSlot(i, 'open', v)}
              placeholder="11:00"
              placeholderTextColor={theme.colors.textSecondary}
              testID={`outlet-slot-${i}-open`}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotSub}>Close</Text>
            <TextInput
              style={styles.adminInput}
              value={s.close}
              onChangeText={(v) => updateSlot(i, 'close', v)}
              placeholder="16:00"
              placeholderTextColor={theme.colors.textSecondary}
              testID={`outlet-slot-${i}-close`}
            />
          </View>
          {slots.length > 1 && (
            <TouchableOpacity
              style={styles.slotRemoveBtn}
              onPress={() => removeSlot(i)}
              testID={`outlet-slot-${i}-remove`}
            >
              <Ionicons name="close" size={16} color={theme.colors.closed} />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {slots.length < 3 && (
        <TouchableOpacity style={styles.slotAddBtn} onPress={addSlot} testID="outlet-slot-add">
          <Ionicons name="add" size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>
            Add second session (e.g. lunch + dinner)
          </Text>
        </TouchableOpacity>
      )}

      <AdminField label="Address" value={address} onChangeText={setAddress} testID="outlet-address-input" />
      <AdminField label="Description" value={description} onChangeText={setDescription} multiline testID="outlet-description-input" />
      <ImagePickerBlock label="Logo / Image" value={logo} onChangeText={setLogo} onPick={pickImage} testID="outlet-logo" />
      <ImagePickerBlock label="Gallery Image 2 (optional)" value={image2} onChangeText={setImage2} onPick={pickImage2} testID="outlet-image2" />
      <ImagePickerBlock label="Gallery Image 3 (optional)" value={image3} onChangeText={setImage3} onPick={pickImage3} testID="outlet-image3" />

      <AdminField
        label="Display Order (0 = auto · 1..N = custom slot within plaza)"
        value={orderIndex}
        onChangeText={setOrderIndex}
        keyboardType="numeric"
        testID="outlet-order-index-input"
      />
      <View style={styles.toggleRow}>
        <Text style={styles.adminLabel}>Reservations Enabled</Text>
        <Switch value={reservationOn} onValueChange={setReservationOn} testID="outlet-reservation-toggle" />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.adminLabel}>Offers Enabled</Text>
        <Switch value={offersOn} onValueChange={setOffersOn} testID="outlet-offers-toggle" />
      </View>
    </EditorShell>
  );
}

function MenuEditor({ initial, outlets, onClose, onSaved }: any) {
  const [outletId, setOutletId] = useState(initial?.outlet_id || outlets[0]?.id || '');
  const [category, setCategory] = useState(initial?.category || '');
  const [name, setName] = useState(initial?.name || '');
  const [price, setPrice] = useState(initial?.price?.toString() || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!outletId || !category.trim() || !name.trim() || !price) {
      Alert.alert('Missing', 'Outlet, category, name and price are required.');
      return;
    }
    setSaving(true);
    try {
      // Menu items no longer capture an image or description from the admin UI;
      // we preserve any legacy values on edit for backwards-compat, but stop
      // surfacing them in the editor.
      const data = {
        outlet_id: outletId,
        category: category.trim(),
        name: name.trim(),
        price: parseFloat(price),
        image: initial?.image ?? '',
        description: initial?.description ?? '',
      };
      if (initial) await api.adminUpdateMenu(initial.id, data);
      else await api.adminCreateMenu(data);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorShell title={initial ? 'Edit Menu Item' : 'New Menu Item'} onClose={onClose} onSave={save} saving={saving}>
      <Text style={styles.adminLabel}>Outlet</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        {outlets.map((o: any) => {
          const active = outletId === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setOutletId(o.id)}
              testID={`menu-outlet-pick-${o.id}`}
            >
              <Text style={[styles.filterChipText, active && { color: '#fff' }]}>{o.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <AdminField label="Category" value={category} onChangeText={setCategory} testID="menu-category-input" />
      <AdminField label="Item Name" value={name} onChangeText={setName} testID="menu-name-input" />
      <AdminField label="Price (₹)" value={price} onChangeText={setPrice} keyboardType="numeric" testID="menu-price-input" />
    </EditorShell>
  );
}

function OfferEditor({ initial, outlets, onClose, onSaved }: any) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [image, setImage] = useState(initial?.image || '');
  const [outletId, setOutletId] = useState<string | null>(initial?.outlet_id || null);
  const [validUntil, setValidUntil] = useState(initial?.valid_until || '');
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [isOTD, setIsOTD] = useState(initial?.is_offer_of_the_day ?? false);
  const [saving, setSaving] = useState(false);

  const pickImage = async () => {
    const uri = await pickAndEncodeImage();
    if (uri) setImage(uri);
  };

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Missing', 'Title is required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description,
        image,
        outlet_id: outletId,
        valid_until: validUntil || null,
        is_active: active,
        is_offer_of_the_day: isOTD,
      };
      if (initial) await api.adminUpdateOffer(initial.id, data);
      else await api.adminCreateOffer(data);
      onSaved();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <EditorShell title={initial ? 'Edit Offer' : 'New Offer'} onClose={onClose} onSave={save} saving={saving}>
      <AdminField label="Title" value={title} onChangeText={setTitle} testID="offer-title-input" />
      <AdminField label="Description" value={description} onChangeText={setDescription} multiline testID="offer-description-input" />
      <AdminField label="Valid Until (YYYY-MM-DD)" value={validUntil} onChangeText={setValidUntil} testID="offer-valid-input" />
      <Text style={styles.adminLabel}>Applies To</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
        <TouchableOpacity
          style={[styles.filterChip, outletId === null && styles.filterChipActive]}
          onPress={() => setOutletId(null)}
          testID="offer-outlet-pick-all"
        >
          <Text style={[styles.filterChipText, outletId === null && { color: '#fff' }]}>All Outlets</Text>
        </TouchableOpacity>
        {outlets.map((o: any) => {
          const a = outletId === o.id;
          return (
            <TouchableOpacity
              key={o.id}
              style={[styles.filterChip, a && styles.filterChipActive]}
              onPress={() => setOutletId(o.id)}
              testID={`offer-outlet-pick-${o.id}`}
            >
              <Text style={[styles.filterChipText, a && { color: '#fff' }]}>{o.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <ImagePickerBlock label="Banner Image" value={image} onChangeText={setImage} onPick={pickImage} testID="offer-image" />
      <View style={styles.toggleRow}>
        <Text style={styles.adminLabel}>Active</Text>
        <Switch value={active} onValueChange={setActive} testID="offer-active-toggle" />
      </View>
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.adminLabel}>Offer of the Day</Text>
          <Text style={{ fontSize: 11, color: theme.colors.textSecondary }}>
            Shown first after customer signs up. Typically one active per outlet.
          </Text>
        </View>
        <Switch value={isOTD} onValueChange={setIsOTD} testID="offer-otd-toggle" />
      </View>
    </EditorShell>
  );
}

// -------------------- Shared --------------------
function EditorShell({ title, onClose, onSave, saving, children }: any) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={[styles.editorBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={styles.editorClose} testID="editor-close">
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.editorTitle}>{title}</Text>
        <TouchableOpacity onPress={onSave} style={styles.editorSave} disabled={saving} testID="editor-save">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.editorSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </>
  );
}

function AdminField({ label, multiline, testID, ...props }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.adminLabel}>{label}</Text>
      <TextInput
        style={[styles.adminInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={theme.colors.textSecondary}
        multiline={multiline}
        testID={testID}
        {...props}
      />
    </View>
  );
}

function ImagePickerBlock({ label, value, onChangeText, onPick, testID }: any) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.adminLabel}>{label}</Text>
      {value ? <Image source={{ uri: value }} style={styles.editorPreview} /> : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <TextInput
          style={[styles.adminInput, { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Paste image URL or pick from device"
          placeholderTextColor={theme.colors.textSecondary}
          testID={`${testID}-input`}
        />
        <TouchableOpacity style={styles.pickBtn} onPress={onPick} testID={`${testID}-pick`}>
          <Ionicons name="image-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function IconBtn({ name, onPress, destructive, testID }: any) {
  return (
    <TouchableOpacity
      style={[styles.iconBtn, destructive && { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' }]}
      onPress={onPress}
      testID={testID}
    >
      <Ionicons name={name} size={18} color={destructive ? theme.colors.closed : theme.colors.textPrimary} />
    </TouchableOpacity>
  );
}

// -------------------- Feedback Tab --------------------
function FeedbackTab({ feedbacks, outlets, onDelete }: any) {
  const [minRating, setMinRating] = useState<number | null>(null);
  const [outletFilter, setOutletFilter] = useState<string | null>(null);
  const outletName = (id?: string | null) =>
    id ? outlets.find((o: any) => o.id === id)?.name || 'Unknown' : 'Overall Plaza';

  const filtered = feedbacks.filter((f: any) => {
    if (minRating && f.rating < minRating) return false;
    if (outletFilter === 'overall' && f.outlet_id !== null) return false;
    if (outletFilter && outletFilter !== 'overall' && f.outlet_id !== outletFilter) return false;
    return true;
  });

  return (
    <View>
      <ListActionBar title="Guest Feedback" count={filtered.length} />
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <TouchableOpacity
            style={[styles.filterChip, outletFilter === null && styles.filterChipActive]}
            onPress={() => setOutletFilter(null)}
            testID="fb-filter-all"
          >
            <Text style={[styles.filterChipText, outletFilter === null && { color: '#fff' }]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, outletFilter === 'overall' && styles.filterChipActive]}
            onPress={() => setOutletFilter('overall')}
            testID="fb-filter-overall"
          >
            <Text style={[styles.filterChipText, outletFilter === 'overall' && { color: '#fff' }]}>Overall Plaza</Text>
          </TouchableOpacity>
          {outlets.map((o: any) => (
            <TouchableOpacity
              key={o.id}
              style={[styles.filterChip, outletFilter === o.id && styles.filterChipActive]}
              onPress={() => setOutletFilter(o.id)}
              testID={`fb-filter-${o.id}`}
            >
              <Text style={[styles.filterChipText, outletFilter === o.id && { color: '#fff' }]}>{o.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[null, 5, 4, 3, 2, 1].map((n) => (
            <TouchableOpacity
              key={String(n)}
              style={[styles.filterChip, minRating === n && styles.filterChipActive]}
              onPress={() => setMinRating(n)}
              testID={`fb-rating-${n ?? 'all'}`}
            >
              <Text style={[styles.filterChipText, minRating === n && { color: '#fff' }]}>
                {n === null ? 'All ratings' : `${n}★ & up`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filtered.length === 0 && <Text style={styles.emptyText}>No feedback yet.</Text>}

      {filtered.map((f: any) => (
        <View key={f.id} style={styles.adminCard} testID={`admin-feedback-${f.id}`}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= f.rating ? 'star' : 'star-outline'} size={14} color="#E0A300" />
              ))}
              <Text style={[styles.cardSub, { marginLeft: 6 }]}>{f.category}</Text>
            </View>
            <Text style={styles.cardTitle}>{f.name}</Text>
            <Text style={styles.cardSub}>{outletName(f.outlet_id)}</Text>
            <Text style={[styles.cardSub, { marginTop: 6, color: theme.colors.textPrimary }]}>{f.message}</Text>
            {!!f.mobile && (
              <Text style={styles.cardSub}>
                <Ionicons name="call-outline" size={12} color={theme.colors.textSecondary} /> {f.mobile}
              </Text>
            )}
          </View>
          <IconBtn
            name="trash-outline"
            destructive
            testID={`delete-feedback-${f.id}`}
            onPress={() => confirm('Delete this feedback?', () => onDelete(f))}
          />
        </View>
      ))}
    </View>
  );
}

// -------------------- Analytics Tab --------------------
function AnalyticsTab({ data, onRefresh }: any) {
  if (!data) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 40 }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }
  const { totals, reservations_by_period, reservations_by_outlet, reservations_by_status, clicks_total, clicks_by_outlet, recent_reservations } = data;

  return (
    <View>
      <View style={styles.listHeader}>
        <View>
          <Text style={styles.listTitle}>Dashboard</Text>
          <Text style={styles.listCount}>Live metrics from your database</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} testID="analytics-refresh">
          <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Totals */}
      <View style={styles.kpiRow}>
        <KpiCard icon="storefront-outline" label="Outlets" value={totals.outlets} color={theme.colors.primary} />
        <KpiCard icon="restaurant-outline" label="Menu Items" value={totals.menu_items} color="#7C5AB5" />
        <KpiCard icon="pricetag-outline" label="Active Offers" value={totals.offers} color="#D97706" />
        <KpiCard icon="calendar-outline" label="Reservations" value={totals.reservations} color={theme.colors.open} />
      </View>

      {/* Reservation trends */}
      <Text style={styles.sectionHeader}>Reservations</Text>
      <View style={styles.kpiRow}>
        <KpiCard label="Today" value={reservations_by_period.today} color={theme.colors.primary} />
        <KpiCard label="Last 7 days" value={reservations_by_period.week} color="#7C5AB5" />
        <KpiCard label="Last 30 days" value={reservations_by_period.month} color={theme.colors.open} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {['pending', 'confirmed', 'cancelled'].map((s) => {
          const count = (reservations_by_status || {})[s] || 0;
          const colors: any = {
            pending: '#C89932',
            confirmed: theme.colors.open,
            cancelled: theme.colors.closed,
          };
          return (
            <View key={s} style={[styles.statusPill, { backgroundColor: colors[s] }]}>
              <Text style={styles.statusPillText}>{s}: {count}</Text>
            </View>
          );
        })}
      </View>

      {reservations_by_outlet.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Top outlets by reservations</Text>
          {reservations_by_outlet.map((r: any, i: number) => (
            <BarRow key={r.outlet_id} rank={i + 1} label={r.name} value={r.count} max={reservations_by_outlet[0].count} color={theme.colors.primary} />
          ))}
        </>
      )}

      {/* Click tracking */}
      <Text style={styles.sectionHeader}>Customer interactions</Text>
      <View style={styles.kpiRow}>
        <KpiCard icon="call-outline" label="Total Calls" value={clicks_total.calls} color={theme.colors.primary} />
        <KpiCard icon="logo-whatsapp" label="WhatsApp Clicks" value={clicks_total.whatsapps} color={theme.colors.whatsapp} />
      </View>
      {clicks_by_outlet && clicks_by_outlet.length > 0 ? (
        clicks_by_outlet.map((c: any) => (
          <View key={c.outlet_id} style={styles.clickRow}>
            <Text style={styles.clickRowName} numberOfLines={1}>{c.name}</Text>
            <View style={styles.clickBadge}>
              <Ionicons name="call-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.clickBadgeText}>{c.calls}</Text>
            </View>
            <View style={styles.clickBadge}>
              <Ionicons name="logo-whatsapp" size={12} color={theme.colors.whatsapp} />
              <Text style={styles.clickBadgeText}>{c.whatsapps}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>No Call / WhatsApp clicks tracked yet. Share the app with customers to start collecting data.</Text>
      )}

      {/* Feedback summary */}
      <Text style={styles.sectionHeader}>Guest feedback</Text>
      <View style={styles.kpiRow}>
        <KpiCard icon="chatbubble-ellipses-outline" label="Total Feedback" value={data.feedback_count || 0} color="#E0A300" />
        <KpiCard icon="star" label="Avg. Rating" value={data.feedback_avg_rating || 0} color="#E0A300" />
      </View>
      {data.feedback_by_outlet && data.feedback_by_outlet.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { fontSize: 13, marginTop: 14 }]}>Top-rated outlets</Text>
          {data.feedback_by_outlet.map((r: any, i: number) => (
            <View key={r.outlet_id} style={styles.clickRow}>
              <Text style={styles.clickRowName} numberOfLines={1}>{i + 1}. {r.name}</Text>
              <View style={styles.clickBadge}>
                <Ionicons name="star" size={12} color="#E0A300" />
                <Text style={styles.clickBadgeText}>{r.avg_rating}</Text>
              </View>
              <View style={styles.clickBadge}>
                <Text style={styles.clickBadgeText}>{r.count} reviews</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {/* Recent reservations */}
      {recent_reservations && recent_reservations.length > 0 && (
        <>
          <Text style={styles.sectionHeader}>Latest reservations</Text>
          {recent_reservations.map((r: any) => (
            <View key={r.id} style={styles.adminCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{r.name} · {r.guests} guest{r.guests > 1 ? 's' : ''}</Text>
                <Text style={styles.cardSub}>{formatDisplayDate(r.date)} at {r.time} · {r.outlet_name}</Text>
                <Text style={styles.cardSub}>Status: {r.status}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function KpiCard({ icon, label, value, color }: any) {
  return (
    <View style={styles.kpiCard}>
      {icon && (
        <View style={[styles.kpiIcon, { backgroundColor: color + '22' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
      )}
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function BarRow({ rank, label, value, max, color }: any) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={styles.barLabel}>
          {rank}. {label}
        </Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// -------------------- Bulk Menu Importer --------------------
function BulkMenuImporter({ outlets, onClose, onDone }: any) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ],
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setFileName(a.name);
    try {
      const response = await fetch(a.uri);
      const arrayBuf = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuf, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
      const parsed = rows.map((r) => {
        const k = (name: string) => {
          const key = Object.keys(r).find((kk) => kk.toLowerCase().trim() === name.toLowerCase());
          return key ? String(r[key]).trim() : '';
        };
        return {
          outlet_name: k('Outlet') || k('Outlet Name') || k('outlet_name'),
          category: k('Category'),
          name: k('Item Name') || k('Name') || k('Item'),
          price: parseFloat(k('Price') || '0'),
          image: k('Image') || k('Image URL') || '',
          description: k('Description') || '',
        };
      }).filter((x) => x.name && x.category);
      setItems(parsed);
    } catch (e: any) {
      Alert.alert('Parse error', e.message);
    }
  };

  const doImport = async () => {
    if (items.length === 0) {
      Alert.alert('Empty', 'No valid rows found to import.');
      return;
    }
    setUploading(true);
    try {
      const r = await api.adminBulkMenu(items, replaceExisting);
      setResult(r);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <View style={[styles.editorBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={styles.editorClose} testID="bulk-close">
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.editorTitle}>Bulk Menu Import</Text>
        <View style={{ width: 76 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {!result ? (
          <>
            <Text style={styles.bulkIntro}>
              Upload an Excel file with columns: <Text style={{ fontWeight: '800' }}>Outlet Name, Category, Item Name, Price</Text> (optional: Image URL, Description).
            </Text>
            <Text style={styles.bulkHint}>
              Outlet Name must exactly match one of your outlets:
            </Text>
            <View style={styles.outletList}>
              {outlets.map((o: any) => (
                <View key={o.id} style={styles.outletChip}>
                  <Text style={styles.outletChipText}>{o.name}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.pickFileBtn} onPress={pickFile} testID="bulk-pick-file">
              <Ionicons name="document-outline" size={20} color="#fff" />
              <Text style={styles.pickFileText}>{fileName ? 'Change File' : 'Select Excel / CSV File'}</Text>
            </TouchableOpacity>
            {!!fileName && (
              <Text style={styles.fileName}>
                <Ionicons name="document-text-outline" size={14} color={theme.colors.textSecondary} /> {fileName}
              </Text>
            )}

            {items.length > 0 && (
              <>
                <Text style={styles.bulkPreviewTitle}>Preview ({items.length} rows)</Text>
                <ScrollView style={{ maxHeight: 260 }} nestedScrollEnabled>
                  {items.slice(0, 50).map((it, i) => (
                    <View key={i} style={styles.previewRow}>
                      <Text style={styles.previewCell} numberOfLines={1}>{it.outlet_name}</Text>
                      <Text style={styles.previewCell} numberOfLines={1}>{it.category}</Text>
                      <Text style={[styles.previewCell, { flex: 2 }]} numberOfLines={1}>{it.name}</Text>
                      <Text style={[styles.previewCell, { flex: 0.8, textAlign: 'right' }]}>₹{it.price}</Text>
                    </View>
                  ))}
                  {items.length > 50 && (
                    <Text style={styles.bulkHint}>...and {items.length - 50} more rows.</Text>
                  )}
                </ScrollView>

                <View style={[styles.toggleRow, { marginTop: 16 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adminLabel}>Replace existing menu items</Text>
                    <Text style={styles.bulkHint}>If ON, existing menu of affected outlets will be cleared first.</Text>
                  </View>
                  <Switch value={replaceExisting} onValueChange={setReplaceExisting} testID="bulk-replace-toggle" />
                </View>

                <TouchableOpacity
                  style={[styles.pickFileBtn, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
                  onPress={doImport}
                  disabled={uploading}
                  testID="bulk-submit"
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                      <Text style={styles.pickFileText}>Import {items.length} items</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <View style={[styles.successIconSmall, { backgroundColor: theme.colors.open }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={styles.bulkDoneTitle}>Import Complete</Text>
            <Text style={styles.bulkDoneSub}>
              {result.inserted} items added · {result.outlets_affected} outlets affected
              {result.errors.length > 0 ? ` · ${result.errors.length} rows skipped` : ''}
            </Text>
            {result.errors.length > 0 && (
              <ScrollView style={{ maxHeight: 160, alignSelf: 'stretch', marginTop: 12 }}>
                {result.errors.slice(0, 20).map((e: any, i: number) => (
                  <Text key={i} style={styles.bulkErrorRow}>Row {e.row}: {e.error}</Text>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.pickFileBtn, { backgroundColor: theme.colors.primary, marginTop: 24 }]} onPress={onDone} testID="bulk-done">
              <Text style={styles.pickFileText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </>
  );
}

function confirm(msg: string, action: () => void) {
  // NOTE: Browsers (Chrome 92+ and others) block window.confirm/alert inside
  // iframes unless "allow=modals" is set on the parent iframe — which means
  // the Emergent preview would silently eat the prompt and the action would
  // never fire. We instead dispatch a custom event that the in-app
  // <ConfirmDialog /> listens for. Falls back to Alert.alert on native.
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const ev = new (window as any).CustomEvent('app:confirm', {
        detail: { msg, action },
      });
      (window as any).dispatchEvent(ev);
    }
    return;
  }
  Alert.alert('Confirm', msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: action },
  ]);
}

/** React-based confirm dialog shown on web (replaces window.confirm which is
 * blocked inside iframes). Listens for the `app:confirm` custom event emitted
 * by the confirm() helper. */
function ConfirmDialog() {
  const [state, setState] = useState<{ msg: string; action: () => void } | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const handler = (e: any) => {
      const detail = e?.detail;
      if (detail && typeof detail.action === 'function') {
        setState({ msg: String(detail.msg || 'Are you sure?'), action: detail.action });
      }
    };
    (window as any).addEventListener('app:confirm', handler);
    return () => (window as any).removeEventListener('app:confirm', handler);
  }, []);

  if (!state) return null;

  const cancel = () => setState(null);
  const proceed = () => {
    const fn = state.action;
    setState(null);
    try {
      fn();
    } catch (e) {
      // swallow — the action itself should handle its own errors
    }
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={cancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmBox}>
          <View style={styles.confirmIcon}>
            <Ionicons name="warning-outline" size={26} color="#B91C1C" />
          </View>
          <Text style={styles.confirmTitle}>Please confirm</Text>
          <Text style={styles.confirmMsg}>{state.msg}</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnCancel]}
              onPress={cancel}
              testID="confirm-cancel"
            >
              <Text style={styles.confirmBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, styles.confirmBtnDelete]}
              onPress={proceed}
              testID="confirm-delete"
            >
              <Text style={styles.confirmBtnDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// -------------------- Change Password Modal --------------------
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canSave = !!current && !!next && !!confirmPw && next.length >= 6 && next === confirmPw;

  const save = async () => {
    setErrorMsg('');
    if (!current) {
      setErrorMsg('Please enter your current password.');
      return;
    }
    if (!next) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    if (next.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (next !== confirmPw) {
      setErrorMsg('The two new-password fields do not match.');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword(current, next);
      setDone(true);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Could not change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={[styles.successIconSmall, { backgroundColor: theme.colors.open }]}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </View>
        <Text style={styles.bulkDoneTitle}>Password Updated</Text>
        <Text style={styles.bulkDoneSub}>Use your new password from next login.</Text>
        <TouchableOpacity
          style={[styles.pickFileBtn, { backgroundColor: theme.colors.primary, marginTop: 24, minWidth: 160 }]}
          onPress={onClose}
          testID="change-pw-done"
        >
          <Text style={styles.pickFileText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.editorBar, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onClose} style={styles.editorClose} testID="change-pw-close">
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.editorTitle}>Change Password</Text>
        <TouchableOpacity
          onPress={save}
          style={[
            styles.editorSave,
            (!canSave || saving) && { opacity: 0.45 },
          ]}
          disabled={saving}
          testID="change-pw-save"
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.editorSaveText}>Save</Text>}
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.adminLabel}>Current Password</Text>
        <View style={styles.pwInputWrap}>
          <TextInput
            style={styles.pwInput}
            value={current}
            onChangeText={setCurrent}
            placeholder="Enter your current password"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={!showCurrent}
            autoCapitalize="none"
            autoCorrect={false}
            testID="change-pw-current"
          />
          <TouchableOpacity onPress={() => setShowCurrent((s) => !s)} style={styles.pwEye}>
            <Ionicons
              name={showCurrent ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
        <Text style={styles.adminLabel}>New Password</Text>
        <View style={styles.pwInputWrap}>
          <TextInput
            style={styles.pwInput}
            value={next}
            onChangeText={setNext}
            placeholder="At least 6 characters"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={!showNext}
            autoCapitalize="none"
            autoCorrect={false}
            testID="change-pw-new"
          />
          <TouchableOpacity onPress={() => setShowNext((s) => !s)} style={styles.pwEye}>
            <Ionicons
              name={showNext ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 12 }} />
        <Text style={styles.adminLabel}>Confirm New Password</Text>
        <View style={styles.pwInputWrap}>
          <TextInput
            style={styles.pwInput}
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder="Re-type the new password"
            placeholderTextColor={theme.colors.textSecondary}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
            autoCorrect={false}
            testID="change-pw-confirm"
          />
          <TouchableOpacity onPress={() => setShowConfirm((s) => !s)} style={styles.pwEye}>
            <Ionicons
              name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {!!errorMsg && (
          <View style={styles.pwErrorBox} testID="change-pw-error">
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.pwErrorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Inline helper: what's still required */}
        {!canSave && !errorMsg && (
          <View style={styles.pwHelperBox}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.pwHelperText}>
              {!current
                ? 'Enter your current password to continue.'
                : !next
                ? 'Enter a new password.'
                : next.length < 6
                ? 'New password must be at least 6 characters.'
                : !confirmPw
                ? 'Re-type the new password to confirm.'
                : next !== confirmPw
                ? 'New password and confirmation do not match yet.'
                : ''}
            </Text>
          </View>
        )}

        {/* Bottom-of-form Save button so it's never hidden behind the keyboard */}
        <TouchableOpacity
          style={[
            styles.pwBigSaveBtn,
            (!canSave || saving) && styles.pwBigSaveBtnDisabled,
          ]}
          disabled={!canSave || saving}
          onPress={save}
          testID="change-pw-save-bottom"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={styles.pwBigSaveText}>Update Password</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.bulkHint, { marginTop: 14 }]}>
          Tip: Choose a strong password with a mix of letters, numbers, and symbols. You will need to sign in again on other devices with the new password.
        </Text>
      </ScrollView>
    </>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  overline: { fontSize: 11, letterSpacing: 2, color: theme.colors.textSecondary, textTransform: 'uppercase', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoutText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  tabBar: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderLight, maxHeight: 50 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.background,
  },
  tabActive: { backgroundColor: theme.colors.admin },
  tabText: { color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.3 },
  listCount: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700' },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  thumb: { width: 54, height: 54, borderRadius: 8, backgroundColor: theme.colors.background },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 2 },
  cardSub: { fontSize: 12, color: theme.colors.textSecondary },
  rowBtns: { flexDirection: 'row', gap: 6 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  filters: { marginBottom: 12, gap: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  filterChipActive: { backgroundColor: theme.colors.admin, borderColor: theme.colors.admin },
  filterChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statusChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textPrimary, textTransform: 'capitalize' },
  editorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: '#fff',
  },
  editorClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  editorTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary },
  editorSave: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 76,
    alignItems: 'center',
  },
  editorSaveText: { color: '#fff', fontWeight: '700' },
  editorPreview: { width: '100%', height: 140, borderRadius: 10, marginTop: 8, backgroundColor: theme.colors.background },
  adminLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  adminInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: theme.colors.textPrimary,
    backgroundColor: '#fff',
  },
  pickBtn: {
    backgroundColor: theme.colors.admin,
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  emptyText: { textAlign: 'center', color: theme.colors.textSecondary, paddingVertical: 20 },
  // Plaza tab styles
  plazaGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
    paddingLeft: 4,
  },
  hqBadgeSm: {
    backgroundColor: theme.colors.brandYellow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  hqBadgeSmText: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.brandBlueDeep,
    letterSpacing: 0.5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  notifyAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  primaryCtaText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  pickerBtnText: { flex: 1, fontSize: 14, color: theme.colors.textPrimary, fontWeight: '600' },
  pickerList: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
    overflow: 'hidden',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  pickerItemActive: { backgroundColor: theme.colors.primary },
  pickerItemText: { fontSize: 14, color: theme.colors.textPrimary, fontWeight: '600' },
  pickerItemSub: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  // Plaza/outlet filter chips
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  filterChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  filterChipSm: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: '#fff',
  },
  filterChipSmActive: {
    backgroundColor: theme.colors.brandBlue,
    borderColor: theme.colors.brandBlue,
  },
  filterChipSmText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  slotSub: { fontSize: 11, color: theme.colors.textSecondary, marginBottom: 4, fontWeight: '600' },
  slotRemoveBtn: {
    width: 36,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  slotAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF5F0',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  // Analytics styles
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginTop: 22,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiCard: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#fff',
  },
  kpiIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  kpiValue: { fontSize: 22, fontWeight: '800', color: theme.colors.textPrimary, letterSpacing: -0.5 },
  kpiLabel: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2, fontWeight: '600' },
  barLabel: { fontSize: 13, color: theme.colors.textPrimary, fontWeight: '600' },
  barValue: { fontSize: 13, color: theme.colors.primary, fontWeight: '800' },
  barTrack: { height: 8, backgroundColor: theme.colors.border, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  statusPillText: { color: '#fff', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  clickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  clickRowName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.textPrimary },
  clickBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  clickBadgeText: { fontSize: 12, fontWeight: '700', color: theme.colors.textPrimary },
  // Bulk import styles
  bulkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF5F0',
  },
  bulkBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  bulkIntro: { fontSize: 14, color: theme.colors.textPrimary, lineHeight: 22, marginBottom: 12 },
  bulkHint: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
  outletList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 16 },
  outletChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  outletChipText: { fontSize: 11, color: theme.colors.textPrimary, fontWeight: '600' },
  pickFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.admin,
  },
  pickFileText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fileName: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 10, textAlign: 'center' },
  bulkPreviewTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.textPrimary, marginTop: 22, marginBottom: 8 },
  previewRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  previewCell: { flex: 1, fontSize: 12, color: theme.colors.textPrimary },
  successIconSmall: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  // Change Password modal extras
  pwInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  pwInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: theme.colors.textPrimary,
  },
  pwEye: { paddingHorizontal: 12, paddingVertical: 12 },
  pwErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  pwErrorText: { color: '#991B1B', fontSize: 13, fontWeight: '600', flex: 1 },
  pwHelperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  pwHelperText: { color: theme.colors.textSecondary, fontSize: 12, flex: 1 },
  pwBigSaveBtn: {
    marginTop: 18,
    backgroundColor: theme.colors.admin || theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pwBigSaveBtnDisabled: { backgroundColor: '#9CA3AF' },
  pwBigSaveText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  bulkDoneTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.textPrimary, marginBottom: 6 },
  bulkDoneSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center' },
  bulkErrorRow: { fontSize: 12, color: theme.colors.closed, marginBottom: 4 },

  // Offer Claims Tab
  claimsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.brandBlueDeep || '#1E3A8A',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  exportBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  filterRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  filterInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: theme.colors.textPrimary,
    backgroundColor: '#FAFAFA',
  },
  filterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  filterActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  claimCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    gap: 8,
  },
  claimName: { fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary },
  claimSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  claimOffer: { fontSize: 12, color: theme.colors.textPrimary, marginTop: 3, fontStyle: 'italic' },
  claimMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  availedPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  availedToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  // Categories manager
  catGroupTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
    marginBottom: 8,
    marginTop: 4,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
    gap: 6,
  },
  catName: { fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary },
  catMeta: { fontSize: 11, color: theme.colors.textSecondary, marginTop: 2 },
  catActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  catRenameInput: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    backgroundColor: '#FFF7ED',
  },

  // Confirm dialog (replaces window.confirm which is blocked in iframes)
  confirmBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  confirmMsg: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  confirmRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBtnCancel: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: theme.colors.borderLight || '#E5E7EB',
  },
  confirmBtnCancelText: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  confirmBtnDelete: { backgroundColor: '#DC2626' },
  confirmBtnDeleteText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
