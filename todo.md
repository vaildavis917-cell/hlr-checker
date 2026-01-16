# HLR Bulk Checker - TODO

## Core Features
- [x] Database schema for API keys, check history, and results
- [x] Secure API key storage and management
- [x] Phone number input via text field (comma/newline separated)
- [x] CSV file upload for phone numbers
- [x] Bulk HLR request processing to Seven.io API
- [x] Results table with: phone, validity, operator, country, roaming, portability
- [x] Progress indicator during batch operations
- [x] CSV export functionality
- [x] Filter results by status, operator, country
- [x] Sort results by any column
- [x] History of previous checks
- [x] View saved results from history

## UI/UX
- [x] Elegant dark theme design
- [x] Dashboard layout with sidebar navigation
- [x] Responsive design for all screen sizes
- [x] Loading states and animations
- [x] Error handling and user feedback

## Admin Panel
- [x] Admin-only user management page
- [x] Create invite codes for new users (admin only)
- [x] View all users list
- [x] Delete user accounts
- [x] Invite-only registration system

## Design Update
- [x] Minimalist light theme design
- [x] Dark theme support with toggle
- [x] Clean white backgrounds with thin lines
- [x] Modern typography and spacing

## Bugs
- [x] Fix: getResults query called with null batchId causing validation error

## Custom Auth System
- [x] Add username and password_hash fields to users table
- [x] Create login endpoint with password verification
- [x] Create admin endpoint to create users with login/password
- [x] Build login page UI
- [x] Update admin panel to create users with credentials
- [x] Remove Manus OAuth dependency from auth flow

## SEO Fixes
- [x] Add H1 and H2 headings to home page
- [x] Set proper page title (30-60 characters)
- [x] Add meta description (50-160 characters)
- [x] Add keywords meta tag

## SEO Fixes - Login Page
- [x] Add H1 and H2 headings to login page
- [x] Set proper page title on login page
- [x] Add meta description for login page

## New Features - Security
- [x] Change password - users can change their own password
- [x] Reset password - admin can reset user password
- [x] Account lockout - block after 5 failed login attempts

## New Features - Limits & Monitoring
- [x] Check limits - restrict HLR requests per user per day/month
- [x] Low balance notification - alert when Seven.io balance is low
- [x] Action logging - record who and when made checks

## New Features - UX Improvements
- [x] Pagination - for large batches (1000+ numbers)
- [x] Re-check numbers - re-verify numbers from history
- [x] Usage statistics - dashboard with check graphs

## UI Restrictions
- [x] Balance visible only to admin users
- [x] Single phone number check (quick check without batch)

## Password Management Fix
- [x] Remove Profile page (users cannot change their own password)
- [x] Only admin can change passwords (for self and other users)
- [x] Remove Profile from sidebar menu for regular users

## Unique Features (New)
- [x] Number Health Score (0-100) - composite score based on validity, portability, roaming, history
- [x] Duplicate Detection - auto-detect duplicates before checking, show count and option to remove
- [x] Cost Calculator - show estimated cost before starting batch
- [x] Export Templates - customizable export with field selection
- [x] Admin can view all users' check history (batches from all users)

## Localization
- [x] Add Russian language support for all UI elements
- [x] Add Health Score filter (low/normal/high) in results table
- [x] Remove 1000 numbers limit - unlimited for all users
- [x] Fix HLR price from €0.02 to €0.01 per number
- [x] Full localization: Russian, Ukrainian, English with language switcher button
- [x] Complete localization - check all pages for untranslated text

## Branding
- [x] Generate and set favicon for the website

## Documentation
- [x] Create user guide with status explanations and usage instructions
- [ ] Add Help/Manual page inside the application with usage guide

## Bug Fixes
- [x] Show Reachable status in results table
- [x] Make results dialog wider to fit all columns
- [ ] BUG: Large batch (2700+ numbers) stops processing - timeout issue
- [x] CRITICAL: Save results immediately after each number check (not at the end)
- [x] Add resume functionality for interrupted batches

## Number Normalization & Validation
- [x] Normalize phone numbers to E.164 format before API call
- [x] Validate format (7-15 digits, no letters)
- [x] Filter out invalid numbers before sending to API

## Caching & Optimization
- [x] Cache results for 24-48 hours - reuse without API call
- [x] Warn about duplicates in history ("This number was checked 2 hours ago")
- [x] Warn if batch has many invalid numbers

## Export
- [x] Export to Excel (XLSX) format

## Resume Functionality
- [x] Backend API for resuming interrupted batches
- [x] UI warning for incomplete batches
- [x] Add "Resume" button in UI for incomplete batches


## Documentation
- [x] Create comprehensive README.md with hero block, features, quickstart
- [x] Add screenshots/visual materials (5 key screens added)
- [x] Document API examples (single/batch/results)
- [x] Add Security section with current measures and roadmap
- [x] Add .env configuration table
- [x] Add Tech Stack section
- [x] Add Roadmap section


## Bug Fixes
- [ ] Fix: History of single HLR lookups not being saved


## Bug Fixes & Improvements
- [x] Add caching for previously checked numbers to avoid duplicate API calls
- [ ] Show cached results indicator in UI
- [x] Fix history not being saved/displayed (single checks now save to DB)

- [x] Add duplicate cleaner tab (no API, client-side only) - Tools page
- [x] Add export filter: valid only / invalid only
- [x] Show user limits (used/total) for users with limits
- [x] Show estimated checks based on balance for users without limits

- [x] Add file upload to Tools page for duplicate cleaning

- [ ] Add visual progress bar for user limits (used/available)
- [ ] Show warning message when limit is exhausted

- [ ] Add visual progress bar for user limits (used/available)
- [ ] Show warning message when limit is exhausted


## UI Redesign
- [ ] Redesign sidebar navigation (Dashboard, HLR Lookup, Batch Checker, Settings, Support)
- [ ] Add Support link to Telegram (https://t.me/toskaqwe1)
- [ ] Create Dashboard page with limits, usage stats, account info
- [ ] Create HLR Lookup page (single check)
- [ ] Create Batch Checker page (bulk check with completed batches table)
- [ ] Move Billing & Usage to admin-only section
- [ ] Add API Key display and Language selector to header
- [ ] Add Help Center link to header

## Help Center
- [x] Create Help Center page with full HLR guide
- [x] Add HLR response codes explanation (GSM codes, status meanings)
- [x] Add service features documentation
- [x] Add translations for Help Center (RU/UK/EN)
- [x] Link Help Center button in header to the page
- [x] Add FAQ/Troubleshooting section with self-help solutions
