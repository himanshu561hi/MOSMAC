import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderService } from '@/services/orderService';

const initialState = {
  // Customer state
  orders: [],
  total: 0,
  page: 1,
  totalPages: 1,
  loading: false,
  error: null,
  currentOrder: null,
  loadingDetail: false,
  detailError: null,
  cancellingOrder: false,
  cancelError: null,

  // Guest lookup state
  guestOrder: null,
  guestLoading: false,
  guestError: null,

  // Admin state
  adminOrders: [],
  adminTotal: 0,
  adminPage: 1,
  adminTotalPages: 1,
  adminLoading: false,
  adminError: null,
  adminCurrentOrder: null,
  adminUpdatingStatus: false,
  adminProcessingRefund: false
};

export const fetchCustomerOrders = createAsyncThunk(
  'orders/fetchCustomerOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await orderService.getCustomerOrders(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load orders');
    }
  }
);

export const fetchOrderDetail = createAsyncThunk(
  'orders/fetchOrderDetail',
  async (orderNumber, { rejectWithValue }) => {
    try {
      const data = await orderService.getOrderByNumber(orderNumber);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load order details');
    }
  }
);

export const cancelCustomerOrder = createAsyncThunk(
  'orders/cancelCustomerOrder',
  async ({ orderNumber, reason }, { rejectWithValue }) => {
    try {
      const data = await orderService.cancelOrder(orderNumber, reason);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to cancel order');
    }
  }
);

export const lookupGuestOrder = createAsyncThunk(
  'orders/lookupGuestOrder',
  async ({ orderNumber, email, phone }, { rejectWithValue }) => {
    try {
      const data = await orderService.guestLookup({ orderNumber, email, phone });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'No order found with provided details');
    }
  }
);

export const fetchAdminOrders = createAsyncThunk(
  'orders/fetchAdminOrders',
  async (params = {}, { rejectWithValue }) => {
    try {
      const data = await orderService.adminListOrders(params);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load admin orders');
    }
  }
);

export const fetchAdminOrderDetail = createAsyncThunk(
  'orders/fetchAdminOrderDetail',
  async (id, { rejectWithValue }) => {
    try {
      const data = await orderService.adminGetOrder(id);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load order details');
    }
  }
);

export const updateAdminOrderStatus = createAsyncThunk(
  'orders/updateAdminOrderStatus',
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      const data = await orderService.adminUpdateStatus(id, payload);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to update order status');
    }
  }
);

export const processAdminRefund = createAsyncThunk(
  'orders/processAdminRefund',
  async ({ id, amount, reason }, { rejectWithValue }) => {
    try {
      const data = await orderService.adminProcessRefund(id, { amount, reason });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to process refund');
    }
  }
);

export const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearGuestLookup: (state) => {
      state.guestOrder = null;
      state.guestError = null;
      state.guestLoading = false;
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
      state.detailError = null;
    }
  },
  extraReducers: (builder) => {
    // Customer orders list
    builder
      .addCase(fetchCustomerOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders || [];
        state.total = action.payload.pagination?.total || 0;
        state.page = action.payload.pagination?.page || 1;
        state.totalPages = action.payload.pagination?.pages || 1;
      })
      .addCase(fetchCustomerOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Single order detail
    builder
      .addCase(fetchOrderDetail.pending, (state) => {
        state.loadingDetail = true;
        state.detailError = null;
      })
      .addCase(fetchOrderDetail.fulfilled, (state, action) => {
        state.loadingDetail = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderDetail.rejected, (state, action) => {
        state.loadingDetail = false;
        state.detailError = action.payload;
      });

    // Cancel customer order
    builder
      .addCase(cancelCustomerOrder.pending, (state) => {
        state.cancellingOrder = true;
        state.cancelError = null;
      })
      .addCase(cancelCustomerOrder.fulfilled, (state, action) => {
        state.cancellingOrder = false;
        state.currentOrder = action.payload;
        // Also update in list if present
        const idx = state.orders.findIndex((o) => o._id === action.payload._id);
        if (idx !== -1) {
          state.orders[idx] = action.payload;
        }
      })
      .addCase(cancelCustomerOrder.rejected, (state, action) => {
        state.cancellingOrder = false;
        state.cancelError = action.payload;
      });

    // Guest lookup
    builder
      .addCase(lookupGuestOrder.pending, (state) => {
        state.guestLoading = true;
        state.guestError = null;
        state.guestOrder = null;
      })
      .addCase(lookupGuestOrder.fulfilled, (state, action) => {
        state.guestLoading = false;
        state.guestOrder = action.payload;
      })
      .addCase(lookupGuestOrder.rejected, (state, action) => {
        state.guestLoading = false;
        state.guestError = action.payload;
      });

    // Admin list
    builder
      .addCase(fetchAdminOrders.pending, (state) => {
        state.adminLoading = true;
        state.adminError = null;
      })
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.adminLoading = false;
        state.adminOrders = action.payload.orders || [];
        state.adminTotal = action.payload.pagination?.total || 0;
        state.adminPage = action.payload.pagination?.page || 1;
        state.adminTotalPages = action.payload.pagination?.pages || 1;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload;
      });

    // Admin get order
    builder
      .addCase(fetchAdminOrderDetail.pending, (state) => {
        state.adminLoading = true;
      })
      .addCase(fetchAdminOrderDetail.fulfilled, (state, action) => {
        state.adminLoading = false;
        state.adminCurrentOrder = action.payload;
      })
      .addCase(fetchAdminOrderDetail.rejected, (state, action) => {
        state.adminLoading = false;
        state.adminError = action.payload;
      });

    // Admin update status
    builder
      .addCase(updateAdminOrderStatus.pending, (state) => {
        state.adminUpdatingStatus = true;
      })
      .addCase(updateAdminOrderStatus.fulfilled, (state, action) => {
        state.adminUpdatingStatus = false;
        state.adminCurrentOrder = action.payload;
        const idx = state.adminOrders.findIndex((o) => o._id === action.payload._id);
        if (idx !== -1) {
          state.adminOrders[idx] = action.payload;
        }
      })
      .addCase(updateAdminOrderStatus.rejected, (state, action) => {
        state.adminUpdatingStatus = false;
        state.adminError = action.payload;
      });

    // Admin refund
    builder
      .addCase(processAdminRefund.pending, (state) => {
        state.adminProcessingRefund = true;
      })
      .addCase(processAdminRefund.fulfilled, (state, action) => {
        state.adminProcessingRefund = false;
        state.adminCurrentOrder = action.payload.order;
        const idx = state.adminOrders.findIndex((o) => o._id === action.payload.order?._id);
        if (idx !== -1) {
          state.adminOrders[idx] = action.payload.order;
        }
      })
      .addCase(processAdminRefund.rejected, (state, action) => {
        state.adminProcessingRefund = false;
        state.adminError = action.payload;
      });
  }
});

export const { clearGuestLookup, clearCurrentOrder } = orderSlice.actions;

export default orderSlice.reducer;
