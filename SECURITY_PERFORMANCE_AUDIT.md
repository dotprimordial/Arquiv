# Security and Performance Audit Report
**Date:** June 25, 2026  
**Repository:** Arquiv - Normas Técnicas de Construção e Legislação

---

## Executive Summary

This audit identified **36 security vulnerabilities** in dependencies (5 low, 15 moderate, 14 high, 2 critical) and several areas for security and performance improvement. The application has good security foundations with proper authentication, input validation, and rate limiting, but requires attention to dependency updates and some security hardening.

**Overall Security Score:** 6.5/10  
**Overall Performance Score:** 7/10

---

## 🔴 Critical Issues

### 1. Dependency Vulnerabilities (36 total)
**Severity:** CRITICAL (2), HIGH (14), MODERATE (15), LOW (5)

**Critical Vulnerabilities:**
- `undici` (multiple): No fix available - HTTP request smuggling, TLS bypass, DoS attacks
- `ws` (multiple): Memory exhaustion DoS, uninitialized memory disclosure - No fix available

**High Severity:**
- `tar`: Arbitrary file creation/overwrite via path traversal
- `protobufjs`: Multiple DoS vulnerabilities
- `qs`: Remotely triggerable DoS
- `quill`: XSS via HTML export (affects react-quill-new)

**Recommendation:**
```bash
npm audit fix
# Review breaking changes for:
npm audit fix --force
```

For packages with no available fixes (undici, ws), consider:
- Pinning to specific versions
- Implementing additional security layers
- Monitoring for upstream fixes

---

## 🟠 High Priority Security Issues

### 2. XSS Risk via dangerouslySetInnerHTML
**Files:**
- `components/NormDetailView.tsx:109`
- `components/ui/multi-type-ripple-buttons.tsx` (multiple instances)
- `app/upload/UploadPage.tsx:662`

**Issue:** Direct HTML injection without sanitization

**Current Code:**
```tsx
<div dangerouslySetInnerHTML={{ __html: content }} />
```

**Recommendation:**
```tsx
import DOMPurify from 'dompurify';

const sanitizedContent = DOMPurify.sanitize(content);
<div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
```

Or use React Markdown for all content rendering.

---

### 3. Admin Email Comparison Vulnerability
**Files:**
- `lib/gemini.ts:413`
- `app/actions/norm-actions.ts:151`
- Multiple other locations

**Issue:** Case-insensitive email comparison without normalization

**Current Code:**
```typescript
if (formData.userEmail?.trim().toLowerCase() !== adminEmail.toLowerCase())
```

**Recommendation:**
```typescript
// Normalize emails before comparison
const normalizeEmail = (email: string) => email.trim().toLowerCase();
if (normalizeEmail(formData.userEmail) !== normalizeEmail(adminEmail))
```

---

### 4. Error Message Information Leakage
**Files:** Multiple locations

**Issue:** Some error messages expose internal implementation details

**Examples:**
```typescript
throw new Error(`Falha ao excluir norma: ${error.message}. Verifique as permissões RLS.`);
```

**Recommendation:**
```typescript
// Production: generic messages
if (process.env.NODE_ENV === 'production') {
  throw new Error('Falha ao excluir norma. Tente novamente.');
} else {
  throw new Error(`Falha ao excluir norma: ${error.message}`);
}
```

---

## 🟡 Medium Priority Issues

### 5. Redis Configuration Error Handling
**File:** `lib/redis.ts:20`

**Issue:** Throws error when Redis is not configured, which could break the app

**Current Code:**
```typescript
if (!redisUrl || !redisToken) {
  console.warn('[Redis] UPSTASH_REDIS_REST_URL not configured...');
  throw new Error('Redis configuration missing');
}
```

**Recommendation:**
```typescript
if (!redisUrl || !redisToken) {
  console.warn('[Redis] Redis not configured, caching disabled');
  return null; // Graceful degradation
}
```

---

### 6. Service Role Key Fallback Warning
**File:** `lib/supabase-server.ts:66-74`

**Issue:** Falls back to anon key when service role key is missing, potentially bypassing RLS

**Current Code:**
```typescript
if (!serviceRoleKey) {
  console.warn('[Supabase] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. RLS policies WILL apply.');
}
```

**Recommendation:**
- Make service role key required for admin operations
- Fail fast in production if missing
```typescript
if (!serviceRoleKey && process.env.NODE_ENV === 'production') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY required in production');
}
```

---

### 7. CSP Policy Could Be More Restrictive
**File:** `middleware.ts:11-21`

