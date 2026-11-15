import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Heart, User, Menu, X, ShieldCheck, ChevronDown, LogOut } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleMobileMenu, setMobileMenuOpen } from '@/store/slices/uiSlice';
import { logout } from '@/store/slices/authSlice';
import { fetchCart } from '@/store/slices/cartSlice';
import { fetchWishlist } from '@/store/slices/wishlistSlice';
import { storefrontService } from '@/services/storefrontService';
import SearchBar from '@/components/layout/SearchBar';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export function StorefrontLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { mobileMenuOpen } = useSelector((state) => state.ui);
  const cartCount = useSelector((state) => state.cart?.itemCount || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.itemCount || 0);

  const [categories, setCategories] = useState([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  // Initial cart & wishlist load
  useEffect(() => {
    dispatch(fetchCart());
    dispatch(fetchWishlist());
  }, [dispatch]);

  // Close mobile drawer and account menu on route change
  useEffect(() => {
    dispatch(setMobileMenuOpen(false));
    setAccountMenuOpen(false);
  }, [location.pathname, dispatch]);

  // Load root active categories for the top navigation bar
  useEffect(() => {
    async function loadNavCategories() {
      try {
        const cats = await storefrontService.getCategories(true);
        setCategories(cats.slice(0, 7));
      } catch (err) {
        console.error('Failed to load navigation categories:', err);
      }
    }
    loadNavCategories();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Top Banner */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        Pan-India Express Delivery | Free Shipping on orders above ₹999 | 100% Genuine Certified Brands
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200/80 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => dispatch(toggleMobileMenu())}
              className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/" className="flex items-center gap-1.5">
              <span className="font-extrabold text-2xl tracking-tight text-gray-900 font-sans">
                AURORA<span className="text-emerald-600">.</span>
              </span>
            </Link>
          </div>

          {/* Interactive Search Bar with Live Suggestions */}
          <div className="hidden md:flex flex-1 max-w-lg mx-4">
            <SearchBar className="w-full" />
          </div>

          {/* Right Action Icons & Account Entry */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isAuthenticated && user?.role !== 'customer' && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            )}

            {/* Wishlist Link */}
            <Link
              to="/wishlist"
              className="p-2 text-gray-600 hover:text-emerald-600 relative transition-colors rounded-full hover:bg-gray-50"
              aria-label="Wishlist"
              title="Saved Items"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Link with Badge */}
            <Link
              to="/cart"
              className="p-2 text-gray-600 hover:text-emerald-600 relative transition-colors rounded-full hover:bg-gray-50"
              aria-label="Cart"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Account Entry / Dropdown */}
            <div className="relative">
              {isAuthenticated ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="flex items-center gap-1.5 p-1.5 sm:px-3 text-xs font-semibold text-gray-800 hover:text-emerald-600 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {user?.firstName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:inline">{user?.firstName || 'Account'}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 space-y-1 z-50 text-xs animate-in fade-in duration-100">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-bold text-gray-900 truncate">{user?.firstName} {user?.lastName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        My Account
                      </Link>

                      {user?.role !== 'customer' && (
                        <Link
                          to="/admin"
                          onClick={() => setAccountMenuOpen(false)}
                          className="block px-3 py-2 rounded-lg text-amber-800 hover:bg-amber-50 font-medium"
                        >
                          Operations Portal
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          dispatch(logout());
                          navigate('/');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 font-medium flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Secondary Category Navigation Bar */}
        <div className="hidden md:block border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center gap-6 text-xs font-semibold text-gray-700 overflow-x-auto">
            <Link
              to="/products"
              className="text-emerald-700 hover:text-emerald-900 whitespace-nowrap font-bold"
            >
              All Products
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat._id}
                to={`/products?category=${cat.slug}`}
                className="hover:text-emerald-600 transition-colors whitespace-nowrap"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              to="/products?featured=true"
              className="text-amber-600 hover:text-amber-700 whitespace-nowrap"
            >
              Featured Deals
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-4">
            <SearchBar
              onSearchSubmitted={() => dispatch(setMobileMenuOpen(false))}
              className="w-full"
            />

            <nav className="flex flex-col space-y-1 text-sm font-medium text-gray-800">
              <Link
                to="/"
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                Home
              </Link>
              <Link
                to="/products"
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="px-3 py-2 rounded-lg hover:bg-gray-50 font-bold text-emerald-700"
              >
                All Products
              </Link>

              {categories.map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${cat.slug}`}
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  {cat.name}
                </Link>
              ))}

              <div className="pt-2 border-t border-gray-100 space-y-1">
                <Link
                  to="/cart"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between text-gray-800 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-emerald-600" /> Shopping Bag
                  </span>
                  {cartCount > 0 && (
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-full font-bold">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  to="/wishlist"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="px-3 py-2 rounded-lg hover:bg-gray-50 flex items-center justify-between text-gray-800 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" /> Wishlist
                  </span>
                  {wishlistCount > 0 && (
                    <span className="bg-rose-100 text-rose-700 text-xs px-2 py-0.5 rounded-full font-bold">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-1">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/account"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className="px-3 py-2 rounded-lg hover:bg-gray-50 block"
                    >
                      My Account ({user?.firstName})
                    </Link>
                    {user?.role !== 'customer' && (
                      <Link
                        to="/admin"
                        onClick={() => dispatch(setMobileMenuOpen(false))}
                        className="px-3 py-2 rounded-lg hover:bg-amber-50 text-amber-800 block"
                      >
                        Operations Portal
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        dispatch(setMobileMenuOpen(false));
                        dispatch(logout());
                        navigate('/');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => dispatch(setMobileMenuOpen(false))}
                    className="px-3 py-2 rounded-lg hover:bg-gray-50 text-emerald-700 font-bold block"
                  >
                    Sign In / Register
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <ErrorBoundary variant="global">
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 text-gray-400 text-xs border-t border-slate-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="space-y-3">
            <span className="font-extrabold text-2xl text-white tracking-tight">
              AURORA<span className="text-emerald-500">.</span>
            </span>
            <p className="text-gray-400 text-xs leading-relaxed">
              Curated single-vendor multi-category e-commerce platform delivering certified genuine products across 25,000+ Indian PIN codes.
            </p>
            <div className="text-[11px] text-gray-500 pt-1">
              Currency: <strong>INR (₹)</strong> | All prices statutory GST inclusive
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Categories</h4>
            <ul className="space-y-2">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat._id}>
                  <Link to={`/products?category=${cat.slug}`} className="hover:text-emerald-400 transition-colors">
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/products" className="text-emerald-500 hover:underline font-semibold">
                  View All Catalogue &rarr;
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Customer Service</h4>
            <ul className="space-y-2">
              <li><Link to="/faqs" className="hover:text-white transition-colors">Frequently Asked Questions (FAQs)</Link></li>
              <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Delivery Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Returns & Refunds (7-Day)</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Customer Help & Support</Link></li>
              <li><Link to="/account" className="hover:text-white transition-colors">My Customer Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Security & Trust</h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Certified Razorpay payment integration supporting UPI, NetBanking, and credit/debit cards. Encrypted via 256-bit SSL.
            </p>
            <ul className="space-y-1 text-[11px]">
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Our Platform</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} E-Commerce Platform. Built for high performance, security, and verified Indian consumer fulfillment.
        </div>
      </footer>
    </div>
  );
}

export default StorefrontLayout;
