import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer, { addToast, removeToast, clearToasts } from '@/store/slices/uiSlice';
import ToastContainer from '@/components/common/ToastContainer';

const createMockStore = (preloadedState = {}) => {
  return configureStore({
    reducer: {
      ui: uiReducer
    },
    preloadedState
  });
};

describe('ToastContainer & uiSlice Toast Management', () => {
  it('does not render when there are no toasts', () => {
    const store = createMockStore({ ui: { toasts: [] } });
    const { container } = render(
      <Provider store={store}>
        <ToastContainer />
      </Provider>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a toast notification with the correct message and type', () => {
    const store = createMockStore({
      ui: {
        toasts: [
          {
            id: 'toast-1',
            type: 'error',
            message: 'Too many checkout attempts. Please wait a few minutes before trying again.',
            duration: 4000
          }
        ]
      }
    });

    render(
      <Provider store={store}>
        <ToastContainer />
      </Provider>
    );

    expect(screen.getByText('Too many checkout attempts. Please wait a few minutes before trying again.')).toBeInTheDocument();
  });

  it('deduplicates identical toast messages added sequentially', () => {
    const store = createMockStore();

    store.dispatch(addToast({ type: 'error', message: 'Network error occurred' }));
    store.dispatch(addToast({ type: 'error', message: 'Network error occurred' }));
    store.dispatch(addToast({ type: 'error', message: 'Network error occurred' }));

    const toasts = store.getState().ui.toasts;
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Network error occurred');
  });

  it('allows dismissing a toast by clicking the close button', () => {
    const store = createMockStore({
      ui: {
        toasts: [
          {
            id: 'toast-1',
            type: 'success',
            message: 'Item added to bag!',
            duration: 4000
          }
        ]
      }
    });

    render(
      <Provider store={store}>
        <ToastContainer />
      </Provider>
    );

    const closeBtn = screen.getByRole('button', { name: /Dismiss notification/i });
    fireEvent.click(closeBtn);

    expect(store.getState().ui.toasts).toHaveLength(0);
  });

  it('auto-dismisses a toast after its specified duration', () => {
    vi.useFakeTimers();
    const store = createMockStore({
      ui: {
        toasts: [
          {
            id: 'toast-auto',
            type: 'info',
            message: 'Auto-dismissing message',
            duration: 2000
          }
        ]
      }
    });

    render(
      <Provider store={store}>
        <ToastContainer />
      </Provider>
    );

    expect(store.getState().ui.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(store.getState().ui.toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});
