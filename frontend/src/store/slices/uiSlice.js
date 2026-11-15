import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  mobileMenuOpen: false,
  toasts: [],
  activeSearchModal: false
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
    addToast: (state, action) => {
      state.toasts.push({
        id: Date.now() + Math.random().toString(),
        type: action.payload.type || 'info', // info, success, warning, error
        message: action.payload.message,
        duration: action.payload.duration || 4000
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setSearchModalOpen: (state, action) => {
      state.activeSearchModal = action.payload;
    }
  }
});

export const { toggleMobileMenu, setMobileMenuOpen, addToast, removeToast, setSearchModalOpen } = uiSlice.actions;
export default uiSlice.reducer;

