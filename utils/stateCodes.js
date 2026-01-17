/**
 * State Codes Utility
 */

// GSTIN state code mapping (first 2 digits correspond to state codes)
const gstStateCodes = {
    '01': 'JK',  // Jammu and Kashmir
    '02': 'HP',  // Himachal Pradesh
    '03': 'PB',  // Punjab
    '04': 'CH',  // Chandigarh
    '05': 'UK',  // Uttarakhand
    '06': 'HR',  // Haryana
    '07': 'DL',  // Delhi
    '08': 'RJ',  // Rajasthan
    '09': 'UP',  // Uttar Pradesh
    '10': 'BR',  // Bihar
    '11': 'SK',  // Sikkim
    '12': 'AR',  // Arunachal Pradesh
    '13': 'NL',  // Nagaland
    '14': 'MN',  // Manipur
    '15': 'ML',  // Meghalaya
    '16': 'TR',  // Tripura
    '17': 'MZ',  // Mizoram
    '18': 'AS',  // Assam
    '19': 'WB',  // West Bengal
    '20': 'JH',  // Jharkhand
    '21': 'OR',  // Odisha
    '22': 'MP',  // Madhya Pradesh
    '23': 'GJ',  // Gujarat
    '24': 'DH',  // Dadra and Nagar Haveli and Daman and Diu
    '25': 'GA',  // Goa
    '26': 'KA',  // Karnataka
    '27': 'MH',  // Maharashtra
    '28': 'TG',  // Telangana
    '29': 'KA',  // Karnataka (continued)
    '30': 'PY',  // Puducherry
    '31': 'AN',  // Andaman and Nicobar Islands
    '32': 'KL',  // Kerala
    '33': 'TN',  // Tamil Nadu
    '34': 'AS',  // Assam (continued)
    '35': 'LD',  // Lakshadweep
    '36': 'KL',  // Kerala (continued)
    '37': 'PY',  // Puducherry (continued)
    '38': 'GJ',  // Gujarat (continued)
    '39': 'MH',  // Maharashtra (continued)
    '40': 'AP',  // Andhra Pradesh (new)
    '41': 'TS',  // Telangana (continued)
    '42': 'LA',  // Ladakh
    '43': 'AN',  // Andaman and Nicobar Islands (continued)
    '44': 'AP',  // Andhra Pradesh (new)
    '45': 'MP',  // Madhya Pradesh (continued)
    '46': 'MP',  // Madhya Pradesh (continued)
    '47': 'UP',  // Uttar Pradesh (continued)
    '48': 'UP',  // Uttar Pradesh (continued)
    '49': 'BR',  // Bihar (continued)
    '50': 'TS',  // Telangana (continued)
    '51': 'AP',  // Andhra Pradesh (new)
    '52': 'AP',  // Andhra Pradesh (new)
    '53': 'AP',  // Andhra Pradesh (new)
    '54': 'TG',  // Telangana (continued)
    '55': 'TG',  // Telangana (continued)
    '56': 'KA',  // Karnataka (continued)
    '57': 'KA',  // Karnataka (continued)
    '58': 'KA',  // Karnataka (continued)
    '59': 'KA',  // Karnataka (continued)
    '60': 'TN',  // Tamil Nadu (continued)
    '61': 'TN',  // Tamil Nadu (continued),
    '62': 'TN',  // Tamil Nadu (continued)
    '63': 'TN',  // Tamil Nadu (continued)
    '64': 'TN',  // Tamil Nadu (continued)
    '65': 'TN',  // Tamil Nadu (continued)
    '66': 'TN',  // Tamil Nadu (continued)
    '67': 'KL',  // Kerala (continued)
    '68': 'KL',  // Kerala (continued)
    '69': 'KL',  // Kerala (continued)
    '70': 'KL',  // Kerala (continued)
    '71': 'WB',  // West Bengal (continued)
    '72': 'WB',  // West Bengal (continued)
    '73': 'WB',  // West Bengal (continued)
    '74': 'WB',  // West Bengal (continued)
    '75': 'OD',  // Odisha (continued)
    '76': 'OD',  // Odisha (continued)
    '77': 'OD',  // Odisha (continued)
    '78': 'AS',  // Assam (continued)
    '79': 'AS',  // Assam (continued)
    '80': 'BR',  // Bihar (continued)
    '81': 'BR',  // Bihar (continued)
    '82': 'BR',  // Bihar (continued)
    '83': 'JH',  // Jharkhand (continued)
    '84': 'JH',  // Jharkhand (continued)
    '85': 'JH',  // Jharkhand (continued)
    '86': 'MP',  // Madhya Pradesh (continued)
    '87': 'MP',  // Madhya Pradesh (continued)
    '88': 'UP',  // Uttar Pradesh (continued)
    '89': 'UP',  // Uttar Pradesh (continued)
    '90': 'UP',  // Uttar Pradesh (continued)
    '91': 'UP',  // Uttar Pradesh (continued)
    '92': 'UP',  // Uttar Pradesh (continued)
    '93': 'UP',  // Uttar Pradesh (continued)
    '94': 'UP',  // Uttar Pradesh (continued)
    '95': 'UP',  // Uttar Pradesh (continued)
    '96': 'PB',  // Punjab (continued)
    '97': 'PB',  // Punjab (continued)
    '98': 'HR',  // Haryana (continued)
    '99': 'HP',  // Himachal Pradesh (continued)
};

