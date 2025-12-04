# NestEgg TODO List

**Last Updated:** 2025-11-26

This document tracks all outstanding tasks, improvements, and known issues for the NestEgg project. This list should be reviewed and updated regularly by Claude Code sessions as work progresses or new issues are identified.

---

## 🔥 Critical Priority

### UI/UX - Modals
- [ ] **Get all modals working and looking really clean**
  - [ ] Audit all modal components in `/frontend/components/modals/`
  - [ ] Ensure consistent styling across all modals
  - [ ] Fix any broken modal interactions (close, submit, validation)
  - [ ] Improve modal animations and transitions
  - [ ] Ensure proper focus management and keyboard navigation
  - [ ] Test modal behavior on mobile devices

- [ ] **Validate modal needs backend work**
  - [ ] Implement backend endpoint for validation data
  - [ ] Add proper error handling and validation
  - [ ] Connect frontend validation modal to backend
  - [ ] Test end-to-end validation flow

### Security
- [ ] **Comprehensive security review**
  - [ ] Review all API endpoints for authorization checks
  - [ ] Audit SQL queries for injection vulnerabilities
  - [ ] Review file upload handling (if any)
  - [ ] Check CORS configuration
  - [ ] Review JWT token handling and expiration
  - [ ] Audit third-party dependencies for known vulnerabilities
  - [ ] Review rate limiting implementation
  - [ ] Check for XSS vulnerabilities in user-generated content
  - [ ] Review error messages (don't leak sensitive info)
  - [ ] Implement security headers (CSP, HSTS, etc.)
  - [ ] Review Clerk integration security best practices

### User Onboarding Flow
- [ ] **Review and polish login/signup path**
  - [ ] Test complete signup flow from landing to first use
  - [ ] Test login flow and error states
  - [ ] Ensure smooth onboarding for new users
  - [ ] Add upgrade banners where appropriate
  - [ ] Implement feature discovery for new users
  - [ ] Add tooltips or guided tour for first-time users
  - [ ] Test password reset flow
  - [ ] Review and improve error messages

---

## 🚀 High Priority

### Code Quality
- [ ] **Clean up old/unused code**
  - [ ] Remove deprecated components
  - [ ] Clean up unused imports
  - [ ] Remove commented-out code blocks
  - [ ] Consolidate duplicate utility functions
  - [ ] Remove old test files (test-clerk-*.js)
  - [ ] Archive or remove unused API endpoints

- [ ] **Remove debug logging for production**
  - [ ] Remove console.log statements from frontend
  - [ ] Review backend logging levels
  - [ ] Implement proper logging strategy (info, warn, error)
  - [ ] Ensure no sensitive data in logs
  - [ ] Configure log retention policies

### Testing
- [ ] **Implement testing framework**
  - [ ] Set up pytest for backend
  - [ ] Add pytest-asyncio for async tests
  - [ ] Set up Jest and React Testing Library for frontend
  - [ ] Add Playwright for E2E testing
  - [ ] Write tests for critical paths (authentication, portfolio calculations)
  - [ ] Add tests for API endpoints
  - [ ] Add tests for data hooks
  - [ ] Set up CI/CD testing pipeline
  - [ ] Implement test coverage reporting
  - [ ] Target 70%+ code coverage

### Performance
- [ ] **Performance optimization**
  - [ ] Audit and optimize bundle size
  - [ ] Implement code splitting for large pages
  - [ ] Optimize image loading and formats
  - [ ] Review and optimize database queries
  - [ ] Implement proper caching strategies
  - [ ] Add loading skeletons for better perceived performance
  - [ ] Optimize re-renders in React components
  - [ ] Review and optimize DataStore update patterns
  - [ ] Add performance monitoring (Web Vitals)

### Data & State Management
- [ ] **DataStore improvements**
  - [ ] Review staleness tracking logic
  - [ ] Optimize refetch behavior
  - [ ] Add optimistic updates for mutations
  - [ ] Improve error recovery mechanisms
  - [ ] Add retry logic for failed requests
  - [ ] Implement undo/redo for critical operations

---

## 📋 Medium Priority

### Documentation
- [ ] **Improve documentation**
  - [ ] Generate API documentation (OpenAPI/Swagger)
  - [ ] Document all DataStore hooks with examples
  - [ ] Create component library documentation
  - [ ] Document deployment procedures
  - [ ] Add architecture diagrams
  - [ ] Document database schema in detail
  - [ ] Create troubleshooting guide
  - [ ] Document environment variables with examples

### Accessibility
- [ ] **Accessibility improvements**
  - [ ] Add ARIA labels to all interactive elements
  - [ ] Ensure keyboard navigation works everywhere
  - [ ] Test with screen readers (NVDA, JAWS, VoiceOver)
  - [ ] Ensure sufficient color contrast ratios
  - [ ] Add skip navigation links
  - [ ] Ensure all images have alt text
  - [ ] Test and fix focus indicators
  - [ ] Ensure forms are properly labeled

### Mobile Experience
- [ ] **Mobile responsiveness**
  - [ ] Audit all pages on mobile devices
  - [ ] Fix any layout issues on small screens
  - [ ] Optimize touch targets (min 44x44px)
  - [ ] Test on various devices (iOS, Android)
  - [ ] Optimize for slow network conditions
  - [ ] Consider implementing PWA features

### User Experience
- [ ] **UX improvements**
  - [ ] Add loading states to all async operations
  - [ ] Design and implement empty states (command-center.js done, others pending)
  - [ ] Improve error messages and error states
  - [ ] Add success notifications for user actions
  - [ ] Implement confirmation dialogs for destructive actions
  - [ ] Add undo functionality for accidental deletions
  - [ ] Improve data visualization (charts, graphs)
  - [ ] Add data export functionality (CSV, PDF)

### Error Handling
- [ ] **Comprehensive error handling**
  - [ ] Implement React error boundaries
  - [ ] Add global error handling for API calls
  - [ ] Improve error logging and reporting
  - [ ] Add user-friendly error messages
  - [ ] Implement error recovery strategies
  - [ ] Add Sentry or similar error tracking service

### Data Validation
- [ ] **Input validation**
  - [ ] Audit frontend form validation
  - [ ] Audit backend request validation
  - [ ] Add proper error messages for validation failures
  - [ ] Implement client-side validation for better UX
  - [ ] Add server-side validation for security
  - [ ] Validate file uploads (if any)

---

## 🔮 Future Enhancements

### Features
- [ ] **Analytics and monitoring**
  - [ ] Implement user analytics (privacy-focused)
  - [ ] Add application performance monitoring
  - [ ] Set up error tracking and alerting
  - [ ] Monitor API usage and rate limits
  - [ ] Track feature usage metrics

- [ ] **Feature flags**
  - [ ] Implement feature flag system
  - [ ] Use for gradual feature rollouts
  - [ ] Enable A/B testing capabilities

- [ ] **Data & Backup**
  - [ ] Implement data backup strategy
  - [ ] Add data export for users
  - [ ] Implement data import from competitors
  - [ ] Add bulk operations for positions/accounts
  - [ ] Implement data versioning

- [ ] **Notifications**
  - [ ] Email notifications for important events
  - [ ] In-app notification system
  - [ ] Portfolio alerts (price changes, goals reached)
  - [ ] Customizable notification preferences

- [ ] **Advanced Features**
  - [ ] Implement portfolio rebalancing suggestions
  - [ ] Add tax loss harvesting insights
  - [ ] Implement scenario planning tools
  - [ ] Add retirement calculator
  - [ ] Implement goal tracking with progress
  - [ ] Add investment recommendations (educational)

### Platform
- [ ] **Internationalization**
  - [ ] Set up i18n framework
  - [ ] Translate UI strings
  - [ ] Support multiple currencies
  - [ ] Handle date/number formatting by locale

- [ ] **Browser compatibility**
  - [ ] Test on Chrome, Firefox, Safari, Edge
  - [ ] Add polyfills if needed
  - [ ] Document minimum browser versions

- [ ] **SEO optimization**
  - [ ] Add meta tags to all pages
  - [ ] Implement structured data (JSON-LD)
  - [ ] Create sitemap
  - [ ] Add robots.txt
  - [ ] Optimize for Core Web Vitals

---

## 🐛 Known Bugs

*Add bugs here as they are discovered*

### Frontend
- [ ] **Duplicate CSS animation definition** - `@keyframes fadeIn` is defined twice in `globals.css` (lines 299-302 and 901-904)
- [ ] **Z-index fragility** - Multiple `!important` z-index overrides in `globals.css` (lines 933-946, 1005-1015) indicate structural issues
- [ ] **Inconsistent modal rendering** - Liabilities page (`liabilities.js:234-260, 714-742`) renders modals inline instead of using shared Modal components
- [ ] **Sidebar indentation bug** - `getInitials` function has inconsistent indentation (`sidebar.js:163-167`)

### Backend
- [ ] _(No known bugs at this time)_

### Integration
- [ ] _(No known bugs at this time)_

---

## 📝 Technical Debt

- [ ] **Database migrations**
  - [ ] Implement proper migration strategy
  - [ ] Document migration procedures
  - [ ] Add rollback capabilities

- [ ] **Dependency management**
  - [ ] Audit and update frontend dependencies
  - [ ] Audit and update backend dependencies
  - [ ] Set up Dependabot for automatic updates
  - [ ] Review and remove unused dependencies

- [ ] **Code organization**
  - [ ] Refactor large components (command-center.js)
  - [ ] Standardize component patterns
  - [ ] Create reusable component library
  - [ ] Organize utility functions better
  - [ ] Consolidate API method files

- [ ] **Configuration management**
  - [ ] Centralize configuration
  - [ ] Document all environment variables
  - [ ] Add config validation on startup
  - [ ] Use configuration management service

---

## 🔒 Compliance & Legal

- [ ] **Privacy & compliance**
  - [ ] Create privacy policy
  - [ ] Create terms of service
  - [ ] Implement GDPR compliance (if applicable)
  - [ ] Add cookie consent (if using cookies)
  - [ ] Document data retention policies
  - [ ] Implement data deletion workflow

- [ ] **Financial compliance**
  - [ ] Review financial data handling regulations
  - [ ] Add disclaimers (not financial advice)
  - [ ] Document data sources and accuracy limitations

---

## 📊 Monitoring & Ops

- [ ] **Production readiness**
  - [ ] Set up production monitoring
  - [ ] Configure alerts for critical errors
  - [ ] Implement health check endpoints
  - [ ] Set up uptime monitoring
  - [ ] Configure log aggregation
  - [ ] Set up performance monitoring
  - [ ] Create runbook for common issues

- [ ] **DevOps**
  - [ ] Document deployment process
  - [ ] Set up staging environment
  - [ ] Implement blue-green deployment
  - [ ] Add database backup automation
  - [ ] Create disaster recovery plan

---

## 🎨 Design System

- [ ] **Component standardization**
  - [ ] Create design system documentation
  - [ ] Standardize button styles and variants
  - [ ] Standardize form elements
  - [ ] Standardize colors and spacing
  - [ ] Create typography scale
  - [ ] Document animation patterns

- [ ] **Dark/light theme**
  - [ ] Ensure consistency across all components
  - [ ] Add theme toggle (if not exists)
  - [ ] Test all pages in both themes

---

## 💡 Ideas for Consideration

*Items that need discussion/planning before committing to implementation*

- [ ] Consider implementing real-time portfolio updates
- [ ] Explore integrations with Plaid or similar services
- [ ] Consider mobile app development (React Native)
- [ ] Evaluate AI-powered insights and recommendations
- [ ] Consider multi-user/family account support
- [ ] Explore portfolio sharing features
- [ ] Consider implementing recurring transactions
- [ ] Evaluate implementing budgeting features
- [ ] Consider adding portfolio benchmarking

---

## 📝 How to Use This List

### For Claude Code Sessions:
1. **Review this list at the start of each session** to understand current priorities
2. **Update checkboxes** as tasks are completed
3. **Add new items** as bugs or improvements are discovered
4. **Update the "Last Updated" date** at the top when making changes
5. **Add context or notes** under items when helpful
6. **Move completed items** to a "Completed" section at the bottom (optional)
7. **Reference this list in CLAUDE.md** so future sessions know to check it

### Priority Levels:
- **🔥 Critical**: Must be done before production launch
- **🚀 High**: Important for product quality and user experience
- **📋 Medium**: Should be done but not blocking
- **🔮 Future**: Nice to have, plan for later phases

### Adding Bugs:
When a bug is discovered, add it to the "Known Bugs" section with:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Related files/components
- Priority level

---

## ✅ Completed Tasks

*Move completed items here to track progress while keeping the main list focused*

### 2025-11-26: Full UI Review
- [x] Reviewed all main pages (portfolio, accounts, positions, liabilities)
- [x] Reviewed navigation components (sidebar, navbar)
- [x] Reviewed modal components and patterns
- [x] Analyzed styling consistency and design patterns
- [x] Identified UI issues and documented in Known Bugs section
- [x] **Assessment: B+ Grade** - Solid professional UI with good architectural decisions
- Key findings:
  - Excellent DataStore pattern and custom hooks
  - Consistent Tailwind + Framer Motion usage
  - Professional animations and loading states
  - Issues: z-index management, modal rendering inconsistency, duplicate CSS
  - Recommendations: Create z-index scale, consolidate modal patterns, audit light mode styles

### 2025-11-25: QuickStartModalV2 - Complete Rebuild
- [x] Created new modular architecture in `/frontend/components/modals/quickstart/`
- [x] Built unified reducer with all actions (state/reducer.js)
- [x] Created reusable components:
  - StatusBadge - Status indicators with animations
  - StatsBar - Summary statistics display
  - SearchableInput - Ticker/symbol/institution search with dropdown
  - DataTable - Inline-editable table with keyboard navigation
  - CollapsibleSection - Expandable sections for position types
- [x] Built custom hooks:
  - useSecuritySearch - Debounced search + price hydration
  - useBulkSubmit - Submission with progress tracking
  - useLocalPersistence - Draft auto-save/restore
- [x] Built view components:
  - WelcomeView - Entry point with portfolio summary
  - AccountsView - Account entry with inline editing
  - PositionsView - 5 asset types with collapsible sections
  - LiabilitiesView - Liability entry with type-specific fields
  - ImportView - Excel/CSV import with account mapping
  - SuccessView - Animated completion summary
- [x] Features: Framer Motion animations, keyboard shortcuts, real-time validation
- [x] Files: ~15 new files, ~3500 lines of clean, modular code
- Note: Original modals (QuickStartModal.js, AddQuickPositionModal.js) preserved for reference

---

**Note:** This is a living document. Keep it updated as the project evolves!
