export const theme = {
  colors: {
    // Warm earthy palette (used INSIDE each plaza)
    primary: '#C84B31',
    primaryLight: '#E97A63',
    background: '#F9F6F0',
    surface: '#FFFFFF',
    textPrimary: '#2D2825',
    textSecondary: '#7A7571',
    border: '#E5DFD3',
    borderLight: '#EFEAE0',
    open: '#4A7C59',
    closed: '#B33939',
    whatsapp: '#25D366',
    admin: '#1F2937',

    // GFP Brand palette (used on splash + plaza landing)
    brandBlue: '#2C1E7A',
    brandBlueDeep: '#1E1457',
    brandBlueLight: '#3F30A0',
    brandYellow: '#FDC72F',
    brandYellowDeep: '#E3A90C',
    brandWhite: '#FFFFFF',
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  shadow: {
    card: {
      shadowColor: '#2D2825',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 3,
    },
    soft: {
      shadowColor: '#2D2825',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
  },
  brand: {
    // Local transparent logo (no black/white background)
    logo: require('../assets/brand/gfp-logo.png'),
    tagline: "India's Fastest Growing Highway Food Plaza Experience",
  },
};
