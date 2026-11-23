import React from 'react';
import { Routes, Route } from 'react-router-dom';
import StorefrontLayout from '@/layouts/StorefrontLayout';
import AdminLayout from '@/layouts/AdminLayout';
import HomePage from '@/pages/HomePage';
import ProductListingPage from '@/pages/ProductListingPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import CartPage from '@/pages/CartPage';
import WishlistPage from '@/pages/WishlistPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrderConfirmationPage from '@/pages/OrderConfirmationPage';
import PaymentFailurePage from '@/pages/PaymentFailurePage';
import MyOrdersPage from '@/pages/MyOrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import GuestOrderLookupPage from '@/pages/GuestOrderLookupPage';
import StaticContentPage from '@/pages/StaticContentPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AccountPage from '@/pages/AccountPage';
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage';
import AdminOrdersPage from '@/pages/admin/AdminOrdersPage';
import AdminOrderDetailPage from '@/pages/admin/AdminOrderDetailPage';
import AdminCategoriesPage from '@/pages/admin/AdminCategoriesPage';
import AdminBrandsPage from '@/pages/admin/AdminBrandsPage';
import AdminAttributesPage from '@/pages/admin/AdminAttributesPage';
import AdminProductsPage from '@/pages/admin/AdminProductsPage';
import AdminProductFormPage from '@/pages/admin/AdminProductFormPage';
import AdminInventoryPage from '@/pages/admin/AdminInventoryPage';
import AdminCustomersPage from '@/pages/admin/AdminCustomersPage';
import AdminCustomerDetailPage from '@/pages/admin/AdminCustomerDetailPage';
import AdminCouponsPage from '@/pages/admin/AdminCouponsPage';
import AdminPaymentsPage from '@/pages/admin/AdminPaymentsPage';
import AdminStaffPage from '@/pages/admin/AdminStaffPage';
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage';
import AdminAuditLogsPage from '@/pages/admin/AdminAuditLogsPage';
import AdminCmsDashboardPage from '@/pages/admin/AdminCmsDashboardPage';
import AdminHomepageBuilderPage from '@/pages/admin/AdminHomepageBuilderPage';
import AdminHomepageSectionsPage from '@/pages/admin/AdminHomepageSectionsPage';
import AdminHomepageSettingsPage from '@/pages/admin/AdminHomepageSettingsPage';
import AdminBannersPage from '@/pages/admin/AdminBannersPage';
import AdminWhatsNewPage from '@/pages/admin/AdminWhatsNewPage';
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage';
import AdminTemplatesPage from '@/pages/admin/AdminTemplatesPage';
import AdminMediaLibraryPage from '@/pages/admin/AdminMediaLibraryPage';
import AdminReviewsPage from '@/pages/admin/AdminReviewsPage';
import ContentPage from '@/pages/ContentPage';
import FaqPage from '@/pages/FaqPage';
import CategoryPage from '@/pages/CategoryPage';
import WhatsNewPage from '@/pages/WhatsNewPage';
import MosmacSelectPage from '@/pages/MosmacSelectPage';
import OffersDealsPage from '@/pages/OffersDealsPage';
import AdminOffersDealsPage from '@/pages/admin/AdminOffersDealsPage';
import BrandsPage from '@/pages/BrandsPage';
import LoginPage from '@/features/auth/LoginPage';
import RegisterPage from '@/features/auth/RegisterPage';
import ForgotPasswordPage from '@/features/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/features/auth/ResetPasswordPage';
import AdminLoginPage from '@/pages/admin/AdminLoginPage';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';

export function AppRoutes() {
  return (
    <Routes>
      {/* Customer Storefront Routes */}
      <Route element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/products" element={<ProductListingPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/brand/:brandSlug" element={<ProductListingPage />} />
        <Route path="/category/:categorySlug" element={<CategoryPage />} />
        <Route path="/whats-new" element={<WhatsNewPage />} />
        <Route path="/mosmac-select" element={<MosmacSelectPage />} />
        <Route path="/offers" element={<OffersDealsPage />} />
        <Route path="/offers-and-deals" element={<OffersDealsPage />} />
        <Route path="/search" element={<ProductListingPage />} />
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderNumber" element={<OrderConfirmationPage />} />
        <Route path="/payment-failure" element={<PaymentFailurePage />} />
        <Route path="/track-order" element={<GuestOrderLookupPage />} />

        {/* Informational Policy Pages */}
        <Route path="/pages/:slug" element={<ContentPage />} />
        <Route path="/faqs" element={<FaqPage />} />
        <Route path="/about" element={<StaticContentPage type="about" />} />
        <Route path="/shipping-policy" element={<StaticContentPage type="shipping" />} />
        <Route path="/return-policy" element={<StaticContentPage type="returns" />} />
        <Route path="/contact" element={<StaticContentPage type="contact" />} />
        <Route path="/privacy-policy" element={<StaticContentPage type="privacy" />} />
        <Route path="/terms" element={<StaticContentPage type="terms" />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Customer Protected Account Routes */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders"
          element={
            <ProtectedRoute>
              <AccountPage defaultTab="orders" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account/orders/:orderNumber"
          element={
            <ProtectedRoute>
              <OrderDetailPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Administrative Login Route */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* Admin Operations Portal Routes (Protected by AdminRoute RBAC) */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="orders/:id" element={<AdminOrderDetailPage />} />
        <Route path="products" element={<AdminProductsPage />} />
        <Route path="products/new" element={<AdminProductFormPage />} />
        <Route path="products/edit/:id" element={<AdminProductFormPage />} />
        <Route path="inventory" element={<AdminInventoryPage />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="brands" element={<AdminBrandsPage />} />
        <Route path="attributes" element={<AdminAttributesPage />} />
        <Route path="customers" element={<AdminCustomersPage />} />
        <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
        <Route path="coupons" element={<AdminCouponsPage />} />
        <Route path="offers-deals" element={<AdminOffersDealsPage />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="staff" element={<AdminStaffPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        {/* Homepage Section & Product Management */}
        <Route path="homepage-sections" element={<AdminHomepageSectionsPage />} />
        <Route path="homepage-sections/settings" element={<AdminHomepageSettingsPage />} />
        {/* CMS & Storefront Operations */}
        <Route path="banners" element={<AdminBannersPage />} />
        <Route path="cms" element={<AdminCmsDashboardPage />} />
        <Route path="cms/homepage" element={<AdminHomepageBuilderPage />} />
        <Route path="cms/whats-new" element={<AdminWhatsNewPage />} />
        <Route path="cms/banners" element={<AdminBannersPage />} />
        <Route path="cms/settings" element={<AdminSettingsPage />} />
        <Route path="cms/templates" element={<AdminTemplatesPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="reviews" element={<AdminReviewsPage />} />
        <Route path="media" element={<AdminMediaLibraryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
