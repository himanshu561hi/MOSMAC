import React from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/common/Button';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <span className="text-6xl font-extrabold text-emerald-600 mb-2">404</span>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h2>
      <p className="text-gray-500 max-w-md text-sm mb-6">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <Link to="/">
        <Button>
          <Home className="w-4 h-4" /> Back to Storefront
        </Button>
      </Link>
    </div>
  );
}

export default NotFoundPage;

