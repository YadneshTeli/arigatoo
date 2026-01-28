# Security Considerations - Arigatoo

## Overview
This document outlines security best practices and considerations for the Arigatoo application.

## Authentication & Authorization

### Firebase Authentication
- The backend uses Firebase Admin SDK for token verification
- ID tokens are verified on each protected endpoint
- Tokens should be refreshed before expiration

**Best Practices**:
- Store tokens securely in Chrome extension storage (local, not sync)
- Never log or expose ID tokens
- Implement token refresh logic in the frontend
- Use HTTPS in production for all API calls

### CORS Configuration
The backend implements strict CORS validation:

```typescript
// Allowed origins:
- http://localhost:3000 (development web app)
- https://localhost:3000 (development web app with SSL)
- chrome-extension://[32-char-id] (Chrome extensions with valid ID format)
```

**Production Configuration**:
1. Update CORS origins in `backend/src/main.ts` to include production domains
2. Use environment variables for origin configuration
3. Never use wildcards in production

---

## Input Validation

### Text Input Limits
The API enforces the following limits to prevent resource exhaustion:

| Input Type | Maximum Length | Reason |
|------------|----------------|--------|
| Resume Text | 50,000 characters | Reasonable resume size |
| Job Description | 50,000 characters | Reasonable JD size |
| Gemini API Key | 200 characters | Typical API key length |

### File Upload Validation
Resume uploads are validated for:
- File type: PDF, DOCX, TXT only
- File size: Maximum 50MB
- Content: Parsed and validated before processing

### URL Validation
When scraping job descriptions from URLs:
- Only HTTP and HTTPS protocols allowed
- 10-second timeout to prevent hanging requests
- Response size should be monitored

---

## API Security

### Rate Limiting (Recommended)
While not currently implemented, rate limiting is highly recommended:

```typescript
// Recommended limits:
- Analyze endpoint: 10 requests/minute per user
- Parse endpoint: 20 requests/minute per user
- Upload endpoint: 5 requests/minute per user
```

Consider using `@nestjs/throttler` for implementation.

### API Key Storage
**Never**:
- Commit API keys to version control
- Store API keys in client-side code
- Share API keys between environments

**Always**:
- Use environment variables for API keys
- Rotate API keys regularly
- Use separate keys for development and production

### Sensitive Data in Logs
The exception filter has been configured to:
- Log full error details server-side for debugging
- Return sanitized errors to clients
- Never expose internal error messages for 500 errors

---

## Chrome Extension Security

### Content Security Policy
The extension manifest should include:
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

### Message Passing Security
1. **External Messages**: Only accept messages from known origins
2. **Internal Messages**: Validate message types and payloads
3. **Error Handling**: Always handle promise rejections in message handlers

### Storage Security
- Use `chrome.storage.local` for sensitive data (not `sync`)
- Never store plain-text passwords
- Clear storage on logout
- Validate data before storage

---

## Data Protection

### Resume Data
Resumes contain personally identifiable information (PII):

**Handling Requirements**:
1. Process in memory when possible
2. If stored, encrypt at rest
3. Implement data retention policies
4. Provide user data deletion
5. Comply with GDPR/CCPA requirements

### Firestore Security Rules
Ensure Firestore rules restrict access:
```javascript
// Example rules:
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /resumes/{resumeId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## Third-Party Dependencies

### OpenRouter API
- API key stored in environment variables
- Used for AI-powered analysis
- Fallback to Gemini if unavailable

### Google Gemini API
- System key in environment variables
- User can provide their own key for guest mode
- Validate key format before use (10-200 chars)

### Redis (Upstash)
- Used for caching analysis results
- In-memory fallback if unavailable
- TTL set to 1 hour for cached results

**Security Measures**:
1. Regularly update dependencies
2. Run `npm audit` and address vulnerabilities
3. Monitor security advisories
4. Use dependabot for automated updates

---

## Error Handling

### User-Facing Errors
Return only necessary information:
```typescript
// Good:
{ success: false, error: "Invalid file format" }

// Bad (leaks information):
{ success: false, error: "ENOENT: no such file or directory /var/app/uploads/..." }
```

### Server-Side Logging
Log complete errors server-side for debugging:
```typescript
this.logger.error(`Error: ${error.message}`, error.stack);
```

---

## Network Security

### Timeout Configuration
All external network requests should have timeouts:
- URL scraping: 10 seconds (`FETCH_TIMEOUT_MS`)
- API calls: Implement request timeouts
- Database queries: Configure connection timeouts

### SSL/TLS
**Development**: HTTP acceptable for localhost only

**Production**:
- Enforce HTTPS for all connections
- Use valid SSL certificates
- Implement HSTS headers
- Set secure cookies

---

## Incident Response

### Security Issue Reporting
If you discover a security vulnerability:

1. **Do Not** open a public GitHub issue
2. Email security contact (add contact email)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline
- Acknowledgment: Within 24 hours
- Initial assessment: Within 72 hours
- Fix deployment: Based on severity
  - Critical: Within 24 hours
  - High: Within 7 days
  - Medium: Within 30 days

---

## Compliance Considerations

### Data Privacy
- **GDPR** (EU): Right to access, deletion, portability
- **CCPA** (California): Similar rights to GDPR
- **PIPEDA** (Canada): Personal information protection

### Required Features for Compliance
1. User data export functionality
2. Account deletion capability
3. Privacy policy document
4. Cookie consent (if applicable)
5. Data processing agreements with third parties

---

## Security Checklist for Deployment

### Before Production Deployment

- [ ] All secrets moved to environment variables
- [ ] CORS origins updated for production
- [ ] HTTPS enforced
- [ ] Rate limiting implemented
- [ ] Firestore security rules configured
- [ ] Error messages sanitized
- [ ] Dependencies updated and audited
- [ ] Security headers configured (HSTS, CSP, etc.)
- [ ] Logging and monitoring configured
- [ ] Backup and recovery procedures documented
- [ ] Incident response plan in place
- [ ] Privacy policy published
- [ ] Security testing completed

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Chrome Extension Security Best Practices](https://developer.chrome.com/docs/extensions/mv3/security/)
- [NestJS Security](https://docs.nestjs.com/security/helmet)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)

---

## Document Maintenance

**Last Updated**: January 24, 2026
**Next Review**: Quarterly or after significant security changes
**Maintained By**: Development Team
