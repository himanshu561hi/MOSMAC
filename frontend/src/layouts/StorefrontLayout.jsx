import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  ShieldCheck,
  ChevronDown,
  LogOut,
  MapPin
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { toggleMobileMenu, setMobileMenuOpen, setPincodeModalOpen } from '@/store/slices/uiSlice';
import { logout } from '@/store/slices/authSlice';
import { fetchCart } from '@/store/slices/cartSlice';
import { fetchWishlist } from '@/store/slices/wishlistSlice';
import { storefrontService } from '@/services/storefrontService';
import SearchBar from '@/components/layout/SearchBar';
import MegaMenu from '@/components/layout/MegaMenu';
import BrandsMegaMenu from '@/components/layout/BrandsMegaMenu';
import DeliveryPincodeModal from '@/components/layout/DeliveryPincodeModal';
import AuthModal from '@/components/auth/AuthModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import TrustPillarsBanner from '@/components/common/TrustPillarsBanner';

const DEFAULT_NAV_CATEGORIES = [
  {
    _id: '6b012f6a83b32798a375b896',
    name: 'Makeup',
    slug: 'makeup',
    isActive: true,
    children: [
      {
        _id: '6b012f8b83b32798a375b8a4',
        name: 'Face',
        slug: 'face-makeup',
        children: [
          { _id: 'foundation', name: 'Foundation & BB Cream', slug: 'foundation-bb-cream' },
          { _id: 'primer', name: 'Primer & Makeup Fixer', slug: 'primer-makeup-fixer' },
          { _id: 'concealer', name: 'Concealer & Contour', slug: 'concealer-contour' },
          { _id: 'powder', name: 'Face Powder', slug: 'face-powder' },
          { _id: 'blush', name: 'Blush & Highlighter', slug: 'blush-highlighter' }
        ]
      },
      {
        _id: '6b012f8b83b32798a375b8a6',
        name: 'Eyes',
        slug: 'eye-makeup',
        children: [
          { _id: 'eyeshadow', name: 'Eyeshadow Palettes', slug: 'eyeshadow-palettes' },
          { _id: 'eyeliner', name: 'Eyeliner & Kajal', slug: 'eyeliner-kajal' },
          { _id: 'mascara', name: 'Mascara', slug: 'mascara' },
          { _id: 'lashes', name: 'False Eyelashes & Lash Glue', slug: 'eyelashes-lash-glue' }
        ]
      },
      {
        _id: '6b012f8b83b32798a375b8a8',
        name: 'Lips',
        slug: 'lip-makeup',
        children: [
          { _id: 'lipstick', name: 'Lipstick & Lip Crayon', slug: 'lipstick-lip-crayon' },
          { _id: 'liquid-lip', name: 'Liquid Lipstick', slug: 'liquid-lipstick' },
          { _id: 'lip-balm', name: 'Lip Balm', slug: 'lip-balm' }
        ]
      },
      {
        _id: '6b012f8b83b32798a375b8aa',
        name: 'Tools & Brushes',
        slug: 'makeup-tools-accessories',
        children: [
          { _id: 'brushes', name: 'Makeup Brushes', slug: 'makeup-brushes' },
          { _id: 'sponges', name: 'Sponges & Puffs', slug: 'sponges-puffs' },
          { _id: 'curlers', name: 'Eyelash Curlers', slug: 'eyelash-curlers' }
        ]
      },
      {
        _id: '6b012f8c83b32798a375b8ac',
        name: 'Kits & Sets',
        slug: 'makeup-kits-sets',
        children: [
          { _id: 'kits', name: 'Makeup Kits', slug: 'makeup-kits' }
        ]
      }
    ]
  }
];

