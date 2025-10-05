# Mobile Navigation Tests

This directory contains comprehensive end-to-end tests for the MobileNav.astro component using Playwright.

## Test Coverage

The test suite covers:

1. **Initial State** - Verifies proper rendering and ARIA attributes
2. **Opening Menu** - Tests menu open functionality and focus management
3. **Closing Menu** - Tests all ways to close the menu (button, Escape, navigation)
4. **Focus Management** - Tests focus trap and keyboard navigation
5. **Accessibility** - Validates ARIA attributes and semantic HTML
6. **Multiple Initializations** - Tests handling of repeated initialization
7. **Edge Cases** - Tests rapid clicks, missing elements, etc.
8. **Visual Regression** - Tests CSS and animations
9. **Mobile-specific** - Tests on mobile viewports and touch events
10. **Integration** - Tests interaction with page navigation
11. **JavaScript Logic** - Tests internal functions and event handlers

## Running Tests

```bash
# Run all tests
npm test

# Run with UI mode (interactive)
npm run test:ui

# Run in headed mode (see browser)
npm run test:headed

# Debug tests
npm run test:debug

# Run only mobile tests
npm run test:mobile

# Show test report
npm run test:report
```

## Test Structure

- `mobile-nav.spec.ts` - Main component behavior tests
- `mobile-nav-logic.spec.ts` - JavaScript function and logic tests

## Requirements

The tests require:
- Node.js 18+ or 20+
- A running development server (started automatically by Playwright)
- Playwright browsers (installed via `npx playwright install`)

## CI/CD Integration

These tests are configured to run in CI environments with:
- Automatic retry on failure
- Parallel execution disabled in CI
- HTML report generation

## Accessibility Testing

The test suite includes specific tests for:
- ARIA attributes
- Keyboard navigation
- Focus management
- Screen reader compatibility
- Touch device support