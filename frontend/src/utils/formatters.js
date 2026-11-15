/**
 * Formats integer paise into standard Indian Rupee string (e.g. 149900 paise -> ₹1,499.00 or ₹1,499)
 * @param {number} paise - Amount in minor currency units (paise)
 * @param {boolean} includeDecimals - Whether to enforce two decimal places
 * @returns {string} Formatted INR currency string
 */
export function formatCurrency(paise, includeDecimals = false) {
  if (typeof paise !== 'number' || isNaN(paise)) return '₹0';
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : (rupees % 1 === 0 ? 0 : 2),
    maximumFractionDigits: 2
  }).format(rupees);
}

/**
 * Formats ISO date string into readable Indian locale format
 * @param {string|Date} date 
 * @returns {string}
 */
export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Validates 6-digit Indian PIN Code
 * @param {string} pin 
 * @returns {boolean}
 */
export function isValidPinCode(pin) {
  return /^[1-9][0-9]{5}$/.test(pin);
}

/**
 * Validates 10-digit Indian Mobile Number
 * @param {string} phone 
 * @returns {boolean}
 */
export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

