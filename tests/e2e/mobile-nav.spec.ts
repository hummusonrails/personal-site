import { test, expect } from '@playwright/test';

test.describe('MobileNav Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test.describe('Initial State', () => {
    test('should render toggle button with correct attributes', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      
      await expect(toggleButton).toBeVisible();
      await expect(toggleButton).toHaveAttribute('aria-label', 'Open Menu');
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      await expect(toggleButton).toHaveAttribute('aria-controls', 'mobileMenuContainer');
    });

    test('should render menu container with correct initial state', async ({ page }) => {
      const menuContainer = page.locator('#mobileMenuContainer');
      
      await expect(menuContainer).toBeAttached();
      await expect(menuContainer).toHaveAttribute('role', 'dialog');
      await expect(menuContainer).toHaveAttribute('aria-modal', 'true');
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'true');
      await expect(menuContainer).toHaveAttribute('aria-labelledby', 'mobileMenuLabel');
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should render close button inside menu', async ({ page }) => {
      const closeButton = page.locator('#mobileMenuClose');
      
      await expect(closeButton).toBeAttached();
      await expect(closeButton).toHaveAttribute('aria-label', 'Close Menu');
    });

    test('should render navigation links', async ({ page }) => {
      const navLinks = page.locator('.mobile-nav-link');
      const count = await navLinks.count();
      
      expect(count).toBeGreaterThan(0);
      
      // Check that all links have proper attributes
      for (let i = 0; i < count; i++) {
        const link = navLinks.nth(i);
        await expect(link).toHaveAttribute('href');
        await expect(link).toHaveClass(/mobile-nav-link/);
      }
    });

    test('should have menu label', async ({ page }) => {
      const menuLabel = page.locator('#mobileMenuLabel');
      
      await expect(menuLabel).toBeAttached();
      await expect(menuLabel).toHaveText('Menu');
    });

    test('should not have body overflow hidden initially', async ({ page }) => {
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('');
    });
  });

  test.describe('Opening Menu', () => {
    test('should open menu when toggle button is clicked', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      await toggleButton.click();
      
      // Check menu state
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      await expect(menuContainer).not.toHaveClass(/translate-x-full/);
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'false');
      
      // Check toggle button state
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      
      // Check body overflow
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('hidden');
    });

    test('should focus close button after opening menu', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      
      await toggleButton.click();
      
      // Wait for focus transition
      await page.waitForTimeout(150);
      
      // Check that close button is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('mobileMenuClose');
    });

    test('should show navigation links with animation', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      const navLinks = page.locator('.mobile-nav-link');
      
      await toggleButton.click();
      
      // Wait for animation
      await page.waitForTimeout(300);
      
      // Check that links are visible and animated
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Check first link's computed styles
      const firstLink = navLinks.first();
      const opacity = await firstLink.evaluate((el) =>
        window.getComputedStyle(el).opacity
      );
      
      // Opacity should be close to 1 after animation
      expect(parseFloat(opacity)).toBeGreaterThan(0.9);
    });
  });

  test.describe('Closing Menu', () => {
    test('should close menu when close button is clicked', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Open menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Close menu
      await closeButton.click();
      
      // Check menu state
      await expect(menuContainer).toHaveClass(/translate-x-full/);
      await expect(menuContainer).not.toHaveClass(/translate-x-0/);
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'true');
      
      // Check toggle button state
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      
      // Check body overflow
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('');
    });

    test('should close menu when Escape key is pressed', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Open menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Check menu state
      await expect(menuContainer).toHaveClass(/translate-x-full/);
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'true');
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    });

    test('should close menu when navigation link is clicked', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      const firstNavLink = page.locator('.mobile-nav-link').first();
      
      // Open menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Click navigation link
      await firstNavLink.click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Menu should be closed after navigation
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should return focus to toggle button after closing', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      
      // Focus toggle button
      await toggleButton.focus();
      
      // Open menu
      await toggleButton.click();
      await page.waitForTimeout(150);
      
      // Close menu
      await closeButton.click();
      
      // Wait for focus transition
      await page.waitForTimeout(50);
      
      // Check that toggle button is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBe('mobileMenuToggle');
    });
  });

  test.describe('Focus Management', () => {
    test('should trap focus within menu when open', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      
      // Open menu
      await toggleButton.click();
      await page.waitForTimeout(150);
      
      // Get all focusable elements
      const focusableElements = await page.evaluate(() => {
        const container = document.getElementById('mobileMenuContainer');
        if (!container) {
          return [];
        }
        const elements = container.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
        return Array.from(elements).map(el => el.id || el.className);
      });
      
      expect(focusableElements.length).toBeGreaterThan(0);
      
      // Press Tab multiple times to cycle through elements
      for (let i = 0; i < focusableElements.length + 2; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Focus should still be within the menu
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        const container = document.getElementById('mobileMenuContainer');
        return container?.contains(active) ?? false;
      });
      
      expect(focusedElement).toBe(true);
    });

    test('should handle Shift+Tab for reverse focus traversal', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      
      // Open menu
      await toggleButton.click();
      await page.waitForTimeout(150);
      
      // Close button should be focused initially
      await expect(closeButton).toBeFocused();
      
      // Press Shift+Tab to go to last focusable element
      await page.keyboard.press('Shift+Tab');
      
      // Focus should move to last element
      const focusedElement = await page.evaluate(() => {
        const container = document.getElementById('mobileMenuContainer');
        if (!container) {
          return null;
        }
        const elements = container.querySelectorAll('button, a, [tabindex]:not([tabindex="-1"])');
        const lastElement = elements[elements.length - 1];
        return document.activeElement === lastElement;
      });
      
      expect(focusedElement).toBe(true);
    });

    test('should not trap focus when menu is closed', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      
      // Focus toggle button
      await toggleButton.focus();
      
      // Press Tab (should move to next element in page)
      await page.keyboard.press('Tab');
      
      // Focus should have moved away from toggle button
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).not.toBe('mobileMenuToggle');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Initial state
      await expect(toggleButton).toHaveAttribute('aria-label', 'Open Menu');
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      await expect(toggleButton).toHaveAttribute('aria-controls', 'mobileMenuContainer');
      
      await expect(menuContainer).toHaveAttribute('role', 'dialog');
      await expect(menuContainer).toHaveAttribute('aria-modal', 'true');
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'true');
      await expect(menuContainer).toHaveAttribute('aria-labelledby', 'mobileMenuLabel');
      
      // Open menu
      await toggleButton.click();
      
      // Updated state
      await expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'false');
    });

    test('should have navigation landmark with label', async ({ page }) => {
      const nav = page.locator('nav[aria-label="Mobile navigation"]');
      
      await expect(nav).toBeAttached();
      await expect(nav).toHaveAttribute('aria-label', 'Mobile navigation');
    });

    test('should have descriptive button labels', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      
      await expect(toggleButton).toHaveAttribute('aria-label', 'Open Menu');
      await expect(closeButton).toHaveAttribute('aria-label', 'Close Menu');
    });
  });

  test.describe('Multiple Initializations', () => {
    test('should handle multiple initializations gracefully', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Trigger initialization multiple times
      await page.evaluate(() => {
        // Simulate astro:page-load event
        document.dispatchEvent(new Event('astro:page-load'));
        document.dispatchEvent(new Event('astro:page-load'));
        document.dispatchEvent(new Event('astro:page-load'));
      });
      
      // Menu should still work correctly
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should have data-initialized attribute after first init', async ({ page }) => {
      const menuContainer = page.locator('#mobileMenuContainer');
      
      const hasAttribute = await menuContainer.evaluate((el) =>
        el.hasAttribute('data-initialized')
      );
      
      expect(hasAttribute).toBe(true);
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle rapid toggle clicks', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Rapidly click toggle button
      await toggleButton.click();
      await toggleButton.click();
      await toggleButton.click();
      await toggleButton.click();
      
      // Wait for animations to settle
      await page.waitForTimeout(400);
      
      // Menu should be in a consistent state
      const isOpen = await menuContainer.evaluate((el) =>
        el.classList.contains('translate-x-0')
      );
      const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
      
      // State should be consistent
      expect(isOpen ? ariaExpanded === 'true' : ariaExpanded === 'false').toBe(true);
    });

    test('should not interfere with Escape key when menu is closed', async ({ page }) => {
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Press Escape when menu is closed
      await page.keyboard.press('Escape');
      
      // Menu should remain closed
      await expect(menuContainer).toHaveClass(/translate-x-full/);
      await expect(menuContainer).toHaveAttribute('aria-hidden', 'true');
    });

    test('should handle missing navigation items gracefully', async ({ page }) => {
      const navLinks = page.locator('.mobile-nav-link');
      const count = await navLinks.count();
      
      // Should have at least one navigation item
      expect(count).toBeGreaterThan(0);
      
      // All links should be valid
      for (let i = 0; i < count; i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should render menu correctly when open', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      
      // Open menu
      await toggleButton.click();
      
      // Wait for animation
      await page.waitForTimeout(400);
      
      // Take screenshot (for visual regression testing if enabled)
      // await expect(page).toHaveScreenshot('mobile-menu-open.png');
      
      // Check that menu is visible
      const menuContainer = page.locator('#mobileMenuContainer');
      await expect(menuContainer).toBeVisible();
    });

    test('should apply correct CSS transitions', async ({ page }) => {
      const menuContainer = page.locator('#mobileMenuContainer');
      
      const transition = await menuContainer.evaluate((el) =>
        window.getComputedStyle(el).transition
      );
      
      // Should have transform transition
      expect(transition).toContain('transform');
    });
  });

  test.describe('Mobile-specific Tests', () => {
    test('should be visible on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const toggleButton = page.locator('#mobileMenuToggle');
      
      // Toggle button should be visible on mobile
      await expect(toggleButton).toBeVisible();
    });

    test('should work correctly on touch devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Tap toggle button
      await toggleButton.tap();
      
      // Menu should open
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Tap close button
      const closeButton = page.locator('#mobileMenuClose');
      await closeButton.tap();
      
      // Menu should close
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });
  });

  test.describe('Integration with Page Navigation', () => {
    test('should close menu after clicking navigation link and navigating', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      
      // Open menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
      
      // Find and click a navigation link
      const aboutLink = page.locator('.mobile-nav-link[href="/about"]').first();
      
      if (await aboutLink.count() > 0) {
        await aboutLink.click();
        
        // Wait for navigation
        await page.waitForLoadState('networkidle');
        
        // Menu should be closed
        await expect(menuContainer).toHaveClass(/translate-x-full/);
      }
    });
  });
});