// EFF's Large Wordlist for Passphrase Generation
// Source: https://www.eff.org/deeplinks/2016/07/new-wordlists-random-passphrases
// This wordlist contains 7,776 words specifically chosen for memorability and security

export const loadEFFWordlist = async (): Promise<string[]> => {
  try {
    const response = await fetch('/eff-wordlist.txt');
    const text = await response.text();
    return text.split('\n').filter(word => word.trim().length > 0);
  } catch (error) {
    console.error('Failed to load EFF wordlist, using fallback', error);
    // Return a smaller fallback list if loading fails
    return FALLBACK_WORDLIST;
  }
};

// Small fallback wordlist in case the main list fails to load
const FALLBACK_WORDLIST = [
  'ability', 'absence', 'academy', 'account', 'achieve', 'acquire', 'address', 'advance',
  'adviser', 'aircraft', 'airport', 'already', 'analyst', 'ancient', 'another', 'anxiety',
  'anybody', 'apology', 'approve', 'arrange', 'arrival', 'article', 'artwork', 'assault',
  'athlete', 'attempt', 'attract', 'auction', 'average', 'balance', 'balloon', 'banking',
  'barrier', 'battery', 'bedroom', 'believe', 'benefit', 'besides', 'billion', 'biology',
  'blanket', 'bombing', 'bracket', 'brother', 'builder', 'burning', 'cabinet', 'caliber',
  'capable', 'capital', 'captain', 'capture', 'careful', 'carrier', 'cartoon', 'catalog',
  'ceiling', 'central', 'century', 'certain', 'chamber', 'channel', 'chapter', 'charity',
  'chicken', 'circuit', 'citizen', 'classic', 'climate', 'cluster', 'coastal', 'collect',
  'college', 'combine', 'comfort', 'command', 'comment', 'company', 'compare', 'compete',
  'complex', 'concept', 'concern', 'concert', 'conduct', 'confirm', 'connect', 'consist',
  'contain', 'content', 'contest', 'context', 'control', 'convert', 'cooking', 'council',
  'country', 'courage', 'crucial', 'crystal', 'culture', 'current', 'custody', 'cutting'
];

// Calculate entropy for a passphrase
export const calculatePassphraseEntropy = (wordCount: number, wordlistSize: number = 7776): number => {
  // Entropy = log2(wordlistSize^wordCount)
  return Math.log2(Math.pow(wordlistSize, wordCount));
};

// Get security rating based on entropy bits
export const getEntropyRating = (entropyBits: number): { rating: string; color: string; description: string } => {
  if (entropyBits < 40) {
    return {
      rating: 'Weak',
      color: 'text-red-600 dark:text-red-400',
      description: 'Can be cracked in minutes'
    };
  } else if (entropyBits < 60) {
    return {
      rating: 'Fair',
      color: 'text-orange-600 dark:text-orange-400',
      description: 'Can be cracked in days to months'
    };
  } else if (entropyBits < 80) {
    return {
      rating: 'Good',
      color: 'text-yellow-600 dark:text-yellow-400',
      description: 'Would take years to crack'
    };
  } else if (entropyBits < 100) {
    return {
      rating: 'Strong',
      color: 'text-blue-600 dark:text-blue-400',
      description: 'Would take centuries to crack'
    };
  } else {
    return {
      rating: 'Excellent',
      color: 'text-green-600 dark:text-green-400',
      description: 'Practically uncrackable'
    };
  }
};

// Format large numbers for display
export const formatLargeNumber = (num: number): string => {
  if (num < 1e6) return num.toLocaleString();
  if (num < 1e9) return (num / 1e6).toFixed(1) + ' million';
  if (num < 1e12) return (num / 1e9).toFixed(1) + ' billion';
  if (num < 1e15) return (num / 1e12).toFixed(1) + ' trillion';
  if (num < 1e18) return (num / 1e15).toFixed(1) + ' quadrillion';
  return (num / 1e18).toFixed(1) + ' quintillion';
};