**Current CSP:**
```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

**Recommendation:**
- Remove `'unsafe-inline'` and `'unsafe-eval'` if possible
- Use nonce or hash-based CSP
- Consider using CSP Builder for better management

---

## 🟢 Positive Security Findings

### ✅ Good Practices Implemented

1. **Authentication & Authorization**
   - Supabase Auth with proper session management
   - Row Level Security (RLS) policies in database
   - Admin checks before sensitive operations

2. **Input Validation**
   - `isValidTextInput()` function validates user input
   - Used consistently across search and upload functions
   - Rejects binary data, control characters, oversized input

3. **Rate Limiting**
   - Database-backed rate limiting
   - Different limits for anonymous vs authenticated users
   - IP-based tracking with fallback to user ID

4. **Security Headers**
   - Content-Security-Policy
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Strict-Transport-Security
   - Referrer-Policy
   - Permissions-Policy

5. **SQL Injection Protection**
   - Uses Supabase client (parameterized queries)
   - No raw SQL concatenation found

6. **API Key Management**
   - Sensitive keys use server-side env vars (no NEXT_PUBLIC_)
   - Proper fallback handling

---

## 🔵 Performance Analysis

### ✅ Good Performance Practices

1. **Caching Strategy**
   - Recently implemented Redis cache for searches (5min TTL)
   - Static data caching (10min TTL)
   - Semantic cache keys for better hit rates
   - Automatic cache invalidation on data changes

2. **Database Queries**
   - Uses Supabase client with proper indexing
   - No obvious N+1 query issues
   - Pagination implemented
   - Select only needed fields

3. **Bundle Optimization**
   - Dynamic imports for heavy components (AuthModal, SemanticNormDisplay)
   - Font optimization with `display: swap`
   - Next.js image optimization configured

4. **Edge Runtime**
   - Some API routes use edge runtime for better performance
   - Service Worker for offline capability

### 🟡 Performance Improvements Needed

1. **Bundle Size Analysis**
   - Consider running `next build --analyze` to identify large bundles
   - Evaluate if all dependencies are necessary

2. **Image Optimization**
   - Remote patterns allow broad access to picsum.photos and unsplash
   - Consider restricting to specific paths

3. **Font Loading**
   - Local fonts (Equinox) loaded - good for performance
   - Consider font subsetting if files are large

---

## 📋 Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|---------|-------|--------|--------|
| **P0** | Fix dependency vulnerabilities | Medium | High |
| **P0** | Sanitize dangerouslySetInnerHTML | Low | High |
| **P1** | Improve error message handling | Low | Medium |
| **P1** | Harden Redis error handling | Low | Medium |
| **P1** | Require service role key in production | Low | High |
| **P2** | Tighten CSP policy | Medium | Medium |
| **P2** | Normalize email comparisons | Low | Low |
| **P3** | Bundle size analysis | Medium | Medium |

---

## 🔧 Immediate Action Items

### 1. Fix Dependencies (Run Today)
```bash
npm audit fix
# Review breaking changes
npm audit fix --force
```

### 2. Install DOMPurify for XSS Protection
```bash
npm install dompurify @types/dompurify
```

### 3. Update CSP in middleware.ts
Remove `'unsafe-inline'` and `'unsafe-eval'` where possible

### 4. Add Environment Variable Validation
Add startup check for required env vars in production

---

## 📊 Security Checklist

- [x] Authentication implemented (Supabase Auth)
- [x] Authorization checks (RLS + admin email)
- [x] Input validation (isValidTextInput)
- [x] SQL injection protection (parameterized queries)
- [x] XSS protection (partial - needs DOMPurify)
- [x] CSRF protection (Supabase handles this)
- [x] Rate limiting (database-backed)
- [x] Security headers (CSP, HSTS, etc.)
- [x] API key management (server-side)
- [ ] Dependency vulnerabilities (needs fixing)
- [ ] Error message sanitization (partial)
- [ ] Logging and monitoring (basic console logging)

---

## 📊 Performance Checklist

- [x] Caching implemented (Redis)
- [x] Database query optimization
- [x] Pagination
- [x] Dynamic imports
- [x] Image optimization
- [x] Font optimization
- [ ] Bundle size analysis
- [ ] Performance monitoring
- [ ] CDN configuration
- [ ] Service Worker optimization

---

## 🎯 Conclusion

The Arquiv application has a solid security foundation with proper authentication, input validation, and rate limiting. The recent addition of Redis caching significantly improves performance. However, **36 dependency vulnerabilities** require immediate attention, and XSS protection needs hardening with DOMPurify.

**Key Takeaways:**
1. Fix dependency vulnerabilities immediately
2. Add DOMPurify for all HTML rendering
3. Improve error message handling for production
4. Consider making service role key required in production
5. Perform bundle size analysis

**Estimated Effort to Address All Issues:** 2-3 days

---

## 📝 Audit Methodology

This audit was performed by:
- Manual code review of TypeScript/React files
- Dependency vulnerability scanning with `npm audit`
- Security header analysis
- Input/output validation review
- Database query pattern analysis
- Caching strategy evaluation

**Audit Date:** June 25, 2026  
**Auditor:** Cascade AI Assistant  
**Next Recommended Audit:** After dependency fixes are deployed
