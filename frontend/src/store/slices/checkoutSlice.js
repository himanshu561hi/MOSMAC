import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addressService } from '@/services/addressService';
import { checkoutService } from '@/services/checkoutService';

const initialState = {
  quote: null,
  loadingQuote: false,
  quoteError: null,
  addresses: [],
  loadingAddresses: false,
  addressError: null,
  selectedShippingAddress: null,
  selectedBillingAddress: null,
  useSameForBilling: true,
  paymentMethod: 'razorpay',
  codEligibility: {
    eligible: null,
    reason: null,
    minAmount: null,
    maxAmount: null,
    checking: false
  },
  isPlacingOrder: false,
  placeOrderError: null,
  currentOrder: null,
  paymentProcessing: false,
  paymentError: null,
  paymentVerified: false
};

export const fetchAddresses = createAsyncThunk(
  'checkout/fetchAddresses',
  async (_, { rejectWithValue }) => {
    try {
      const data = await addressService.getAddresses();
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to load addresses');
    }
  }
);

export const saveAddress = createAsyncThunk(
  'checkout/saveAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const data = await addressService.createAddress(addressData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to save address');
    }
  }
);

export const fetchCheckoutQuote = createAsyncThunk(
  'checkout/fetchQuote',
  async ({ items, couponCode, postalCode } = {}, { rejectWithValue }) => {
    try {
      const data = await checkoutService.getQuote({ items, couponCode, postalCode });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to calculate checkout quote');
    }
  }
);

export const checkCodEligibility = createAsyncThunk(
  'checkout/checkCod',
  async ({ postalCode, amount }, { rejectWithValue }) => {
    try {
      const data = await checkoutService.checkCodEligibility(postalCode, amount);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to verify COD availability');
    }
  }
);

export const placeOrder = createAsyncThunk(
  'checkout/placeOrder',
  async ({ orderData, idempotencyKey }, { rejectWithValue }) => {
    try {
      const data = await checkoutService.createOrder(orderData, idempotencyKey);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to place order');
    }
  }
);

export const verifyPayment = createAsyncThunk(
  'checkout/verifyPayment',
  async (verificationData, { rejectWithValue }) => {
    try {
      const data = await checkoutService.verifyPayment(verificationData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Payment verification failed');
    }
  }
);

export const recordPaymentFailure = createAsyncThunk(
  'checkout/recordFailure',
  async (failureData, { rejectWithValue }) => {
    try {
      const data = await checkoutService.recordPaymentFailure(failureData);
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || 'Failed to record payment failure');
    }
  }
);

export const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setSelectedShippingAddress: (state, action) => {
      state.selectedShippingAddress = action.payload;
    },
    setSelectedBillingAddress: (state, action) => {
      state.selectedBillingAddress = action.payload;
    },
    setUseSameForBilling: (state, action) => {
      state.useSameForBilling = action.payload;
      if (action.payload) {
        state.selectedBillingAddress = state.selectedShippingAddress;
      }
    },
    setPaymentMethod: (state, action) => {
      state.paymentMethod = action.payload;
    },
    resetCheckout: (state) => {
      state.quote = null;
      state.isPlacingOrder = false;
      state.placeOrderError = null;
      state.currentOrder = null;
      state.paymentProcessing = false;
      state.paymentError = null;
      state.paymentVerified = false;
    }
  },
  extraReducers: (builder) => {
    // Address fetching
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loadingAddresses = true;
        state.addressError = null;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loadingAddresses = false;
        state.addresses = action.payload || [];
        // Auto-select default shipping address if not already selected
        if (!state.selectedShippingAddress && action.payload && action.payload.length > 0) {
          const defaultShip = action.payload.find((a) => a.isDefaultShipping) || action.payload[0];
          state.selectedShippingAddress = defaultShip;
          if (state.useSameForBilling) {
            state.selectedBillingAddress = defaultShip;
          }
        }
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loadingAddresses = false;
        state.addressError = action.payload;
      });

    // Save address
    builder
      .addCase(saveAddress.fulfilled, (state, action) => {
        state.addresses.push(action.payload);
        state.selectedShippingAddress = action.payload;
        if (state.useSameForBilling) {
          state.selectedBillingAddress = action.payload;
        }
      });

    // Quote calculation
    builder
      .addCase(fetchCheckoutQuote.pending, (state) => {
        state.loadingQuote = true;
        state.quoteError = null;
      })
      .addCase(fetchCheckoutQuote.fulfilled, (state, action) => {
        state.loadingQuote = false;
        state.quote = action.payload;
      })
      .addCase(fetchCheckoutQuote.rejected, (state, action) => {
        state.loadingQuote = false;
        state.quoteError = action.payload;
      });

    // COD check
    builder
      .addCase(checkCodEligibility.pending, (state) => {
        state.codEligibility.checking = true;
      })
      .addCase(checkCodEligibility.fulfilled, (state, action) => {
        state.codEligibility = {
          eligible: action.payload.eligible,
          reason: action.payload.reason,
          minAmount: action.payload.minAmount,
          maxAmount: action.payload.maxAmount,
          checking: false
        };
      })
      .addCase(checkCodEligibility.rejected, (state, action) => {
        state.codEligibility = {
          eligible: false,
          reason: action.payload || 'Failed to check COD',
          minAmount: null,
          maxAmount: null,
          checking: false
        };
      });

    // Order placement
    builder
      .addCase(placeOrder.pending, (state) => {
        state.isPlacingOrder = true;
        state.placeOrderError = null;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.isPlacingOrder = false;
        state.currentOrder = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.isPlacingOrder = false;
        state.placeOrderError = action.payload;
      });

    // Payment verification
    builder
      .addCase(verifyPayment.pending, (state) => {
        state.paymentProcessing = true;
        state.paymentError = null;
      })
      .addCase(verifyPayment.fulfilled, (state, action) => {
        state.paymentProcessing = false;
        state.paymentVerified = true;
        if (state.currentOrder) {
          state.currentOrder.paymentStatus = 'captured';
          state.currentOrder.orderStatus = 'confirmed';
        }
      })
      .addCase(verifyPayment.rejected, (state, action) => {
        state.paymentProcessing = false;
        state.paymentError = action.payload;
      });
  }
});

export const {
  setSelectedShippingAddress,
  setSelectedBillingAddress,
  setUseSameForBilling,
  setPaymentMethod,
  resetCheckout
} = checkoutSlice.actions;

export default checkoutSlice.reducer;
