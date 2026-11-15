import { createSlice } from '@reduxjs/toolkit';
import { setAccessToken } from '@/services/apiClient';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      if (accessToken) {
        setAccessToken(accessToken);
      }
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      setAccessToken(null);
    },
    setAuthLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setAuthError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    }
  }
});

export const { setCredentials, logout, setAuthLoading, setAuthError } = authSlice.actions;
export default authSlice.reducer;

