# Design System Documentation

## Overview

This design system provides a distinguished, traditional, and reverent aesthetic for church management software marketing pages. It uses a deep navy blue and gold color palette with elegant typography and sophisticated visual patterns.

## Typography

### Font Stack

- **Headings**: Playfair Display (serif) - Elegant, traditional, reverent
- **Body**: Inter (sans-serif) - Modern, readable, professional
- **Monospace**: Geist Mono - For code and technical content

### Typography Scale

- **H1**: `text-4xl sm:text-5xl lg:text-6xl` - Hero headings
- **H2**: `text-3xl sm:text-4xl` - Section headings
- **H3**: `text-xl` - Subsection headings
- **Body**: `text-base` (default) - Body text
- **Small**: `text-sm` - Secondary text

### Font Weights

- **Bold**: `font-bold` (700) - Main headings
- **Semibold**: `font-semibold` (600) - Subheadings
- **Medium**: `font-medium` (500) - Emphasis
- **Regular**: `font-normal` (400) - Body text

## Color Palette

### Primary Colors (Navy)

**Light Mode:**
- `--navy`: `oklch(0.25 0.08 250)` - Deep navy blue (primary brand color)
- `--navy-light`: `oklch(0.35 0.08 250)` - Hover states
- `--navy-dark`: `oklch(0.18 0.08 250)` - Pressed states

**Dark Mode:**
- `--navy`: `oklch(0.75 0.08 250)` - Lighter navy for dark backgrounds
- `--navy-light`: `oklch(0.80 0.08 250)`
- `--navy-dark`: `oklch(0.65 0.08 250)`

### Accent Colors (Gold)

**Light Mode:**
- `--gold`: `oklch(0.65 0.15 85)` - Rich gold (highlights, CTAs)
- `--gold-light`: `oklch(0.75 0.12 85)` - Subtle accents
- `--gold-dark`: `oklch(0.55 0.15 85)` - Darker gold

**Dark Mode:**
- `--gold`: `oklch(0.80 0.15 85)` - Brighter gold for dark backgrounds
- `--gold-light`: `oklch(0.85 0.12 85)`
- `--gold-dark`: `oklch(0.70 0.15 85)`

### Semantic Colors

- **Primary**: Uses navy (`var(--navy)`)
- **Accent**: Uses gold (`var(--gold)`)
- **Secondary**: Navy blue variant `oklch(0.30 0.10 240)`
- **Muted**: `oklch(0.96 0 0)` (light) / `oklch(0.20 0.05 250)` (dark)
- **Background**: `oklch(0.99 0 0)` (light) / `oklch(0.12 0.05 250)` (dark)
- **Foreground**: `oklch(0.15 0 0)` (light) / `oklch(0.95 0 0)` (dark)

### Usage

```tsx
// Primary (Navy)
<div className="bg-primary text-primary-foreground">...</div>

// Accent (Gold)
<div className="bg-accent text-accent-foreground">...</div>

// Gradients
<div className="bg-gradient-to-r from-primary via-accent to-primary">...</div>
```

## Background Patterns

### Available Patterns

All patterns are available from `@/components/marketing-patterns`:

1. **GridPattern** - Subtle grid overlay
2. **DotPattern** - Fine dot texture
3. **CrossPattern** - Subtle cross motifs (church-appropriate)
4. **BlurOrbs** - Layered blur effects
5. **GradientMesh** - Animated gradient backgrounds
6. **DecorativeCircles** - Elegant circular motifs
7. **DecorativePolygon** - Geometric shapes
8. **ShimmerLine** - Animated gradient lines
9. **OrnamentalBorder** - Decorative borders

### Usage Examples

```tsx
import { GridPattern, DotPattern, BlurOrbs } from "@/components/marketing-patterns";

// Hero section
<section className="relative overflow-hidden">
  <BlurOrbs count={3} />
  <GridPattern />
  <DotPattern />
  {/* Content */}
</section>

// Feature section
<section className="relative">
  <GridPattern />
  <DotPattern />
  {/* Content */}
</section>
```

## Components

### Button Variants

- **default**: Navy background with gold hover accent
- **gold**: Gold background with navy text (for CTAs)
- **outline**: Navy border with gold hover fill
- **ghost**: Transparent with gold accent on hover
- **secondary**: Gold background (alias for gold variant)
- **destructive**: Red for destructive actions
- **link**: Text link with gold hover

### Usage

```tsx
<Button variant="gold">Get Started</Button>
<Button variant="outline">Learn More</Button>
<Button variant="ghost">Sign In</Button>
```

