---
name: Chords Lab
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#444653'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#757685'
  outline-variant: '#c5c5d5'
  surface-tint: '#3c54c4'
  primary: '#3951c1'
  on-primary: '#ffffff'
  primary-container: '#546bdc'
  on-primary-container: '#fffbff'
  inverse-primary: '#b9c3ff'
  secondary: '#8e4d20'
  on-secondary: '#ffffff'
  secondary-container: '#fda872'
  on-secondary-container: '#773b0e'
  tertiary: '#0d6a3e'
  on-tertiary: '#ffffff'
  tertiary-container: '#308355'
  on-tertiary-container: '#f6fff5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dee1ff'
  primary-fixed-dim: '#b9c3ff'
  on-primary-fixed: '#001258'
  on-primary-fixed-variant: '#1f3aab'
  secondary-fixed: '#ffdbc8'
  secondary-fixed-dim: '#ffb68a'
  on-secondary-fixed: '#321300'
  on-secondary-fixed-variant: '#713709'
  tertiary-fixed: '#a1f5bc'
  tertiary-fixed-dim: '#85d8a2'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522d'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Atkinson Hyperlegible Next
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  mono-note:
    fontFamily: jetbrainsMono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1200px
---

## Brand & Style

The design system is centered on the concept of "Tactile Minimalism"—a philosophy that blends the cognitive ease of minimalism with the physical satisfaction of tangible instruments. Designed specifically for ADHD users, the interface prioritizes a reduced cognitive load by eliminating visual noise while providing high-quality sensory feedback.

The aesthetic utilizes "soft-surface" depth, where UI elements appear to be gently pressed into or raised from a matte, silk-textured background. The emotional response is one of calm focus, rhythmic stability, and low-anxiety exploration. Interactions should feel heavy and dampened, like the keys of a high-end electric piano, rather than clicky or sharp.

## Colors

The palette uses a high-key, "Airy Light" foundation to minimize visual vibration.

- **Core Neutrals:** Pure white (#FFFFFF) is used for the canvas, while the primary surface (#F8F9FA) creates subtle separation for container elements.
- **Functional Pastels:** Color-coding is essential for music theory mnemonic mapping. Primary (Blue) denotes melodic elements, Secondary (Orange) denotes rhythmic structures, and Tertiary (Green) is reserved for harmonic resolution.
- **Intensity:** Colors are used at a 20% saturation level for backgrounds and 100% saturation only for active "hit states" or focused notes to prevent overstimulation.

## Typography

Typography focuses on "disambiguation"—ensuring that characters are instantly recognizable to reduce reading fatigue. **Atkinson Hyperlegible Next** is the workhorse for all instructional and body content, chosen for its distinct character shapes. **Plus Jakarta Sans** provides a softer, more modern geometric feel for headings to maintain a friendly, non-academic atmosphere.

**Whitespace Rule:** Line height is intentionally generous (1.6x) to prevent "text crowding," a common distraction point for ADHD users.

## Layout & Spacing

This design system employs a **Fixed Content Grid** with expansive outer margins to funnel the user’s eye toward the center of the screen.

- **The "Breathe" Principle:** Every major module must be separated by at least 64px of whitespace to ensure no two theory concepts compete for attention.
- **Micro-spacing:** Uses an 8px linear scale. Internal padding within cards should be a minimum of 32px (4 units) to maintain the "Tactile" feel.
- **Mobile Adaption:** On mobile, the grid collapses to a single column, and margins reduce to 16px, but vertical spacing between elements remains high to facilitate easy thumb-scrolling and tapping.

## Elevation & Depth

Depth in this design system is achieved through **Soft Tonal Layering** and **Dual-Light Shadows**.

- **Surface Elevation:** Instead of traditional drop shadows, use "Inner Glows" and very soft, large-radius ambient shadows (Blur: 40px, Opacity: 4%, Color: #000 tinted with Primary Blue).
- **The "Press" Effect:** Interactive elements should feel like they physically depress into the background when clicked (transitioning from a soft outer shadow to a subtle inner shadow).
- **Background Blurs:** Use 20px Backdrop Filters on modal overlays to maintain the "Flow" state by keeping the underlying workspace visible but illegible.

## Shapes

The shape language is "Organic Geometric."

- **Main Radius:** A consistent 16px (1rem) radius is applied to all cards and containers to eliminate "sharp" visual triggers.
- **Interactive Radius:** Buttons and input fields use a slightly more aggressive 12px radius.
- **The Note Icon:** Musical notes and theory tokens use a 100% "Pill" shape to mimic the smooth feel of a polished stone or a high-end MIDI controller pad.

## Components

### Buttons & Inputs

- **Tactile Buttons:** Should have a 2px bottom border that is slightly darker than the button face, simulating physical thickness. On hover, the border disappears as the button "sinks" into the page.
- **Soft Inputs:** Fields are defined by a 1px solid border in a soft gray (#E9ECEF). Upon focus, the border thickens to 2px and glows with a soft primary tint.

### Theory Cards

- **The "Focus" Card:** Used for active lessons. These have a white background, a 16px corner radius, and a "Floating" shadow. All other peripheral information should use "Flat" cards (no shadow, light gray background) to recede visually.

### Feedback & Transitions

- **Haptic Animation:** All transitions should use `cubic-bezier(0.34, 1.56, 0.64, 1)` (Back Out) to create a subtle "bounce" that mimics physical elasticity.
- **Progress Indicators:** Use thick, rounded-cap bars. Avoid thin lines which can be visually "lost."
