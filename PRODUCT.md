# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who want to plan monthly personal or household budgets, keep category-based allocations, and track shared card expenses. The primary need confirmed in the design brief is to scan balances and financial status quickly on both desktop and mobile.

## Product Purpose

Buddy stores profiles and budgeting data on the user's device. It helps people record monthly income, allocate it across budget categories, review comparisons and reports, and keep a shared credit-card expense ledger with equal splits and settlement tracking.

## Positioning

The product's confirmed mechanism is a local-first monthly budget planner combined with one expense ledger shared across profiles. No comparative market claim has been established.

## Operating Context

- Used in Thai and English on desktop and mobile web.
- Profiles, budgets, categories, and card expenses are stored in the browser on the device.
- Users can export and restore a JSON backup.
- People switch between monthly budget planning, expense tracking, category settings, and reports.

## Capabilities and Constraints

- Multiple profiles with monthly income and category-based budget allocations.
- Shared category settings and ordering, with monthly reports and comparisons.
- One credit-card expense ledger shared across profiles, recording merchants, purchase dates, shared-party counts, each user's share, and a fully-settled state.
- Expenses are shared equally among participants, including the user.
- Thai and English localization and persistent visual preferences.
- Store financial amounts as integer satang and preserve the existing local-data and backup workflows.
- No confirmed external account, synchronization, payment processing, or card-integration capability.

## Brand Commitments

- Product name: Buddy.
- Users can select six visual themes (Buddy Classic, Pit Wall Precision, British Racing Heritage, Telemetry Sprint, Decision Cockpit, and Editorial), each in light or dark mode from one appearance dropdown.
- The in-app brand uses the Figma-authored racing B monogram with theme-aware color; the dedicated square app icon uses the Figma green mark on a dark background.
- English-language UI uses the locally bundled Quicksand font, selected as a close visual match to the supplied specimen; the image did not identify an exact font family. Thai text retains its existing font stack.
- Preserve the Buddy identity and finance-first clarity; do not use official racing-team or driver marks.

## Evidence on Hand

- Working source and UI: `src/`.
- Existing moodboard references: session artifact `buddy-motorsport-moodboards.md`.
- No user-provided customer stories, performance benchmarks, or external brand assets are established.

## Product Principles

- Make balances and settlement status quick to scan.
- Keep budgeting and expenses practical rather than gamified.
- Preserve user control over local data and backups.
- Keep Thai and English workflows consistent.
- Treat motorsport styling as a recognizable visual layer without weakening financial trust.
