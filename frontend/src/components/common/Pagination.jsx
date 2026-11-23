import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Calculates page numbers with smart ellipsis for pagination
 * @param {number} totalPages
 * @param {number} currentPage
 * @param {number} siblingCount
 * @returns {Array<number|string>}
 */
export function getPaginationRange(totalPages, currentPage, siblingCount = 1) {
  const totalPageNumbers = siblingCount * 2 + 5;

  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, '...', totalPages];
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [firstPageIndex, '...', ...rightRange];
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    );
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex];
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1);
}

/**
 * Modern, accessible Pagination component
 * Supports:
 * <Pagination totalPages={15} value={page} onChange={setPage} />
 * Also supports aliases: page={page}, onPageChange={setPage}
 */
export function Pagination({
  totalPages = 1,
  value,
  page,
  onChange,
  onPageChange,
  siblingCount = 1,
  className = '',
  size = 'md'
}) {
  const currentPage = value !== undefined ? Number(value) : page !== undefined ? Number(page) : 1;

  const handlePageSelect = (newPage) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    if (typeof onChange === 'function') onChange(newPage);
    if (typeof onPageChange === 'function') onPageChange(newPage);
  };

  if (!totalPages || totalPages <= 1) return null;

  const paginationRange = getPaginationRange(totalPages, currentPage, siblingCount);

  const isSmall = size === 'sm';
  const btnSizeClass = isSmall
    ? 'w-7 h-7 sm:w-8 sm:h-8 text-xs'
    : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm';
  const navBtnClass = isSmall
    ? 'px-2.5 py-1 text-xs'
    : 'px-3 py-1.5 text-xs sm:text-sm';

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={`inline-flex items-center gap-1 sm:gap-1.5 ${className}`}
    >
      {/* Previous Page Button */}
      <button
        type="button"
        onClick={() => handlePageSelect(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`inline-flex items-center justify-center gap-1 font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-black hover:border-gray-300 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all shadow-2xs ${navBtnClass}`}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>

      {/* Numbered Page Buttons & Ellipsis */}
      <div className="flex items-center gap-1">
        {paginationRange.map((item, index) => {
          if (item === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className={`flex items-center justify-center font-medium text-gray-400 select-none ${btnSizeClass}`}
              >
                &hellip;
              </span>
            );
          }

          const pageNum = Number(item);
          const isActive = pageNum === currentPage;

          return (
            <button
              key={`page-${pageNum}`}
              type="button"
              onClick={() => handlePageSelect(pageNum)}
              aria-current={isActive ? 'page' : undefined}
              className={`font-semibold rounded-xl flex items-center justify-center transition-all ${btnSizeClass} ${
                isActive
                  ? 'bg-gray-900 text-white shadow-xs font-bold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-black border border-transparent hover:border-gray-200'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Next Page Button */}
      <button
        type="button"
        onClick={() => handlePageSelect(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`inline-flex items-center justify-center gap-1 font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-black hover:border-gray-300 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all shadow-2xs ${navBtnClass}`}
        aria-label="Next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}

export default Pagination;
