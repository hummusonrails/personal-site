import { test, expect } from '@playwright/test';

test.describe('MobileNav JavaScript Logic', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('initMobileNav Function', () => {
    test('should initialize all required elements', async ({ page }) => {
      const elements = await page.evaluate(() => {
        const toggleButton = document.getElementById('mobileMenuToggle');
        const closeButton = document.getElementById('mobileMenuClose');
        const menuContainer = document.getElementById('mobileMenuContainer');
        const navLinks = document.querySelectorAll('.mobile-nav-link');

        return {
          hasToggleButton: !!toggleButton,
          hasCloseButton: !!closeButton,
          hasMenuContainer: !!menuContainer,
          navLinksCount: navLinks.length,
        };
      });

      expect(elements.hasToggleButton).toBe(true);
      expect(elements.hasCloseButton).toBe(true);
      expect(elements.hasMenuContainer).toBe(true);
      expect(elements.navLinksCount).toBeGreaterThan(0);
    });

    test('should reset menu state on initialization', async ({ page }) => {
      const initialState = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        const toggleButton = document.getElementById('mobileMenuToggle');

        return {
          hasTranslateXFull: menuContainer?.classList.contains('translate-x-full'),
          hasTranslateX0: menuContainer?.classList.contains('translate-x-0'),
          ariaHidden: menuContainer?.getAttribute('aria-hidden'),
          ariaExpanded: toggleButton?.getAttribute('aria-expanded'),
          bodyOverflow: document.body.style.overflow,
        };
      });

      expect(initialState.hasTranslateXFull).toBe(true);
      expect(initialState.hasTranslateX0).toBe(false);
      expect(initialState.ariaHidden).toBe('true');
      expect(initialState.ariaExpanded).toBe('false');
      expect(initialState.bodyOverflow).toBe('');
    });
  });

  test.describe('openMenu Function', () => {
    test('should update all required classes and attributes', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');

      await toggleButton.click();

      const openState = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        const toggleButton = document.getElementById('mobileMenuToggle');

        return {
          hasTranslateX0: menuContainer?.classList.contains('translate-x-0'),
          hasTranslateXFull: menuContainer?.classList.contains('translate-x-full'),
          ariaHidden: menuContainer?.getAttribute('aria-hidden'),
          ariaExpanded: toggleButton?.getAttribute('aria-expanded'),
          bodyOverflow: document.body.style.overflow,
        };
      });

      expect(openState.hasTranslateX0).toBe(true);
      expect(openState.hasTranslateXFull).toBe(false);
      expect(openState.ariaHidden).toBe('false');
      expect(openState.ariaExpanded).toBe('true');
      expect(openState.bodyOverflow).toBe('hidden');
    });

    test('should store last focused element', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');

      await toggleButton.focus();
      const elementBeforeFocus = await page.evaluate(() => document.activeElement?.id);

      await toggleButton.click();
      await page.waitForTimeout(150);

      // The function should have stored the last focused element
      // We can't directly access the variable, but we can verify behavior
      const closeButton = page.locator('#mobileMenuClose');

      await closeButton.click();
      await page.waitForTimeout(50);

      const elementAfterClose = await page.evaluate(() => document.activeElement?.id);
      expect(elementAfterClose).toBe(elementBeforeFocus);
    });

    test('should populate focusable elements array', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');

      await toggleButton.click();
      await page.waitForTimeout(150);

      // Verify that focusable elements are properly identified
      const focusableCount = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        if (!menuContainer) return 0;
        const elements = menuContainer.querySelectorAll(
          'button, a, [tabindex]:not([tabindex="-1"])'
        );
        return elements.length;
      });

      expect(focusableCount).toBeGreaterThan(0);
    });
  });

  test.describe('closeMenu Function', () => {
    test('should restore all initial states', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');

      // Open then close
      await toggleButton.click();
      await toggleButton.click();

      const closedState = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        const toggleButton = document.getElementById('mobileMenuToggle');

        return {
          hasTranslateXFull: menuContainer?.classList.contains('translate-x-full'),
          hasTranslateX0: menuContainer?.classList.contains('translate-x-0'),
          ariaHidden: menuContainer?.getAttribute('aria-hidden'),
          ariaExpanded: toggleButton?.getAttribute('aria-expanded'),
          bodyOverflow: document.body.style.overflow,
        };
      });

      expect(closedState.hasTranslateXFull).toBe(true);
      expect(closedState.hasTranslateX0).toBe(false);
      expect(closedState.ariaHidden).toBe('true');
      expect(closedState.ariaExpanded).toBe('false');
      expect(closedState.bodyOverflow).toBe('');
    });
  });

  test.describe('handleKeyDown Function', () => {
    test('should close menu on Escape key only when open', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');

      // Press Escape when closed (should do nothing)
      await page.keyboard.press('Escape');
      await expect(menuContainer).toHaveClass(/translate-x-full/);

      // Open menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      // Press Escape when open (should close)
      await page.keyboard.press('Escape');
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should handle Tab key for forward focus trap', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');

      await toggleButton.click();
      await page.waitForTimeout(150);

      // Get focusable elements count
      const focusableCount = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        if (!menuContainer) return 0;
        return menuContainer.querySelectorAll(
          'button, a, [tabindex]:not([tabindex="-1"])'
        ).length;
      });

      // Tab through all elements and one more
      for (let i = 0; i <= focusableCount; i++) {
        await page.keyboard.press('Tab');
      }

      // Should have wrapped back to first element
      const isInMenu = await page.evaluate(() => {
        const container = document.getElementById('mobileMenuContainer');
        return container?.contains(document.activeElement) ?? false;
      });

      expect(isInMenu).toBe(true);
    });

    test('should handle Shift+Tab key for backward focus trap', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');

      await toggleButton.click();
      await page.waitForTimeout(150);

      // Close button should be focused
      await expect(closeButton).toBeFocused();

      // Shift+Tab should wrap to last element
      await page.keyboard.press('Shift+Tab');

      const isInMenu = await page.evaluate(() => {
        const container = document.getElementById('mobileMenuContainer');
        return container?.contains(document.activeElement) ?? false;
      });

      expect(isInMenu).toBe(true);
    });

    test('should not trap focus when menu is closed', async ({ page }) => {
      // Tab key should work normally when menu is closed
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should have moved to elements on the page
      const focusedElementId = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElementId).not.toBe('');
    });
  });

  test.describe('Event Listeners', () => {
    test('should attach click listener to toggle button', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');

      // Click should toggle menu
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should attach click listener to close button', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const closeButton = page.locator('#mobileMenuClose');
      const menuContainer = page.locator('#mobileMenuContainer');

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      await closeButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });

    test('should attach click listeners to all navigation links', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');
      const navLinks = page.locator('.mobile-nav-link');

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      const count = await navLinks.count();

      if (count > 0) {
        const homeLink = navLinks.first();
        await homeLink.click();

        // Wait for navigation
        await page.waitForLoadState('networkidle');

        // Menu should be closed
        await expect(menuContainer).toHaveClass(/translate-x-full/);
      }
    });

    test('should attach global keydown listener', async ({ page }) => {
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      // Press Escape anywhere on the page
      await page.keyboard.press('Escape');

      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });
  });

  test.describe('Astro Integration', () => {
    test('should listen for DOMContentLoaded event', async ({ page }) => {
      // Verify initialization happened on DOMContentLoaded
      const isInitialized = await page.evaluate(() => {
        const menuContainer = document.getElementById('mobileMenuContainer');
        return menuContainer?.hasAttribute('data-initialized') ?? false;
      });

      expect(isInitialized).toBe(true);
    });

    test('should listen for astro:page-load event', async ({ page }) => {
      // Trigger astro:page-load event
      await page.evaluate(() => {
        document.dispatchEvent(new Event('astro:page-load'));
      });

      // Component should still work
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);
    });

    test('should prevent duplicate initialization', async ({ page }) => {
      // Trigger multiple initializations
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) {
          document.dispatchEvent(new Event('astro:page-load'));
        }
      });

      // Component should still work correctly (not have duplicate listeners)
      const toggleButton = page.locator('#mobileMenuToggle');
      const menuContainer = page.locator('#mobileMenuContainer');

      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-0/);

      // One more click should close it
      await toggleButton.click();
      await expect(menuContainer).toHaveClass(/translate-x-full/);
    });
  });
});