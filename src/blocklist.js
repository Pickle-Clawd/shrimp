// Blocklist of known malicious, phishing, and spam domains
// Add domains here to prevent them from being shortened
const BLOCKED_DOMAINS = new Set([
  // Common phishing domains
  'evil.com',
  'malware.com',
  'phishing.com',
  'scam.com',

  // Known malware distribution
  'malwaredomainlist.com',

  // Shortened URL abuse (prevent chaining)
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  't.co',
  'is.gd',
  'v.gd',
  'ow.ly',
  'buff.ly',
  'adf.ly',
  'shorte.st',
  'bc.vc',

  // Common phishing targets (fake login pages)
  'login-verify.com',
  'secure-update.com',
  'account-verify.com',
  'signin-alert.com',
  'update-info.com',

  // Known spam domains
  'spam4.me',
  'guerrillamail.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
]);

module.exports = BLOCKED_DOMAINS;
