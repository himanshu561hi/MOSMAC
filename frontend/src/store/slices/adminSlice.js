import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { adminService } from '@/services/adminService';

export const fetchDashboardOverview = createAsyncThunk(
  'admin/fetchDashboardOverview',
  async ({ period, startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const data = await adminService.getDashboardOverview({ period, startDate, endDate });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load executive overview');
    }
  }
);

export const fetchReplenishmentAlerts = createAsyncThunk(
  'admin/fetchReplenishmentAlerts',
  async ({ page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const data = await adminService.getReplenishmentAlerts({ page, limit });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load replenishment alerts');
    }
  }
);

const initialState = {
  overview: {
    data: null,
    loading: false,
    error: null,
    period: 'last_30_days',
    startDate: null,
    endDate: null
  },
  replenishment: {
    alerts: [],
    pagination: null,
    loading: false,
    error: null
  }
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setFilterPeriod: (state, action) => {
      state.overview.period = action.payload;
    },
    setCustomDateRange: (state, action) => {
      state.overview.startDate = action.payload.startDate;
      state.overview.endDate = action.payload.endDate;
      state.overview.period = 'custom';
    },
    clearAdminError: (state) => {
      state.overview.error = null;
      state.replenishment.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Dashboard Overview
      .addCase(fetchDashboardOverview.pending, (state) => {
        state.overview.loading = true;
        state.overview.error = null;
      })
      .addCase(fetchDashboardOverview.fulfilled, (state, action) => {
        state.overview.loading = false;
        state.overview.data = action.payload;
      })
      .addCase(fetchDashboardOverview.rejected, (state, action) => {
        state.overview.loading = false;
        state.overview.error = action.payload;
      })
      // Replenishment Alerts
      .addCase(fetchReplenishmentAlerts.pending, (state) => {
        state.replenishment.loading = true;
        state.replenishment.error = null;
      })
      .addCase(fetchReplenishmentAlerts.fulfilled, (state, action) => {
        state.replenishment.loading = false;
        state.replenishment.alerts = action.payload.alerts || [];
        state.replenishment.pagination = action.payload.pagination || null;
      })
      .addCase(fetchReplenishmentAlerts.rejected, (state, action) => {
        state.replenishment.loading = false;
        state.replenishment.error = action.payload;
      });
  }
});

export const { setFilterPeriod, setCustomDateRange, clearAdminError } = adminSlice.actions;
export default adminSlice.reducer;
