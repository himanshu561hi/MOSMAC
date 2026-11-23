/**
 * Utility to print clean isolated order documents (Tax Invoices and Packing Slips)
 * without browser overflow, modal backdrops, or navbar/sidebar clipping.
 */

function buildDocumentHtml(contentHtml, documentTitle) {
  // Collect active style links & stylesheets
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
        margin: 12mm 10mm;
      }
      *, *::before, *::after {
        visibility: visible !important;
        opacity: 1 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-sizing: border-box !important;
      }
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        overflow: visible !important;
      }
      body * {
        visibility: visible !important;
      }
      .print-page-wrapper {
        width: 100% !important;
        max-width: 210mm !important;
        margin: 0 auto !important;
        padding: 10mm !important;
        background: #ffffff !important;
      }
      table {
        width: 100% !important;
        border-collapse: collapse !important;
      }
      tr {
        page-break-inside: avoid !important;
      }
      .no-print,
      .print\\:hidden,
      netlify-drawer,
      #netlify-drawer,
      [data-netlify-drawer] {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div class="print-page-wrapper" id="printable-order-document">
      ${contentHtml}
    </div>
  </body>
</html>`;
}

export function printElementDirectly(elementId, documentTitle = 'MOSMAC Document') {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) {
    window.print();
    return;
  }

  const contentHtml = sourceEl.innerHTML;
  const fullHtml = buildDocumentHtml(contentHtml, documentTitle);

  // Remove any stale print iframes
  const existing = document.getElementById('mosmac-print-frame');
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  // Create an A4-dimensioned off-screen iframe so the browser layout engine
  // calculates full non-zero dimensions for all text, tables, and colors
  const iframe = document.createElement('iframe');
  iframe.id = 'mosmac-print-frame';
  iframe.setAttribute('title', documentTitle);
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '210mm';
  iframe.style.height = '297mm';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-9999';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow || iframe.contentDocument;
  const iframeDoc = doc.document || doc;

  iframeDoc.open();
  iframeDoc.write(fullHtml);
  iframeDoc.close();

  const executePrint = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Iframe print error, falling back to window print:', err);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        } catch (_) {}
      }, 5000);
    }
  };

  // Wait 300ms for stylesheets & web fonts to compute inside iframe
  setTimeout(executePrint, 300);
}

export function openDocumentInNewTab(elementId, documentTitle = 'MOSMAC Document') {
  const sourceEl = document.getElementById(elementId);
  if (!sourceEl) return;

  const contentHtml = sourceEl.innerHTML;
  const fullHtml = buildDocumentHtml(contentHtml, documentTitle);

  const newWin = window.open('', '_blank');
  if (newWin) {
    newWin.document.open();
    newWin.document.write(`
      ${fullHtml}
      <script>
        window.addEventListener('load', () => {
          setTimeout(() => {
            window.print();
          }, 400);
        });
      </script>
    `);
    newWin.document.close();
  }
}
