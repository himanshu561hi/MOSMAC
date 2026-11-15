import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { shoppingService } from '@/services/shoppingService';

const initialState = {
  items: [],
  itemCount: 0,
  distinctItemCount: 0,
  subtotal: 0,
  discountAmount: 0,
  shippingFee: 0,
  grandTotal: 0,
  freeShippingThreshold: 99900, // ₹999.00 in paise
  freeShippingEligible: false,
  amountNeededForFreeShipping: 99900,
  appliedCoupon: null,
  warnings: [],
  isLoading: false,
  isMutating: false,
  error: null,
  lastActionSuccess: null
};

export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const data = await shoppingService.getCart();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load shopping cart');
    }
  }
);

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, sku, quantity = 1 }, { rejectWithValue }) => {
    try {
      const data = await shoppingService.addToCart({ productId, sku, quantity });
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to add item to bag');
    }
  }
);

export const updateCartQuantity = createAsyncThunk(
  'cart/updateQuantity',
  async ({ sku, quantity }, { rejectWithValue }) => {
    try {
      const data = await shoppingService.updateQuantity(sku, quantity);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update item quantity');
    }
  }
);

export const removeCartItem = createAsyncThunk(
  'cart/removeItem',
  async (sku, { rejectWithValue }) => {
    try {
      const data = await shoppingService.removeItem(sku);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to remove item from bag');
    }
  }
);

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const data = await shoppingService.clearCart();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to clear cart');
    }
  }
);

export const applyCoupon = createAsyncThunk(
  'cart/applyCoupon',
  async (code, { rejectWithValue }) => {
    try {
      const data = await shoppingService.applyCoupon(code);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to apply promo code');
    }
  }
);

export const removeCoupon = createAsyncThunk(
  'cart/removeCoupon',
  async (_, { rejectWithValue }) => {
    try {
      const data = await shoppingService.removeCoupon();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to remove promo code');
    }
  }
);

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',
  async (guestId, { rejectWithValue }) => {
    try {
      const data = await shoppingService.mergeCart(guestId);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to merge cart items');
    }
  }
);

const applyCartPayload = (state, payload) => {
  if (!payload) return;
  state.items = payload.items || [];
  state.itemCount = payload.itemCount || 0;
  state.distinctItemCount = payload.distinctItemCount || (payload.items ? payload.items.length : 0);
  state.subtotal = payload.subtotal || 0;
  state.discountAmount = payload.discountAmount || 0;
  state.shippingFee = payload.shippingFee || 0;
  state.grandTotal = payload.grandTotal || 0;
  state.freeShippingThreshold = payload.freeShippingThreshold || 99900;
  state.freeShippingEligible = payload.freeShippingEligible || false;
  state.amountNeededForFreeShipping = Math.max(0, (payload.freeShippingThreshold || 99900) - (payload.subtotal || 0));
  state.appliedCoupon = payload.appliedCoupon || null;
  state.warnings = payload.warnings || [];
  state.error = null;
};

export const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    clearWarnings: (state) => {
      state.warnings = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    resetLastAction: (state) => {
      state.lastActionSuccess = null;
    },
    resetCart: () => initialState
  },
  extraReducers: (builder) => {
    // fetchCart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false;
        applyCartPayload(state, action.payload);
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // addToCart
    builder
      .addCase(addToCart.pending, (state) => {
        state.isMutating = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
        state.lastActionSuccess = 'Item added to shopping bag';
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // updateCartQuantity
    builder
      .addCase(updateCartQuantity.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(updateCartQuantity.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
      })
      .addCase(updateCartQuantity.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // removeCartItem
    builder
      .addCase(removeCartItem.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(removeCartItem.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
        state.lastActionSuccess = 'Item removed from bag';
      })
      .addCase(removeCartItem.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // clearCart
    builder
      .addCase(clearCart.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // applyCoupon
    builder
      .addCase(applyCoupon.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(applyCoupon.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
        state.lastActionSuccess = 'Promo code applied successfully';
      })
      .addCase(applyCoupon.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // removeCoupon
    builder
      .addCase(removeCoupon.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(removeCoupon.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
        state.lastActionSuccess = 'Promo code removed';
      })
      .addCase(removeCoupon.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // mergeGuestCart
    builder
      .addCase(mergeGuestCart.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.isMutating = false;
        applyCartPayload(state, action.payload);
      })
      .addCase(mergeGuestCart.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });
  }
});

export const { clearWarnings, clearError, resetLastAction, resetCart } = cartSlice.actions;
export default cartSlice.reducer;
