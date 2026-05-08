/**
 * Tiny in-memory client cache for Gallops.
 *
 * The home screen hydrates this cache from `GET /api/bootstrap` on first load,
 * giving the plaza list, lite outlet list, and active offers in a single
 * round-trip. Plaza/outlet detail screens then read from the cache so that
 * navigation feels instant — they only re-fetch on pull-to-refresh.
 *
 * NOTE: This is intentionally simple and process-local. We don't persist to
 * AsyncStorage because data shape changes often during admin edits and we
 * don't want stale data after re-installs. Pull-to-refresh always wins.
 */

type Plaza = any;
type Outlet = any; // lite outlets (no logo / image2 / image3 / description)
type Offer = any;

type State = {
  hydrated: boolean;
  plazas: Plaza[];
  outletsLite: Outlet[];
  offers: Offer[];
  // Per-plaza FULL outlets (with logos) populated lazily by plaza screen.
  fullOutletsByPlaza: Record<string, Outlet[]>;
};

const state: State = {
  hydrated: false,
  plazas: [],
  outletsLite: [],
  offers: [],
  fullOutletsByPlaza: {},
};

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* noop */
    }
  });
}

export const cache = {
  isHydrated: () => state.hydrated,

  getPlazas: () => state.plazas,
  getOffers: () => state.offers,
  getPlaza: (id: string) => state.plazas.find((p) => p.id === id) || null,
  getOutletsLiteForPlaza: (plazaId: string) =>
    state.outletsLite.filter((o) => o.plaza_id === plazaId),
  getFullOutletsForPlaza: (plazaId: string) =>
    state.fullOutletsByPlaza[plazaId] || null,

  setBootstrap: (data: { plazas: Plaza[]; outlets: Outlet[]; offers: Offer[] }) => {
    state.plazas = data.plazas || [];
    state.outletsLite = data.outlets || [];
    state.offers = data.offers || [];
    state.hydrated = true;
    emit();
  },

  setFullOutletsForPlaza: (plazaId: string, outlets: Outlet[]) => {
    state.fullOutletsByPlaza[plazaId] = outlets;
    emit();
  },

  /**
   * Subscribe to cache updates. Returns an unsubscribe function.
   */
  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Wipe everything — useful on pull-to-refresh failure / logout. */
  reset: () => {
    state.hydrated = false;
    state.plazas = [];
    state.outletsLite = [];
    state.offers = [];
    state.fullOutletsByPlaza = {};
    emit();
  },
};
