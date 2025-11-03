# Security Policy

## Overview

Meet Cute takes security and privacy seriously. This document outlines our security practices, how we protect user data, and how to report security vulnerabilities.

## Security Measures

### 1. Authentication & Authorization

- **OAuth 2.0**: We use Google and Microsoft's official OAuth 2.0 protocols for authentication
- **No Password Storage**: We never see, store, or handle user passwords
- **JWT Tokens**: Secure JSON Web Tokens for session management
- **Token Rotation**: Refresh tokens are securely stored and rotated
- **Scope Limitation**: We only request the minimum required calendar permissions (read-only)

### 2. Data Encryption

- **In Transit**: All data transmitted uses TLS 1.3 encryption
- **At Rest**: Database encryption enabled on Railway PostgreSQL
- **API Keys**: All sensitive credentials stored as environment variables
- **No Plaintext Secrets**: All API keys and tokens are encrypted in the database

### 3. Data Minimization

We only collect and store the absolute minimum data required:

**What We Store:**
- User email (for authentication)
- Meeting titles and times (for scheduling)
- Number of attendees (for context)
- User preferences (tone, alert timing)
- Mind state selections (for pattern analysis)

**What We DON'T Store:**
- Meeting content, notes, or attachments
- Email content
- Contact information beyond user's own email
- Attendee email addresses
- Private calendar details

### 4. API Security

- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Input Validation**: All user inputs are validated and sanitized
- **SQL Injection Prevention**: Using Prisma ORM with parameterized queries
- **XSS Protection**: React's built-in XSS protection + Content Security Policy
- **CORS**: Properly configured Cross-Origin Resource Sharing

### 5. Third-Party Services

We use vetted, enterprise-grade services:

- **OpenAI**: For AI-generated messages (GPT-4)
- **Google Gemini**: Fallback AI provider
- **SendGrid**: Email delivery (SOC 2 Type II certified)
- **Twilio**: SMS delivery (SOC 2 Type II certified)
- **Railway**: Infrastructure (SOC 2 compliant)
- **PostgreSQL**: Database (industry standard)

**Data Sent to AI Providers:**
- Meeting title
- Meeting time and duration
- Number of attendees
- User's selected mind state
- User's tone preference

**Data NOT Sent to AI Providers:**
- Meeting content or notes
- Attendee information
- Email addresses
- Private calendar details

### 6. Access Control

- **Read-Only Calendar Access**: We cannot create, modify, or delete calendar events
- **User Data Isolation**: Each user's data is isolated and cannot be accessed by other users
- **Admin Access**: Minimal admin access, logged and audited
- **Principle of Least Privilege**: Services only have access to what they need

### 7. Infrastructure Security

- **Automated Backups**: Daily database backups with 30-day retention
- **Dependency Updates**: Regular security updates for all dependencies
- **Container Security**: Docker images scanned for vulnerabilities
- **Environment Isolation**: Separate dev, staging, and production environments
- **Secrets Management**: Environment variables managed securely on Railway

## Privacy Practices

### Data Retention

- **Active Users**: Data retained while account is active
- **Inactive Users**: Accounts inactive for 1 year are flagged for deletion
- **Account Deletion**: All user data permanently deleted within 30 days of account deletion
- **Meeting Data**: Old meetings (>90 days) are automatically archived

### User Rights (GDPR/CCPA Compliant)

Users have the right to:

1. **Access**: Request a copy of all their data
2. **Rectification**: Correct inaccurate data
3. **Erasure**: Delete their account and all associated data
4. **Portability**: Export their data in a machine-readable format
5. **Objection**: Opt-out of certain data processing
6. **Revocation**: Revoke calendar access at any time

### Revoking Access

Users can revoke Meet Cute's access to their calendar at any time:

**Google Calendar:**
1. Visit https://myaccount.google.com/permissions
2. Find "Meet Cute"
3. Click "Remove Access"

**Microsoft Outlook:**
1. Visit https://account.microsoft.com/privacy/app-access
2. Find "Meet Cute"
3. Click "Remove"

**Meet Cute Account:**
1. Go to Settings
2. Click "Delete Account"
3. Confirm deletion

## Compliance

- **GDPR**: General Data Protection Regulation (EU)
- **CCPA**: California Consumer Privacy Act
- **SOC 2**: Infrastructure hosted on SOC 2 compliant platforms
- **OAuth 2.0**: Industry-standard authentication protocol

## Security Best Practices

### For Users

1. **Use Strong Passwords**: For your Google/Microsoft account
2. **Enable 2FA**: Two-factor authentication on your calendar account
3. **Review Permissions**: Regularly check which apps have calendar access
4. **Report Suspicious Activity**: Contact us immediately if you notice anything unusual
5. **Keep Browser Updated**: Use the latest version of your browser

### For Developers

1. **Never Commit Secrets**: Use environment variables for all sensitive data
2. **Review Dependencies**: Regularly audit npm packages for vulnerabilities
3. **Follow Least Privilege**: Only request permissions you need
4. **Validate All Inputs**: Never trust user input
5. **Log Security Events**: Monitor for suspicious activity

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

**Email**: security@meetcuteai.com

**Please Include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response Time:**
- Initial response: Within 24 hours
- Status update: Within 72 hours
- Fix deployment: Varies by severity (critical issues within 7 days)

**Responsible Disclosure:**
- Please give us reasonable time to fix the issue before public disclosure
- We will acknowledge your contribution (unless you prefer to remain anonymous)
- We do not currently offer a bug bounty program

## Security Audit Log

### Recent Security Updates

- **2025-11-03**: Comprehensive security documentation added
- **2025-11-01**: Mind state tracking with privacy-preserving pattern analysis
- **2025-10-15**: OAuth 2.0 implementation for Google and Microsoft
- **2025-10-10**: TLS 1.3 encryption enabled
- **2025-10-05**: Database encryption at rest enabled
- **2025-10-01**: Initial security audit completed

## Contact

For security-related questions or concerns:

- **Security Issues**: security@meetcuteai.com
- **Privacy Questions**: privacy@meetcuteai.com
- **General Support**: support@meetcuteai.com

## Acknowledgments

We thank the security community for helping us maintain a secure platform. If you've reported a vulnerability, thank you for your responsible disclosure.

---

**Last Updated**: November 3, 2025  
**Version**: 1.0