// Standard state name to state code mapping as fallback
const stateNameCodes = {
    'jammu and kashmir': 'JK',
    'himachal pradesh': 'HP',
    'punjab': 'PB',
    'chandigarh': 'CH',
    'uttarakhand': 'UK',
    'haryana': 'HR',
    'delhi': 'DL',
    'rajasthan': 'RJ',
    'up': 'UP',
    'uttar pradesh': 'UP',
    'bihar': 'BR',
    'sikkim': 'SK',
    'arunachal pradesh': 'AR',
    'nagaland': 'NL',
    'manipur': 'MN',
    'meghalaya': 'ML',
    'tripura': 'TR',
    'mizoram': 'MZ',
    'assam': 'AS',
    'wb': 'WB',
    'west bengal': 'WB',
    'jharkhand': 'JH',
    'odisha': 'OR',
    'orissa': 'OR',
    'madhya pradesh': 'MP',
    'gujarat': 'GJ',
    'dnh': 'DN',
    'daman and diu': 'DD',
    'dadra and nagar haveli and daman and diu': 'DH',
    'goa': 'GA',
    'karnataka': 'KA',
    'maharashtra': 'MH',
    'telangana': 'TG',
    'puducherry': 'PY',
    'lakshadweep': 'LD',
    'kerala': 'KL',
    'tamil nadu': 'TN',
    'andhra pradesh': 'AP',
    'ladakh': 'LA',
    'andaman and nicobar islands': 'AN',
    'chhattisgarh': 'CT'
};

/**
 * Extract state code from GSTIN (first 2 digits)
 * @param {string} gstin - GST Identification Number
 * @returns {string|null} - State code or null if invalid GSTIN
 */
function getStateCodeFromGSTIN(gstin) {
    if (!gstin || typeof gstin !== 'string' || gstin.length < 2) {
        return null;
    }
    
    const prefix = gstin.substring(0, 2);
    return gstStateCodes[prefix] || null;
}

/**
 * Get state code from state name
 * @param {string} state - State name
 * @returns {string|null} - State code or null if not found
 */
function getStateCode(state) {
    if (!state || typeof state !== 'string') {
        return null;
    }
    
    const normalizedState = state.trim().toLowerCase();
    return stateNameCodes[normalizedState] || null;
}

/**
 * Format address with PIN code
 * @param {string} address - Address string
 * @param {string} pin - PIN code
 * @returns {string} - Formatted address with PIN if available
 */
function formatAddressWithPin(address, pin) {
    if (!address && !pin) {
        return '';
    }
    
    if (!address) {
        return `PIN: ${pin}`;
    }
    
    if (!pin) {
        return address;
    }
    
    return `${address}, PIN: ${pin}`;
}

module.exports = {
    getStateCode,
    formatAddressWithPin,
    getStateCodeFromGSTIN
};