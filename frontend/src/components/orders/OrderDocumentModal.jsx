import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Download,
  X,
  FileText,
  PackageCheck,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Building2,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { printElementDirectly } from '@/utils/printDocument';

// Number to Indian English words converter for GST invoice compliance
function numberToWordsINR(amountInPaise) {
  const rupees = Math.round(amountInPaise / 100);
  if (rupees === 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return a[n];
    return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred > 0) res += a[hundred] + ' Hundred';
    if (rest > 0) res += (res ? ' and ' : '') + convertTwoDigits(rest);
    return res;
  }

  let num = rupees;
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const remaining = num;

  const parts = [];
  if (crore > 0) parts.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) parts.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) parts.push(convertThreeDigits(thousand) + ' Thousand');
  if (remaining > 0) parts.push(convertThreeDigits(remaining));

  return parts.join(' ') + ' Rupees Only';
}

export function OrderDocumentModal({
  isOpen,
  onClose,
  order,
  initialDocType = 'invoice'
}) {
  const [activeTab, setActiveTab] = useState(initialDocType); // 'invoice' | 'packing_slip'
  const printRef = useRef(null);

  useEffect(() => {
    setActiveTab(initialDocType);
  }, [initialDocType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const items = order.items || [];
  const shipping = order.shippingAddress || {};
  const billing = order.billingAddress || shipping;
  const customer = order.customer || {};

  // Pricing values (in integer paise)
  const subtotalPaise = order.pricing?.subtotal ?? order.subtotal ?? 0;
  const discountPaise = order.pricing?.discountTotal ?? order.discountAmount ?? 0;
  const shippingPaise = order.pricing?.shippingFee ?? order.shippingFee ?? 0;
  const grandTotalPaise = order.pricing?.grandTotal ?? order.grandTotal ?? Math.max(0, subtotalPaise - discountPaise + shippingPaise);

  // 18% Inclusive GST breakdown calculation
  // All listed product prices already include 18% GST (Rule 46 compliant)
  // Taxable = Amount / 1.18, Tax = Amount - Taxable
  const isDelhiIntraState = (shipping.state || '').trim().toLowerCase() === 'delhi';
  const totalTaxableGoods = Math.round((subtotalPaise - discountPaise) / 1.18);
  const totalGstAmount = Math.max(0, (subtotalPaise - discountPaise) - totalTaxableGoods);

  const cgstAmount = isDelhiIntraState ? Math.round(totalGstAmount / 2) : 0;
  const sgstAmount = isDelhiIntraState ? totalGstAmount - cgstAmount : 0;
  const igstAmount = !isDelhiIntraState ? totalGstAmount : 0;

  // Package weight calculation (in grams)
  const totalWeightGrams = items.reduce((sum, item) => {
    const w = item.weight || 50; // standard default 50g per unit if unspecified
    return sum + w * (item.quantity || 1);
  }, 0);

  const totalUnits = items.reduce((sum, i) => sum + (i.quantity || 1), 0);
  const invoiceNumber = `INV-${(order.orderNumber || '0000').replace(/^ORD-/, '')}`;
  const isCod = order.paymentMethod === 'cod';

  const handlePrint = () => {
    const docTitle = activeTab === 'invoice'
      ? `Tax_Invoice_${invoiceNumber}`
      : `Packing_Slip_${order.orderNumber}`;
    printElementDirectly('printable-order-document', docTitle);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:h-auto print:max-h-none print:border-none print:shadow-none">
        {/* Modal Toolbar - ALWAYS pinned at the top */}
        <div className="shrink-0 bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden z-10 shadow-md">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'invoice'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Tax Invoice (GST)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('packing_slip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'packing_slip'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Packing Slip & Proof</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10 bg-white print:p-0 print:overflow-visible">
          <div ref={printRef} className="space-y-6 text-slate-800 font-sans" id="printable-order-document">
            {activeTab === 'invoice' ? (
              /* =========================================================================
                 1. GST TAX INVOICE
                 ========================================================================= */
              <div className="space-y-6">
              {/* Invoice Header */}
              <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight font-serif">
                      MOSMAC
                    </h1>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                      Tax Invoice
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">MOSMAC Retail & Beauty India Pvt. Ltd.</p>
                  <p className="text-[11px] text-slate-500">Warehouse Hub, Okhla Industrial Area, New Delhi - 110020</p>
                  <p className="text-[11px] text-slate-500">GSTIN: <span className="font-mono font-bold text-slate-800">07AABCM0987D1Z8</span> | State Code: 07 (Delhi)</p>
                </div>

                <div className="text-left sm:text-right text-xs space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex sm:justify-end gap-2">
                    <span className="text-slate-500">Invoice No:</span>
                    <span className="font-bold font-mono text-slate-900">{invoiceNumber}</span>
                  </div>
                  <div className="flex sm:justify-end gap-2">
                    <span className="text-slate-500">Invoice Date:</span>
                    <span className="font-bold text-slate-900">{formatDate(order.createdAt)}</span>
                  </div>
                  <div className="flex sm:justify-end gap-2">
                    <span className="text-slate-500">Order Ref:</span>
                    <span className="font-bold font-mono text-emerald-700">{order.orderNumber}</span>
                  </div>
                  <div className="flex sm:justify-end gap-2">
                    <span className="text-slate-500">Payment:</span>
                    <span className="font-bold uppercase text-slate-800">
                      {isCod ? 'Cash on Delivery (COD)' : 'Prepaid (Online)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To & Ship To Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1.5 text-emerald-700">
                    <span>Billed To:</span>
                  </p>
                  <p className="font-bold text-slate-900 text-sm">{billing.fullName || customer.firstName || 'Valued Customer'}</p>
                  <p className="text-slate-600 mt-0.5">{billing.addressLine1}</p>
                  {billing.addressLine2 && <p className="text-slate-600">{billing.addressLine2}</p>}
                  <p className="text-slate-600">
                    {billing.city}, {billing.state} - {billing.postalCode}
                  </p>
                  <p className="text-slate-500 mt-1">Phone: {billing.phone || customer.phone}</p>
                  <p className="text-slate-500">Email: {billing.email || customer.email}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Place of Supply: <span className="font-semibold text-slate-800">{shipping.state || 'Delhi'}</span></p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1.5 text-blue-700">
                    <Truck className="w-3.5 h-3.5" />
                    <span>Shipped To (Consignee):</span>
                  </p>
                  <p className="font-bold text-slate-900 text-sm">{shipping.fullName || 'Valued Customer'}</p>
                  <p className="text-slate-600 mt-0.5">{shipping.addressLine1}</p>
                  {shipping.addressLine2 && <p className="text-slate-600">{shipping.addressLine2}</p>}
                  <p className="text-slate-600">
                    {shipping.city}, {shipping.state} - {shipping.postalCode}
                  </p>
                  <p className="text-slate-500 mt-1">Phone: {shipping.phone || customer.phone}</p>
                  <p className="text-slate-500">Delivery Status: <span className="font-bold uppercase text-slate-800">{order.orderStatus}</span></p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Item Description & SKU</th>
                      <th className="py-2.5 px-3 text-center">HSN</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Gross Rate</th>
                      <th className="py-2.5 px-3 text-right">Taxable Val</th>
                      <th className="py-2.5 px-3 text-right">GST (18%)</th>
                      <th className="py-2.5 px-3 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => {
                      const grossRate = item.unitPrice || 0;
                      const lineGross = grossRate * (item.quantity || 1);
                      const lineTaxable = Math.round(lineGross / 1.18);
                      const lineTax = lineGross - lineTaxable;

                      return (
                        <tr key={item.sku || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku} {item.variantTitle && `• ${item.variantTitle}`}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {item.hsnCode || '3304'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                            {formatCurrency(grossRate)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {formatCurrency(lineTaxable)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {formatCurrency(lineTax)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrency(lineGross)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* GST Tax Summary & Grand Total */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider text-slate-600">
                      Tax Breakdown (18% Inclusive GST):
                    </p>
                    {isDelhiIntraState ? (
                      <>
                        <div className="flex justify-between text-slate-600">
                          <span>Central GST (CGST @ 9%):</span>
                          <span className="font-mono font-medium">{formatCurrency(cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>State GST (SGST @ 9%):</span>
                          <span className="font-mono font-medium">{formatCurrency(sgstAmount)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-slate-600">
                        <span>Integrated GST (IGST @ 18%):</span>
                        <span className="font-mono font-medium">{formatCurrency(igstAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-slate-900">
                      <span>Total Tax Component:</span>
                      <span className="font-mono">{formatCurrency(totalGstAmount)}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Amount in words: <strong className="text-slate-800">{numberToWordsINR(grandTotalPaise)}</strong>
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Items Subtotal (Gross):</span>
                    <span className="font-medium text-slate-900">{formatCurrency(subtotalPaise)}</span>
                  </div>

                  {discountPaise > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Promo Discount:</span>
                      <span>- {formatCurrency(discountPaise)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Delivery & Logistics:</span>
                    <span>{shippingPaise === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : formatCurrency(shippingPaise)}</span>
                  </div>

                  <div className="flex justify-between items-baseline border-t-2 border-slate-900 pt-2 text-slate-950 font-black">
                    <span className="text-sm">Total Payable:</span>
                    <span className="text-xl font-mono">{formatCurrency(grandTotalPaise)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">All taxes and GST included</p>
                </div>
              </div>

              {/* Invoice Footer & Certification */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 text-[11px] text-slate-500">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-700">Terms & Conditions:</p>
                  <p>1. Returns accepted within 7 days in original condition with manufacturer seals intact.</p>
                  <p>2. This is a computer generated invoice and requires no physical signature.</p>
                  <p>3. Queries: support@mosmac.in | Toll-free: 1800-MOSMAC-IN</p>
                </div>

                <div className="text-center sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
                  <div className="inline-block p-2 rounded-lg border border-slate-200 bg-slate-50 mb-1">
                    <p className="font-serif font-bold text-slate-900 text-xs">MOSMAC RETAIL PVT LTD</p>
                    <p className="text-[9px] text-slate-400">Digitally Verified & Authorized</p>
                  </div>
                  <p className="text-[10px] text-slate-400">Authorized Signatory</p>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               2. PACKING SLIP & DISPATCH PROOF
               ========================================================================= */
            <div className="space-y-6">
              {/* Slip Header with Barcode Badge */}
              <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-slate-950 tracking-tight font-serif">
                      MOSMAC
                    </h1>
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-300">
                      Packing & Dispatch Slip
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-1">MOSMAC Logistics & Fulfilment Center</p>
                  <p className="text-[11px] text-slate-500">Plot 42, Central Sorting Yard, Okhla-III, New Delhi - 110020</p>
                </div>

                <div className="text-right">
                  <div className="bg-slate-900 text-white font-mono font-black text-sm px-4 py-2 rounded-xl shadow-xs">
                    {order.orderNumber}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">Date: {formatDate(order.createdAt)}</p>
                </div>
              </div>

              {/* Payment Condition Highlight Banner */}
              <div
                className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs font-bold ${
                  isCod
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertCircle className={`w-5 h-5 ${isCod ? 'text-amber-600' : 'text-emerald-600'}`} />
                  <div>
                    <span className="text-sm font-black uppercase">
                      {isCod ? 'CASH ON DELIVERY (COD)' : 'PREPAID ORDER'}
                    </span>
                    <p className="text-[11px] font-normal text-slate-600">
                      {isCod
                        ? 'Delivery Associate Notice: Collect exact cash payment before releasing package.'
                        : 'Package is paid online. DO NOT collect any cash from recipient.'}
                    </p>
                  </div>
                </div>

                <div className="text-right font-black font-mono text-base sm:text-lg">
                  {isCod ? (
                    <span className="text-amber-900 bg-amber-200/80 px-3 py-1 rounded-xl">
                      Collect {formatCurrency(grandTotalPaise)}
                    </span>
                  ) : (
                    <span className="text-emerald-800 bg-emerald-200/80 px-3 py-1 rounded-xl">
                      Paid: {formatCurrency(grandTotalPaise)}
                    </span>
                  )}
                </div>
              </div>

              {/* Destination & Logistics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1 text-slate-500">
                    Deliver To (Customer):
                  </p>
                  <p className="font-extrabold text-slate-950 text-base">{shipping.fullName || 'Customer'}</p>
                  <p className="text-slate-700 font-medium mt-1">{shipping.addressLine1}</p>
                  {shipping.addressLine2 && <p className="text-slate-600">{shipping.addressLine2}</p>}
                  <p className="text-slate-900 font-bold mt-1">
                    {shipping.city}, {shipping.state} - <span className="font-mono text-base text-blue-700">{shipping.postalCode}</span>
                  </p>
                  <p className="text-slate-700 font-bold mt-1 text-xs">
                    Contact: <span className="font-mono">{shipping.phone || customer.phone}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                    Parcel & Dispatch Info:
                  </p>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Courier / Channel:</span>
                    <span className="font-bold text-slate-900">{order.trackingDetails?.courierName || 'Standard Express Surface'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">AWB / Tracking #:</span>
                    <span className="font-mono font-bold text-slate-900">{order.trackingDetails?.trackingNumber || 'Pending Courier Scan'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Items in Box:</span>
                    <span className="font-bold text-slate-900 font-mono">{totalUnits} units</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Package Weight:</span>
                    <span className="font-bold text-emerald-700 font-mono">{totalWeightGrams} Grams</span>
                  </div>
                </div>
              </div>

              {/* Warehouse Packing Checklist */}
              <div>
                <p className="text-xs font-bold text-slate-900 mb-2 flex items-center justify-between">
                  <span>Warehouse Packing Checklist ({items.length} SKUs):</span>
                  <span className="text-[10px] text-slate-400 font-normal">Packer must tick [✓] each item</span>
                </p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">Verify</th>
                        <th className="py-2 px-3">SKU & Item Name</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-center">Unit Weight</th>
                        <th className="py-2 px-3 text-right">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={item.sku || idx} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block w-4 h-4 rounded border-2 border-slate-400"></span>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-slate-900">{item.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku} {item.variantTitle && `(${item.variantTitle})`}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            {item.weight || 50}g
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-900">
                            {formatCurrency(item.unitPrice || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Proof of Delivery / Receiver Acknowledgement Section */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50/70 space-y-3">
                <p className="font-bold text-slate-900 uppercase text-[11px] tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Doorstep Delivery Verification & Proof of Receipt:</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <p className="text-slate-600">
                      "I hereby acknowledge receipt of the intact, sealed package containing all ordered items."
                    </p>
                    <div className="pt-6 border-b border-slate-300 flex justify-between text-slate-400 text-[10px]">
                      <span>Customer Signature / Receiver Name</span>
                      <span>Date: ___/___/2026</span>
                    </div>
                  </div>

                  <div className="space-y-2 sm:border-l sm:border-slate-200 sm:pl-4">
                    <p className="text-slate-600">Courier Delivery Associate Certification:</p>
                    <div className="pt-6 border-b border-slate-300 flex justify-between text-slate-400 text-[10px]">
                      <span>Rider ID & Signature</span>
                      <span>Time: ___:___ AM/PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Address & Support Notice */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                <span>Return Consignee: MOSMAC Returns Hub, Yard-42, Okhla-III, New Delhi - 110020</span>
                <span>Helpline: support@mosmac.in | +91 98765 43210</span>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDocumentModal;
