# Consulotion Preview

## Mission
Create implementation-ready, token-driven UI guidance for Consulotion Preview that is optimized for consistency, accessibility, and fast delivery across e-commerce storefront.

## Brand
- Product/brand: Consulotion Preview
- URL: https://preview.colorlib.com/?_gl=1*1vn8nmu*_ga*MTE5MzIxMTk2Ny4xNzkzMjUwNzIw*_ga_SEKJ4E9T4H*czE3OTMyNTA3MTkkbzEkZzEkdDE3OTMyNTA3NTgkajU4JGwwJGgwJGR3LTRxS1lLdFF5X1lXeFJNZkIxUkZvWjJwenhnZEhQaER3#consolution
- Audience: online shoppers and consumers
- Product surface: e-commerce storefront

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=-apple-system`, `font.family.stack=-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=normal`
- Typography scale: `font.size.xs=16px`
- Color palette: `color.surface.base=#000000`, `color.text.secondary=#9b9b9b`, `color.text.tertiary=#ffffff`, `color.surface.muted=#727272`, `color.surface.raised=#333333`, `color.surface.strong=#7ac64d`, `color.border.muted=rgb(155, 155, 155) rgb(155, 155, 155) rgb(155, 155, 155) rgb(68, 68, 68)`
- Spacing scale: `space.1=20px`, `space.2=40px`
- Radius/shadow/motion tokens: `motion.duration.instant=200ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: buttons (2012), links (1915), navigation (2), inputs (1).

- Extraction diagnostics: Low sample size: fewer than 30 visible elements were extracted. Limited typography variety detected; size scale may need manual refinement.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
