# Extension Security Notes

## Content Security Policy (CSP)

Chrome Extension Manifest V3 uses a more secure default CSP and doesn't require explicit CSP declaration for extension pages. The default CSP is:
- `script-src 'self'`
- `object-src 'self'`

This means:
- Only scripts bundled with the extension can run
- No inline scripts are allowed
- No eval() or similar dynamic code execution
- External scripts cannot be loaded

## Current Security Measures

1. **Service Worker Background Script**: Uses isolated context, no DOM access
2. **Content Scripts**: Run in isolated world, sandboxed from page scripts
3. **Storage**: Uses `chrome.storage.local` (not synced, more secure for sensitive data)
4. **Message Passing**: Validates message types before processing
5. **External Connectivity**: Limited to specific domains only (localhost for dev, production domain)

## Recommendations

1. **Production**: Update `externally_connectable.matches` to use production domain only
2. **Permissions**: Review and minimize permissions before production release
3. **Host Permissions**: Consider using optional permissions for job sites
4. **API Keys**: Never bundle API keys in extension code
5. **Token Storage**: ID tokens stored locally, cleared on logout

## OWASP Top 10 Compliance

- **Injection**: Content scripts use safe DOM methods, no innerHTML with user data
- **Broken Authentication**: Firebase auth with token validation
- **Sensitive Data Exposure**: No sensitive data in logs or client-side code
- **XSS**: All user-controlled content uses textContent, not innerHTML
- **Security Misconfiguration**: Minimal permissions, secure defaults
