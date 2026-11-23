import { createSlice } from '@reduxjs/toolkit';

const getSavedPincode = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('aurora_delivery_pincode') || '110001';
  }
  return '110001';
};

const getSavedRegion = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('aurora_delivery_region') || 'Northern Logistics Zone';
  }
  return 'Northern Logistics Zone';
};

const initialState = {
  mobileMenuOpen: false,
  toasts: [],
  activeSearchModal: false,
  deliveryPincode: getSavedPincode(),
  deliveryRegion: getSavedRegion(),
  pincodeModalOpen: false,
  authModalOpen: false,
  pendingAction: null
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setMobileMenuOpen: (state, action) => {
      state.mobileMenuOpen = action.payload;
    },
    setDeliveryPincode: (state, action) => {
      const { pincode, region } = typeof action.payload === 'object'
        ? action.payload
        : { pincode: action.payload, region: 'National Hub' };
      state.deliveryPincode = pincode;
      if (region) state.deliveryRegion = region;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('aurora_delivery_pincode', pincode);
        if (region) localStorage.setItem('aurora_delivery_region', region);
      }
    },
    setPincodeModalOpen: (state, action) => {
      state.pincodeModalOpen = Boolean(action.payload);
    },
    addToast: (state, action) => {
      const message = typeof action.payload === 'string' ? action.payload : action.payload?.message;
      if (!message) return;
      // Prevent duplicate toast if an identical message is already in queue
      if (state.toasts.some((t) => t.message === message)) {
        return;
      }
      state.toasts.push({
        id: Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        type: action.payload?.type || 'info', // info, success, warning, error
        message,
        duration: action.payload?.duration || 4500
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    clearToasts: (state) => {
      state.toasts = [];
    },
    setSearchModalOpen: (state, action) => {
      state.activeSearchModal = action.payload;
    },
    setAuthModalOpen: (state, action) => {
      state.authModalOpen = Boolean(action.payload);
    },
    setPendingAction: (state, action) => {
      state.pendingAction = action.payload;
    },
    clearPendingAction: (state) => {
      state.pendingAction = null;
    }
  }
});

export const {
  toggleMobileMenu,
  setMobileMenuOpen,
  setDeliveryPincode,
  setPincodeModalOpen,
  addToast,
  removeToast,
  clearToasts,
  setSearchModalOpen,
  setAuthModalOpen,
  setPendingAction,
  clearPendingAction
} = uiSlice.actions;
export default uiSlice.reducer;