## Animations

### Available Animations

- `animate-float` - Gentle floating movement (6s)
- `animate-float-slow` - Slower floating (8s)
- `animate-float-reverse` - Reverse floating (7s)
- `animate-pulse-slow` - Gentle pulsing (4s)
- `animate-pulse-glow` - Glowing pulse effect (3s)
- `animate-rotate-slow` - Slow rotation (20s)
- `animate-rotate-reverse` - Reverse rotation (25s)
- `animate-shimmer` - Shimmer effect (8s)
- `animate-gradient-shift` - Gradient color shift (3s)
- `animate-fade-in` - Fade in (0.6s)
- `animate-fade-in-up` - Fade in from bottom (0.8s)
- `animate-fade-in-up-delayed` - Delayed fade in (0.8s + 0.2s delay)
- `animate-gold-shimmer` - Gold-specific shimmer
- `animate-gold-glow` - Gold glow effect
- `animate-elegant-scale` - Subtle scale transform (1.02x max)
- `animate-gentle-fade` - Slower fade (1s)

### Usage

```tsx
<div className="animate-fade-in-up">Content</div>
<div className="animate-float-slow">Floating element</div>
<button className="hover:animate-gold-glow">Gold button</button>
```

## Design Tokens

### Spacing

- **Section Padding**: `py-20 sm:py-32` (80px / 128px)
- **Container Padding**: `px-4 sm:px-6 lg:px-8`
- **Gap**: Standard Tailwind scale

### Border Radius

- **Small**: `rounded-sm` (0.375rem / 6px)
- **Medium**: `rounded-md` (0.625rem / 10px) - Default
- **Large**: `rounded-lg` (0.875rem / 14px)
- **Extra Large**: `rounded-xl` (1.25rem / 20px) - Hero cards

### Shadows

- **Subtle**: `shadow-sm` - `0 1px 3px rgba(0,0,0,0.05)`
- **Medium**: `shadow-md` - `0 4px 12px rgba(0,0,0,0.1)`
- **Large**: `shadow-lg` - `0 8px 24px rgba(0,0,0,0.15)`
- **Gold Glow**: Custom - `0 0 20px rgba(gold, 0.3)`

## Best Practices

### Color Usage

1. **Primary (Navy)**: Use for main actions, headings, and primary UI elements
2. **Accent (Gold)**: Use sparingly for CTAs, highlights, and important elements
3. **Maintain Contrast**: Ensure WCAG AA contrast ratios (4.5:1 for text)

### Typography

1. **Headings**: Always use Playfair Display (serif) for h1-h6
2. **Body Text**: Use Inter (sans-serif) for readability
3. **Line Height**: Use default Tailwind line heights (1.5 for body, 1.2 for headings)

### Patterns

1. **Don't Overuse**: Use 1-2 patterns per section maximum
2. **Layer Appropriately**: Background patterns should be subtle (low opacity)
3. **Performance**: Patterns are SVG-based and performant

### Animations

1. **Keep Subtle**: All animations are designed to be subtle and reverent
2. **Don't Overdo**: Use animations sparingly for emphasis
3. **Accessibility**: Respect `prefers-reduced-motion` (can be added)

## Dark Mode

The design system fully supports dark mode. Colors automatically adjust:

- Navy becomes lighter for visibility
- Gold becomes brighter for contrast
- Backgrounds use deep navy tones
- Text becomes light for readability

Dark mode is handled automatically via the `.dark` class on the root element.

## Examples

### Hero Section

```tsx
<section className="relative overflow-hidden py-20 sm:py-32 lg:py-40">
  <BlurOrbs count={3} />
  <GridPattern />
  <DotPattern />
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
      Complete Church Management
      <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
        Made Simple
      </span>
    </h1>
    <Button variant="gold">Get Started</Button>
  </div>
</section>
```

### Feature Card

```tsx
<div className="p-6 rounded-lg border bg-background hover:shadow-lg hover:border-accent/20 transition-all">
  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
    <Icon className="w-6 h-6 text-primary" />
  </div>
  <h3 className="text-xl font-semibold mb-2">Feature Title</h3>
  <p className="text-muted-foreground">Feature description</p>
</div>
```

## Accessibility

- All colors meet WCAG AA contrast ratios
- Font sizes are readable (minimum 16px for body)
- Focus states are clearly visible
- Semantic HTML is used throughout
- ARIA labels where appropriate

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- SVG pattern support required
- CSS custom properties (variables) support required