export function StorefrontLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { mobileMenuOpen, deliveryPincode } = useSelector((state) => state.ui);
  const cartCount = useSelector((state) => state.cart?.itemCount || 0);
  const wishlistCount = useSelector((state) => state.wishlist?.itemCount || 0);

  const [categories, setCategories] = useState(() => {
    try {
      const cached = sessionStorage.getItem('mosmac_nav_cats');
      if (cached) return JSON.parse(cached);
    } catch (e) { }
    return DEFAULT_NAV_CATEGORIES;
  });
  const [brands, setBrands] = useState([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [brandsMenuOpen, setBrandsMenuOpen] = useState(false);
  const [mobileBrandsOpen, setMobileBrandsOpen] = useState(false);
  const [expandedMobileCats, setExpandedMobileCats] = useState({});
  const closeTimeoutRef = useRef(null);
  const brandsTimeoutRef = useRef(null);
  const accountMenuRef = useRef(null);

  // Close account menu on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    }
    if (accountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [accountMenuOpen]);

  // Initial cart & wishlist load
  useEffect(() => {
    dispatch(fetchCart());
    dispatch(fetchWishlist());
  }, [dispatch]);

  const handleMouseEnter = (cat) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    handleCloseBrandsMenu();
    setHoveredCategory(cat);
  };

  const handleMouseLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setHoveredCategory(null);
    }, 150);
  };

  const handleCloseMenu = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredCategory(null);
  };

  const handleBrandsMouseEnter = () => {
    if (brandsTimeoutRef.current) {
      clearTimeout(brandsTimeoutRef.current);
      brandsTimeoutRef.current = null;
    }
    handleCloseMenu();
    setBrandsMenuOpen(true);
  };

  const handleBrandsMouseLeave = () => {
    if (brandsTimeoutRef.current) {
      clearTimeout(brandsTimeoutRef.current);
    }
    brandsTimeoutRef.current = setTimeout(() => {
      setBrandsMenuOpen(false);
    }, 140);
  };

  const handleCloseBrandsMenu = () => {
    if (brandsTimeoutRef.current) {
      clearTimeout(brandsTimeoutRef.current);
      brandsTimeoutRef.current = null;
    }
    setBrandsMenuOpen(false);
  };

  // Close mobile drawer, mega menu, brands menu, and account menu on route change
  useEffect(() => {
    dispatch(setMobileMenuOpen(false));
    setAccountMenuOpen(false);
    handleCloseMenu();
    handleCloseBrandsMenu();
  }, [location.pathname, dispatch]);

  // Load root active categories & active brands
  useEffect(() => {
    async function loadNavData() {
      try {
        const [cats, brs] = await Promise.all([
          storefrontService.getCategories(true),
          storefrontService.getBrands().catch(() => [])
        ]);
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(cats.slice(0, 10));
          try {
            sessionStorage.setItem('mosmac_nav_cats', JSON.stringify(cats.slice(0, 10)));
          } catch (e) { }
        }
        setBrands(brs || []);
      } catch (err) {
        console.error('Failed to load navigation data:', err);
      }
    }
    loadNavData();
  }, []);

  const toggleMobileCat = (catId) => {
    setExpandedMobileCats((prev) => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50 overflow-x-hidden">
      {/* Top Utility Bar */}
      <div className="bg-[#FAF9F8] border-b border-gray-100 text-[11px] text-gray-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-7 flex items-center justify-between">
          <div className="hidden sm:flex items-center gap-2 text-gray-500">
            <span>Pan-India Express Delivery | Free Shipping on orders above ₹999 | 100% Genuine Certified Brands</span>
          </div>
          <div className="ml-auto flex items-center gap-3 sm:gap-4">
            {isAuthenticated && user?.role !== 'customer' && (
              <>
                <Link to="/admin" className="text-amber-800 hover:text-amber-900 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" /> Ops Portal
                </Link>
                <span className="text-gray-300">|</span>
              </>
            )}
            <Link to="/track-order" className="hover:text-gray-900 transition-colors">Track Order</Link>
            <span className="text-gray-300">|</span>
            <Link to="/faqs" className="hover:text-gray-900 transition-colors">Help Centre</Link>
          </div>
        </div>
      </div>

      {/* Main Header (Row 1) */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-2xs backdrop-blur-md bg-white/95">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Toggle + Logo + Welcome/Login */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => dispatch(toggleMobileMenu())}
              className="md:hidden p-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>

            {/* Logo */}
            <Link to="/" onMouseEnter={handleCloseBrandsMenu} className="flex items-center">
              <span className="font-black text-xl sm:text-[26px] tracking-tight text-slate-950 uppercase font-sans select-none flex items-center">
                MOSMAC<span className="w-1.5 h-1.5 rounded-full bg-[#E03A30] ml-0.5 inline-block" />
              </span>
            </Link>

            {/* Welcome */}
            <div className="hidden lg:flex items-center pl-3.5 select-none border-l border-slate-200 ml-1 h-6">
              <span className="text-xs sm:text-[13px] font-semibold text-slate-700">
                {isAuthenticated && user?.firstName ? `Hi, ${user.firstName}` : 'Welcome'}
              </span>
            </div>

            {/* Middle Nav Links */}
            <nav className="hidden xl:flex items-center gap-5 text-xs font-semibold text-slate-700 ml-4 h-full">
              <div
                className="relative h-16 flex items-center"
                onMouseEnter={handleBrandsMouseEnter}
                onMouseLeave={handleBrandsMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setBrandsMenuOpen(!brandsMenuOpen)}
                  className={`text-xs font-bold transition-colors flex items-center py-2 ${brandsMenuOpen ? 'text-[#E03A30]' : 'text-slate-800 hover:text-[#E03A30]'
                    }`}
                >
                  Brands
                </button>
                {/* Active indicator underline */}
                {brandsMenuOpen && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E03A30] rounded-full" />
                )}
              </div>
              <Link to="/products?section=trending" onMouseEnter={handleCloseBrandsMenu} className="hover:text-[#E03A30] transition-colors">Trending Now</Link>
              <Link to="/products?section=bestsellers" onMouseEnter={handleCloseBrandsMenu} className="hover:text-[#E03A30] transition-colors">Bestsellers</Link>
              <Link to="/offers" onMouseEnter={handleCloseBrandsMenu} className="hover:text-[#E03A30] transition-colors">Offers & Deals</Link>
              <Link to="/mosmac-select" onMouseEnter={handleCloseBrandsMenu} className="hover:text-[#E03A30] transition-colors">MOSMAC Select</Link>
            </nav>
          </div>

          {/* Right: Search + Delivering to + Bag + Account */}
          <div className="flex items-center gap-1.5 sm:gap-4 ml-auto min-w-0">
            {/* Interactive Search Bar */}
            <div className="w-28 xs:w-36 sm:w-56 lg:w-64 min-w-0">
              <SearchBar className="w-full" placeholder="Search" />
            </div>

            {/* Delivering to Selector */}
            <button
              type="button"
              onClick={() => dispatch(setPincodeModalOpen(true))}
              className="hidden md:flex flex-col text-left cursor-pointer group select-none"
              title="Change delivery PIN Code"
            >
              <span className="text-[10px] text-gray-400 font-normal leading-tight">Delivering to</span>
              <span className="text-xs font-bold text-gray-900 flex items-center gap-1 leading-tight group-hover:text-[#E04038]">
                {deliveryPincode || '400013'} <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-[#E04038]" />
              </span>
            </button>

            {/* Shopping Bag */}
            <Link
              to="/cart"
              className="p-1.5 text-gray-800 hover:text-[#E04038] relative transition-colors"
              aria-label="Cart"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#E04038] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>

            {/* Profile / Account Icon */}
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="p-1.5 text-gray-800 hover:text-[#E04038] relative transition-colors"
                aria-label="Account"
                title={isAuthenticated ? `${user?.firstName} (${user?.role})` : 'Account'}
              >
                <User className="w-5 h-5 stroke-[1.5]" />
              </button>

              {/* Account Dropdown Menu */}
              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 space-y-1 z-50 text-xs animate-in fade-in duration-100">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="font-bold text-gray-900 truncate">
                          {user?.firstName} {user?.lastName}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        My Account
                      </Link>

                      <Link
                        to="/orders"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        My Orders
                      </Link>

                      <Link
                        to="/wishlist"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                      >
                        My Wishlist ({wishlistCount})
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
                    </>
                  ) : (
                    <div className="p-3 space-y-2">
                      <p className="font-bold text-gray-900 text-sm">Welcome to Mosmac</p>
                      <p className="text-[11px] text-gray-500">Sign in to access your orders, wishlist, and recommendations.</p>
                      <Link
                        to="/login"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block w-full py-2 text-center bg-[#E04038] text-white font-semibold rounded-lg hover:bg-[#c9342d] transition-colors"
                      >
                        Sign In / Register
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Brands MegaMenu Dropdown (opens directly beneath Level 1, covering Level 2 while open) */}
        <BrandsMegaMenu
          isOpen={brandsMenuOpen}
          brands={brands}
          onClose={handleCloseBrandsMenu}
          onMouseEnter={() => {
            if (brandsTimeoutRef.current) {
              clearTimeout(brandsTimeoutRef.current);
              brandsTimeoutRef.current = null;
            }
          }}
          onMouseLeave={handleBrandsMouseLeave}
        />

        {/* Level 2: Category Navigation Bar with MegaMenu on Hover */}
        <div
          className="relative hidden md:block border-t border-gray-100 bg-white"
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-11 flex items-center gap-1 text-[13px] font-normal text-gray-800 overflow-x-auto no-scrollbar">
            <Link
              to="/whats-new"
              onMouseEnter={handleCloseMenu}
              className="px-3.5 py-2.5 text-gray-900 hover:text-black transition-colors whitespace-nowrap font-medium"
            >
              What's New
            </Link>

            {categories.map((cat) => {
              const hasSubcategories = Array.isArray(cat.children) && cat.children.length > 0;
              const isHovered = hoveredCategory?._id === cat._id;

              return (
                <div
                  key={cat._id}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => {
                    if (brandsMenuOpen) return;
                    if (hasSubcategories) {
                      handleMouseEnter(cat);
                    } else {
                      handleCloseMenu();
                    }
                  }}
                >
                  <Link
                    to={cat.slug ? `/category/${cat.slug}` : `/products`}
                    onClick={handleCloseMenu}
                    className={`px-3.5 py-2.5 transition-colors whitespace-nowrap flex items-center gap-1 ${isHovered
                      ? 'text-black font-semibold'
                      : 'text-gray-800 hover:text-black'
                      }`}
                  >
                    <span>{cat.name}</span>
                    {hasSubcategories && (
                      <ChevronDown
                        className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isHovered ? 'rotate-180 text-black' : ''
                          }`}
                      />
                    )}
                  </Link>

                  {/* Active Indicator Bar on Hover (only when subcategories mega menu is open) */}
                  {isHovered && hasSubcategories && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E04038] rounded-full" />
                  )}
                </div>
              );
            })}
          </div>

          {/* MegaMenu Dropdown */}
          <MegaMenu
            category={hoveredCategory}
            isOpen={Boolean(hoveredCategory)}
            onClose={handleCloseMenu}
            onMouseEnter={() => {
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
            }}
            onMouseLeave={handleMouseLeave}
          />
        </div>

        {/* Mobile Navigation Drawer with Click-Outside Backdrop */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 top-16 bg-black/40 z-40 md:hidden animate-in fade-in duration-150"
              onClick={() => dispatch(setMobileMenuOpen(false))}
            />
            <div
              className="relative z-50 md:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-4 max-h-[80vh] overflow-y-auto shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Pincode button */}
              <button
                type="button"
                onClick={() => {
                  dispatch(setMobileMenuOpen(false));
                  dispatch(setPincodeModalOpen(true));
                }}
                className="w-full flex items-center justify-between p-2.5 bg-gray-50 rounded-xl text-xs font-medium text-gray-700 border border-gray-200/80"
              >
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Deliver to:</span>
                  <strong className="text-gray-900">{deliveryPincode || '110001'}</strong>
                </span>
                <span className="text-emerald-600 text-[11px] font-semibold">Change</span>
              </button>

              <SearchBar
                onSearchSubmitted={() => dispatch(setMobileMenuOpen(false))}
                className="w-full"
              />

              {/* Quick Navigation: 2 Rows x 3 Columns */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <Link
                  to="/"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200/60 font-semibold text-xs transition-all active:scale-95 select-none"
                >
                  Home
                </Link>
                <Link
                  to="/whats-new"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-rose-50/70 hover:bg-rose-100/70 text-rose-600 border border-rose-200/60 font-bold text-xs transition-all active:scale-95 select-none"
                >
                  What's New
                </Link>
                <Link
                  to="/products?section=trending"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200/60 font-semibold text-xs transition-all active:scale-95 select-none"
                >
                  Trending Now
                </Link>
                <Link
                  to="/products?section=bestsellers"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200/60 font-semibold text-xs transition-all active:scale-95 select-none"
                >
                  Bestsellers
                </Link>
                <Link
                  to="/offers"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 text-amber-800 border border-amber-200/60 font-bold text-xs transition-all active:scale-95 select-none"
                >
                  Offers & Deals
                </Link>
                <Link
                  to="/mosmac-select"
                  onClick={() => dispatch(setMobileMenuOpen(false))}
                  className="flex items-center justify-center p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/70 text-purple-800 border border-purple-200/60 font-bold text-xs transition-all active:scale-95 select-none"
                >
                  MOSMAC Select
                </Link>
              </div>

              {/* All Products Action Bar */}
              <Link
                to="/products"
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-black text-white font-bold text-xs shadow-xs transition-all active:scale-[0.99]"
              >
                <span>All Products</span>
                <span className="text-[11px] font-normal text-slate-300">View Full Catalog →</span>
              </Link>

              <div className="border-t border-gray-100 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1 pb-1 block">
                  Categories & Brands
                </span>
              </div>

              <nav className="flex flex-col space-y-1 text-sm font-medium text-gray-800">

                {/* Mobile Brands Accordion */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                    <span className="text-gray-700 flex-1 font-semibold select-none">
                      Brands
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileBrandsOpen(!mobileBrandsOpen)}
                      className="p-1 text-gray-400 hover:text-gray-700"
                      aria-label="Toggle brands"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${mobileBrandsOpen ? 'rotate-180 text-[#E04038]' : ''
                          }`}
                      />
                    </button>
                  </div>

                  {mobileBrandsOpen && (
                    <div className="pl-4 pr-2 py-2 space-y-1 bg-gray-50/80 rounded-xl max-h-60 overflow-y-auto no-scrollbar text-xs">
                      {(brands.length > 0
                        ? brands
                        : [
                          { name: 'MOSMAC', slug: 'mosmac' },
                          { name: 'IMAGIC', slug: 'imagic' },
                          { name: 'Lakmé', slug: 'lakme' },
                          { name: "L'Oréal", slug: 'loreal' },
                          { name: 'Maybelline', slug: 'maybelline' },
                          { name: 'Sugar Cosmetics', slug: 'sugar' },
                          { name: 'MAC', slug: 'mac' }
                        ]
                      ).map((b) => (
                        <Link
                          key={b.slug}
                          to={`/products?brand=${encodeURIComponent(b.slug)}`}
                          onClick={() => dispatch(setMobileMenuOpen(false))}
                          className="block py-1.5 px-2 text-gray-700 hover:text-[#E04038] hover:bg-white rounded font-medium"
                        >
                          {b.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile Category Accordions */}
                {categories.map((cat) => {
                  const subs = Array.isArray(cat.children) ? cat.children : [];
                  const isExpanded = expandedMobileCats[cat._id];

                  return (
                    <div key={cat._id} className="space-y-1">
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50">
                        <Link
                          to={`/products?category=${cat.slug}`}
                          onClick={() => dispatch(setMobileMenuOpen(false))}
                          className="text-gray-700 flex-1 font-semibold"
                        >
                          {cat.name}
                        </Link>
                        {subs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleMobileCat(cat._id)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                          >
                            <ChevronDown
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180 text-emerald-600' : ''
                                }`}
                            />
                          </button>
                        )}
                      </div>

                      {isExpanded && subs.length > 0 && (
                        <div className="pl-6 space-y-1 bg-gray-50/60 rounded-lg p-2 text-xs">
                          {subs.map((sub) => (
                            <Link
                              key={sub._id}
                              to={`/products?category=${sub.slug}`}
                              onClick={() => dispatch(setMobileMenuOpen(false))}
                              className="block py-1 text-gray-600 hover:text-emerald-600"
                            >
                              {sub.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

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
                        className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <Link
                      to="/login"
                      onClick={() => dispatch(setMobileMenuOpen(false))}
                      className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-center block"
                    >
                      Sign In / Register
                    </Link>
                  )}
                </div>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Trust & Assurance Banner (Displayed at bottom above footer across storefront) */}
      <TrustPillarsBanner className="my-12 sm:my-16" />

      {/* Delivery PIN Code Modal */}
      <DeliveryPincodeModal />

      {/* Storefront Footer */}
      <footer className="bg-slate-950 text-gray-300 pt-16 pb-8 border-t border-slate-900 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4">
            <span className="font-extrabold text-2xl tracking-tight text-white font-sans tracking-wide">
              MOSMAC<span className="text-emerald-500">.</span>
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Curated luxury beauty and cosmetics destination delivering 100% genuine, dermatologically tested products with nationwide express logistics across India.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/products?category=foundation-bb-cream" className="hover:text-white transition-colors">
                  Foundation & BB Cream
                </Link>
              </li>
              <li>
                <Link to="/products?category=eyeshadow-palettes" className="hover:text-white transition-colors">
                  Eyeshadow Palettes
                </Link>
              </li>
              <li>
                <Link to="/products?category=eyeliner-kajal" className="hover:text-white transition-colors">
                  Eyeliner & Kajal
                </Link>
              </li>
              <li>
                <Link to="/products?category=lipstick-lip-crayon" className="hover:text-white transition-colors">
                  Lipstick & Lip Care
                </Link>
              </li>
              <li>
                <Link to="/whats-new" className="hover:text-white transition-colors">
                  What's New Launches
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-emerald-400 hover:text-emerald-300 font-semibold">
                  All Collections →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Customer Support</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/track-order" className="hover:text-white transition-colors">Track Your Order</Link></li>
              <li><Link to="/account" className="hover:text-white transition-colors">Manage Delivery Addresses</Link></li>
              <li><Link to="/faqs" className="hover:text-white transition-colors">Frequently Asked Questions (FAQ)</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Help Center & Grievance Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">Security & Trust</h4>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              Certified Razorpay payment integration supporting UPI, NetBanking, and credit/debit cards. Encrypted via 256-bit SSL.
            </p>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition-colors">Return & Refund Policy</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About MOSMAC</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-900 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} MOSMAC. Built for high performance, security, and verified Indian consumer fulfillment.
        </div>
      </footer>

      {/* Global Auth Modal for Guest Add to Bag / Wishlist */}
      <AuthModal />
    </div>
  );
}

export default StorefrontLayout;
