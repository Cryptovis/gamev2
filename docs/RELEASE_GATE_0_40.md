# 0.40 Release Gate

## Verified in build workspace
- 61 TypeScript/TSX files parsed successfully
- internal TypeScript type-check passed using external-package shims
- no `Math.random()` inside `src/engine`
- 7 Visual Pack 1 asset files present
- 12 Vitest test files present

## Must be verified in StackBlitz / GitHub CI
Because the build workspace cannot reach npm reliably, the authoritative dependency-backed release gate remains:

```bash
npm install
npm run check
```

Expected: all tests pass, TypeScript compiles, Vite production build completes.
