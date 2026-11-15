import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cmsService } from '../../services/cmsService';

export const fetchStoreSettings = createAsyncThunk(
  'cms/fetchStoreSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await cmsService.getStoreSettings();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load store settings');
    }
  }
);

export const fetchHomepageLayout = createAsyncThunk(
  'cms/fetchHomepageLayout',
  async (_, { rejectWithValue }) => {
    try {
      return await cmsService.getHomepageLayout();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load homepage layout');
    }
  }
);

export const fetchPublicBanners = createAsyncThunk(
  'cms/fetchPublicBanners',
  async (type = 'hero', { rejectWithValue }) => {
    try {
      return await cmsService.getPublicBanners(type);
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load banners');
    }
  }
);

export const fetchFaqs = createAsyncThunk(
  'cms/fetchFaqs',
  async (_, { rejectWithValue }) => {
    try {
      return await cmsService.getFaqs();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load FAQs');
    }
  }
);

const initialState = {
  settings: null,
  homepageSections: [],
  banners: [],
  faqs: {
    grouped: {},
    total: 0
  },
  loading: {
    settings: false,
    homepage: false,
    banners: false,
    faqs: false
  },
  error: null
};

export const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    clearCmsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Store Settings
      .addCase(fetchStoreSettings.pending, (state) => {
        state.loading.settings = true;
      })
      .addCase(fetchStoreSettings.fulfilled, (state, action) => {
        state.loading.settings = false;
        state.settings = action.payload;
      })
      .addCase(fetchStoreSettings.rejected, (state, action) => {
        state.loading.settings = false;
        state.error = action.payload;
      })
      // Homepage Layout
      .addCase(fetchHomepageLayout.pending, (state) => {
        state.loading.homepage = true;
      })
      .addCase(fetchHomepageLayout.fulfilled, (state, action) => {
        state.loading.homepage = false;
        state.homepageSections = action.payload;
      })
      .addCase(fetchHomepageLayout.rejected, (state, action) => {
        state.loading.homepage = false;
        state.error = action.payload;
      })
      // Banners
      .addCase(fetchPublicBanners.pending, (state) => {
        state.loading.banners = true;
      })
      .addCase(fetchPublicBanners.fulfilled, (state, action) => {
        state.loading.banners = false;
        state.banners = action.payload;
      })
      .addCase(fetchPublicBanners.rejected, (state, action) => {
        state.loading.banners = false;
        state.error = action.payload;
      })
      // FAQs
      .addCase(fetchFaqs.pending, (state) => {
        state.loading.faqs = true;
      })
      .addCase(fetchFaqs.fulfilled, (state, action) => {
        state.loading.faqs = false;
        state.faqs = action.payload;
      })
      .addCase(fetchFaqs.rejected, (state, action) => {
        state.loading.faqs = false;
        state.error = action.payload;
      });
  }
});

export const { clearCmsError } = cmsSlice.actions;
export default cmsSlice.reducer;
