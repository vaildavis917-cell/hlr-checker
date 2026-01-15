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
