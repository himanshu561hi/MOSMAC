import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { shoppingService } from '@/services/shoppingService';
import { fetchCart } from './cartSlice';

const initialState = {
  items: [],
  itemCount: 0,
  isLoading: false,
  isMutating: false,
  error: null,
  lastActionSuccess: null
};

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const data = await shoppingService.getWishlist();
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load wishlist');
    }
  }
);

export const addToWishlist = createAsyncThunk(
  'wishlist/addToWishlist',
  async ({ productId, sku = '' }, { rejectWithValue }) => {
    try {
      const data = await shoppingService.addToWishlist(productId, sku);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to add item to wishlist');
    }
  }
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/removeFromWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const data = await shoppingService.removeFromWishlist(productId);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to remove item from wishlist');
    }
  }
);

export const moveWishlistItemToCart = createAsyncThunk(
  'wishlist/moveWishlistItemToCart',
  async ({ productId, sku = '', quantity = 1 }, { dispatch, rejectWithValue }) => {
    try {
      const data = await shoppingService.moveWishlistItemToCart(productId, sku, quantity);
      // Also update the cart state with the populated cart returned
      if (data.cart) {
        dispatch(fetchCart());
      }
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to move item to shopping bag');
    }
  }
);

export const mergeGuestWishlist = createAsyncThunk(
  'wishlist/mergeGuestWishlist',
  async (guestId, { rejectWithValue }) => {
    try {
      const data = await shoppingService.mergeWishlist(guestId);
      return data;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to merge wishlist');
    }
  }
);

const applyWishlistPayload = (state, payload) => {
  if (!payload) return;
  state.items = payload.items || [];
  state.itemCount = payload.itemCount ?? (payload.items ? payload.items.length : 0);
  state.error = null;
};

export const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    clearWishlistError: (state) => {
      state.error = null;
    },
    resetWishlistLastAction: (state) => {
      state.lastActionSuccess = null;
    },
    resetWishlist: () => initialState
  },
  extraReducers: (builder) => {
    // fetchWishlist
    builder
      .addCase(fetchWishlist.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.isLoading = false;
        applyWishlistPayload(state, action.payload);
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // addToWishlist
    builder
      .addCase(addToWishlist.pending, (state) => {
        state.isMutating = true;
        state.error = null;
        state.lastActionSuccess = null;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.isMutating = false;
        applyWishlistPayload(state, action.payload);
        state.lastActionSuccess = 'Saved to Wishlist';
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // removeFromWishlist
    builder
      .addCase(removeFromWishlist.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.isMutating = false;
        applyWishlistPayload(state, action.payload);
        state.lastActionSuccess = 'Removed from Wishlist';
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // moveWishlistItemToCart
    builder
      .addCase(moveWishlistItemToCart.pending, (state) => {
        state.isMutating = true;
        state.error = null;
      })
      .addCase(moveWishlistItemToCart.fulfilled, (state, action) => {
        state.isMutating = false;
        applyWishlistPayload(state, action.payload.wishlist);
        state.lastActionSuccess = 'Item moved to Shopping Bag';
      })
      .addCase(moveWishlistItemToCart.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });

    // mergeGuestWishlist
    builder
      .addCase(mergeGuestWishlist.pending, (state) => {
        state.isMutating = true;
      })
      .addCase(mergeGuestWishlist.fulfilled, (state, action) => {
        state.isMutating = false;
        applyWishlistPayload(state, action.payload);
      })
      .addCase(mergeGuestWishlist.rejected, (state, action) => {
        state.isMutating = false;
        state.error = action.payload;
      });
  }
});

export const { clearWishlistError, resetWishlistLastAction, resetWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
