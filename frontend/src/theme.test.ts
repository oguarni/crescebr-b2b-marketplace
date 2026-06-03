import { describe, it, expect } from 'vitest';
import theme from './theme';

describe('theme', () => {
  it('exports a valid MUI theme object', () => {
    expect(theme).toBeDefined();
    expect(theme.palette).toBeDefined();
    expect(theme.typography).toBeDefined();
    expect(theme.breakpoints).toBeDefined();
    expect(theme.components).toBeDefined();
  });

  describe('palette', () => {
    it('defines primary colors (Brand Blue from logo)', () => {
      expect(theme.palette.primary.main).toBe('#0446B7');
      expect(theme.palette.primary.light).toBe('#4F83E8');
      expect(theme.palette.primary.dark).toBe('#03357F');
      expect(theme.palette.primary.contrastText).toBe('#ffffff');
    });

    it('defines secondary colors (Brand Green from logo)', () => {
      expect(theme.palette.secondary.main).toBe('#01945D');
      expect(theme.palette.secondary.light).toBe('#34B97E');
      expect(theme.palette.secondary.dark).toBe('#047048');
      expect(theme.palette.secondary.contrastText).toBe('#ffffff');
    });

    it('defines background and text colors', () => {
      expect(theme.palette.background.default).toBe('#f7f8fa');
      expect(theme.palette.background.paper).toBe('#ffffff');
      expect(theme.palette.text.primary).toBe('#16191f');
      expect(theme.palette.text.secondary).toBe('#5b6470');
    });
  });

  describe('typography', () => {
    it('uses Inter as the primary font family', () => {
      expect(theme.typography.fontFamily).toContain('Inter');
    });

    it('configures heading variants with Inter and bold weights', () => {
      expect(theme.typography.h1.fontFamily).toContain('Inter');
      expect(theme.typography.h1.fontWeight).toBe(700);
      expect(theme.typography.h1.fontSize).toBe('2.5rem');

      expect(theme.typography.h2.fontWeight).toBe(600);
      expect(theme.typography.h3.fontWeight).toBe(600);
      expect(theme.typography.h4.fontWeight).toBe(600);
      expect(theme.typography.h5.fontWeight).toBe(600);
      expect(theme.typography.h6.fontWeight).toBe(600);
    });

    it('configures body variants with Open Sans', () => {
      expect(theme.typography.body1.fontFamily).toContain('Open Sans');
      expect(theme.typography.body2.fontFamily).toContain('Open Sans');
    });

    it('disables uppercase transform on buttons', () => {
      expect(theme.typography.button.textTransform).toBe('none');
      expect(theme.typography.button.fontWeight).toBe(500);
    });
  });

  describe('component overrides', () => {
    it('overrides MuiButton with rounded corners and no uppercase', () => {
      const buttonOverrides = theme.components?.MuiButton?.styleOverrides?.root as Record<
        string,
        unknown
      >;
      expect(buttonOverrides).toBeDefined();
      expect(buttonOverrides.borderRadius).toBe(8);
      expect(buttonOverrides.textTransform).toBe('none');
    });

    it('overrides MuiCard with rounded corners and custom shadow', () => {
      const cardOverrides = theme.components?.MuiCard?.styleOverrides?.root as Record<
        string,
        unknown
      >;
      expect(cardOverrides).toBeDefined();
      expect(cardOverrides.borderRadius).toBe(12);
      expect(cardOverrides.boxShadow).toBe('0 1px 3px rgba(0, 0, 0, 0.1)');
    });

    it('overrides MuiTextField root', () => {
      expect(theme.components?.MuiTextField?.styleOverrides?.root).toBeDefined();
    });
  });

  describe('breakpoints', () => {
    it('defines the standard MUI breakpoint values', () => {
      expect(theme.breakpoints.values.xs).toBe(0);
      expect(theme.breakpoints.values.sm).toBe(600);
      expect(theme.breakpoints.values.md).toBe(900);
      expect(theme.breakpoints.values.lg).toBe(1200);
      expect(theme.breakpoints.values.xl).toBe(1536);
    });
  });
});
