/**
 * AccordionGallery.jsx
 *
 * Open-source React Bits Component — Hardware-Accelerated Responsive Image Accordion
 * Features:
 * - GSAP 3D perspective rotation, tilt, and elastic flex expansion
 * - Parallax image drift and grayscale/saturation focus
 * - Accessible keyboard navigation (ArrowLeft/ArrowRight/ArrowUp/ArrowDown)
 * - Touch & reduced-motion accessibility support
 * - Safe ResizeObserver measurement & memory cleanup on unmount
 * - SPA React Router navigation for internal links
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import './AccordionGallery.css';

const DEFAULT_ITEMS = [
  {
    id: 'default-1',
    badge: 'MOSMAC COMPLEXION',
    label: 'Ultra Definition Liquid Foundation',
    price: '₹999',
    originalPrice: '₹1,299',
    rating: '4.9',
    tag: 'Bestseller',
    image: '/images/hero/hero-1-foundation.jpg',
    link: '/product/mosmac-ultra-definition-liquid-foundation-30-ml',
    alt: 'MOSMAC Ultra Definition Liquid Foundation'
  },
  {
    id: 'default-2',
    badge: 'FLAWLESS FINISH',
    label: 'Translucent Loose Setting Powder',
    price: '₹599',
    originalPrice: '₹799',
    rating: '4.8',
    tag: 'Award Winner',
    image: '/images/hero/hero-2-loose-powder.jpg',
    link: '/product/mosmac-loose-powder',
    alt: 'MOSMAC Loose Setting Powder'
  },
  {
    id: 'default-3',
    badge: 'PRO EYE PALETTE',
    label: '16-Color Pigmented Eyeshadow Palette',
    price: '₹1,199',
    originalPrice: '₹1,599',
    rating: '4.9',
    tag: 'Trending',
    image: '/images/hero/hero-3-eyeshadow-palette.jpg',
    link: '/product/imagic-charm-16-color-eyeshadow-palette',
    alt: 'IMAGIC Charm 16 Color Eyeshadow Palette'
  },
  {
    id: 'default-4',
    badge: 'LONG WEAR LINER',
    label: 'Long-Lasting No Smudge Eyeliner',
    price: '₹349',
    originalPrice: '₹499',
    rating: '4.7',
    tag: 'Waterproof',
    image: '/images/hero/hero-4-eyeliner.jpg',
    link: '/product/mosmac-no-smudge-eyeliner',
    alt: 'MOSMAC No Smudge Eyeliner'
  },
  {
    id: 'default-5',
    badge: 'SPF 50 LIP CARE',
    label: 'Cherry Lip Balm SPF 50 PA++++',
    price: '₹299',
    originalPrice: '₹399',
    rating: '4.8',
    tag: 'New Launch',
    image: '/images/hero/hero-5-lip-balm.jpg',
    link: '/product/mosmac-cherry-lip-balm-spf-50-paplusplusplusplus-4-5-g',
    alt: 'MOSMAC Cherry Lip Balm SPF 50'
  }
];

export const AccordionGallery = ({
  items = DEFAULT_ITEMS,
  defaultIndex = 0,
  accentColor = '#E03A30',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 480,
  gap = 12,
  radius = 20,
  expandRatio = 0.42,
  orientation = 'horizontal',
  duration = 0.55,
  ease = 'power2.out',
  parallax = 0,
  tilt = 0,
  stagger = 0.05,
  trigger = 'hover',
  showLabels = true,
  grayscale = false,
  className = '',
  onItemSelect
}) => {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const panelRefs = useRef([]);
  const mediaRefs = useRef([]);
  const barRefs = useRef([]);
  const textRefs = useRef([]);
  const tlRef = useRef(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(480);
  const activeRatioRef = useRef(expandRatio);

  const vertical = orientation === 'vertical';
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(0, count - 1)));

  // Sync active index if items array changes dynamically
  useEffect(() => {
    setActive((prev) => Math.min(prev, Math.max(0, items.length - 1)));
  }, [items.length]);

  const prefersReduced =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const applyLayout = useCallback(
    (animate) => {
      const panels = panelRefs.current;
      if (!panels.length) return;

      const dynamicR = activeRatioRef.current || expandRatio;
      const r = Math.min(Math.max(dynamicR, 0.2), 0.85);
      const grow = count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const bar = barRefs.current[i];
        const text = textRefs.current[i];

        const rot = isActive ? 0 : i < active ? tilt : -tilt;
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

        tl.to(panel, { flexGrow: isActive ? grow : 1, '--ag-dim': isActive ? 0 : 0.2, ...rotProp, duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              duration: dur,
              ease
            },
            0
          );
        }

        if (showLabels && bar && text) {
          if (isActive) {
            tl.to([bar, text], { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger }, 0);
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced
    ]
  );

  // Measure dynamic dimensions & respond to viewport resizes
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const containerH = vertical ? rect.width : rect.height;
      const containerW = vertical ? rect.height : rect.width;
      const usable = Math.max(containerW - gap * (count - 1), 120);

      // The open panel expands according to the image's 1:1 aspect ratio (width equals container height).
      // Capped at usable * 0.62 so inactive panels have sufficient breathing room.
      const targetOpenWidth = Math.min(containerH, usable * 0.62);
      const dynamicRatio = targetOpenWidth / usable;
      activeRatioRef.current = dynamicRatio;

      // Media size matches targetOpenWidth so the image is a 1:1 square without cropping.
      const size = Math.round(targetOpenWidth);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
      applyLayout(!firstRunRef.current);
    };

    measure();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
  }, [applyLayout, gap, count, expandRatio, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(() => {
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  const handleEnter = (i) => {
    if (trigger === 'hover') {
      setActive(i);
      onItemSelect?.(items[i], i);
    }
  };

  const handleClick = (i, e) => {
    const item = items[i];
    if (item?.link) {
      if (item.link.startsWith('/')) {
        e.preventDefault();
        navigate(item.link);
      } else {
        window.open(item.link, '_blank', 'noopener,noreferrer');
      }
    } else {
      setActive(i);
      onItemSelect?.(item, i);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (i + 1) % count;
      setActive(next);
      panelRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (i - 1 + count) % count;
      setActive(prev);
      panelRefs.current[prev]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      handleClick(i, e);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={{
        '--ag-accent': accentColor,
        '--ag-overlay': overlayColor,
        '--ag-text': textColor,
        '--ag-gap': `${gap}px`,
        '--ag-radius': `${radius}px`,
        height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`
      }}
      role="list"
      aria-label="Interactive Flagship Gallery"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        const Tag = item.link ? 'a' : 'div';
        const isExternal = item.link && !item.link.startsWith('/');

        return (
          <Tag
            key={item.id || i}
            ref={(el) => (panelRefs.current[i] = el)}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            href={item.link || undefined}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noopener noreferrer' : undefined}
            onClick={(e) => handleClick(i, e)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => {
              setActive(i);
              onItemSelect?.(item, i);
            }}
            onKeyDown={(e) => handleKeyDown(i, e)}
            role="listitem"
            tabIndex={0}
            aria-current={isActive ? 'true' : undefined}
            aria-label={item.label || item.title || `Gallery Panel ${i + 1}`}
          >
            <span className="ag-panel__frame">
              <span className="ag-panel__media" ref={(el) => (mediaRefs.current[i] = el)}>
                <img
                  src={item.image || item.imageUrl}
                  alt={item.alt || item.label || ''}
                  draggable="false"
                  onError={(e) => {
                    e.target.src = DEFAULT_ITEMS[i % DEFAULT_ITEMS.length].image;
                  }}
                />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>

            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span className="ag-panel__bar" ref={(el) => (barRefs.current[i] = el)} />
                <span className="ag-panel__text" ref={(el) => (textRefs.current[i] = el)}>
                  <span className="ag-panel__info">
                    {item.badge && <span className="ag-panel__badge">{item.badge}</span>}
                    <span className="ag-panel__title">{item.label || item.title}</span>
                  </span>
                  <span className="ag-panel__shop-now">
                    Shop Now <span className="ag-panel__arrow">&rarr;</span>
                  </span>
                </span>
              </span>
            )}
          </Tag>
        );
      })}
    </div>
  );
};

export default AccordionGallery;
