/**
 * Utility to print clean isolated order documents (Tax Invoices and Packing Slips)
 * without browser overflow, modal backdrops, or navbar/sidebar clipping.
 */

export function buildDocumentHtml(contentHtml, documentTitle) {
  // Collect active style links & stylesheets from the main document
  const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((el) => el.outerHTML)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${documentTitle}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${headStyles}
    <style>
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        background-color: #f1f5f9;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
      }
      .action-bar {
        position: sticky;
        top: 0;
        left: 0;
        right: 0;
        background: #0f172a;
        color: #ffffff;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        z-index: 1000;
      }
      .action-btn-print {
        background: #10b981;
        color: #022c22;
        font-weight: 800;
        font-size: 13px;
        padding: 8px 18px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .action-btn-close {
        background: #334155;
        color: #e2e8f0;
        font-weight: 600;
        font-size: 13px;
        padding: 8px 16px;
        border-radius: 10px;
        border: none;
        cursor: pointer;
      }
      .page-container {
        max-width: 210mm;
        margin: 24px auto;
        background: #ffffff;
        padding: 10mm 12mm;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
        border-radius: 12px;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      tr {
        page-break-inside: avoid !important;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          background-color: #ffffff !important;
        }
        .action-bar, .no-print, .print\\:hidden {
          display: none !important;
        }
        .page-container {
          margin: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          max-width: 100% !important;
          width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="action-bar">
      <div style="font-weight: 700; font-size: 14px; letter-spacing: -0.01em;">
        ${documentTitle.replace(/_/g, ' ')}
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <button class="action-btn-print" onclick="window.print()">
          🖨️ Print / Save as PDF
        </button>
        <button class="action-btn-close" onclick="window.close()">
          ✕ Close
        </button>
      </div>
    </div>
    <div class="page-container" id="printable-order-document">
      ${contentHtml}
    </div>
    <script>
      // Auto-trigger print once page elements settle
      window.addEventListener('load', () => {
        setTimeout(() => {
          try {
            window.print();
          } catch (_) {}
        }, 350);
      });
    </script>
  </body>
</html>`;
}

/**
 * Direct native printing via top-level #mosmac-print-container.
 * Eliminates iframe culling, blank page previews, and cross-origin sandboxing.
 */
export function printElementDirectly(elementId, documentTitle = 'MOSMAC Document') {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  // Ensure top-level direct print container exists on body
  let container = document.getElementById('mosmac-print-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mosmac-print-container';
    document.body.appendChild(container);
  }

  // Populate container with exact document content
  container.innerHTML = sourceEl.innerHTML;

  // Temporarily update document title so default PDF filename is exact
  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  const cleanup = () => {
    document.title = originalTitle;
    if (container) {
      container.innerHTML = '';
    }
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  try {
    // Trigger native browser print dialog
    window.print();
  } catch (err) {
    console.warn('Native window.print failed, attempting new tab fallback:', err);
    openDocumentInNewTab(elementId, documentTitle);
  } finally {
    // Fallback cleanup in case afterprint event does not fire
    setTimeout(cleanup, 2500);
  }
}

/**
 * Opens document in a dedicated browser tab with its own Print button & auto-print.
 */
export function openDocumentInNewTab(elementId, documentTitle = 'MOSMAC Document') {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) return;

  const contentHtml = sourceEl.innerHTML;
  const fullHtml = buildDocumentHtml(contentHtml, documentTitle);

  const newWin = window.open('', '_blank');
  if (newWin) {
    newWin.document.open();
    newWin.document.write(fullHtml);
    newWin.document.close();
  }
}
