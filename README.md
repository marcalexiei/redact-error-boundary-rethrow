# Redact: an error rethrown from an error boundary's fallback is not passed up

Minimal reproduction for [`@tanstack/redact`](https://tanstack.com/redact/latest) `0.2.1` (React `19.1.0`, Vite `8.1.5`).

If an error boundary's fallback throws, React sends that error to the **closest boundary above it**
([docs](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)).
Libraries rely on it: TanStack Router's `CatchNotFound` rethrows every error that is not a `notFound()`
from its `errorComponent`, and apps rethrow from a route `errorComponent` to reach an app-level boundary.

Under Redact the error never reaches the outer boundary.

## Setup

```tsx
// `Thrower` throws new Error("boom"), `Rethrow` throws the error it receives again
<ErrorBoundary fallback={(error) => <p>Outer boundary caught: {error.message}</p>}>
  <ErrorBoundary fallback={(error) => <Rethrow error={error} />}>
    <Thrower />
  </ErrorBoundary>
</ErrorBoundary>
```

Full code: [`src/main.tsx`](src/main.tsx). `Rethrow` stops after 1000 renders so the tab stays usable.

## Results

| Case                                                | React                         | Redact                                                                                                 |
| --------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `?case=update`: the child throws on a re-render     | Outer boundary catches `boom` | **Infinite render loop**: the inner fallback renders again and again (the tab hangs without the guard) |
| `?case=mount`: the child throws on its first render | Outer boundary catches `boom` | Uncaught `RenderErrorCapture`, the whole root is left empty                                            |

The update case is what a real app hits: a query loads, then fails (e.g. a 401), and the route's error
component hands the error to the app's boundary. With TanStack Router that froze the browser tab.

## Likely cause

`findErrorBoundary` (`src/dom/reconcile.ts`) returns the first ancestor boundary, including the one
that is already rendering its fallback, so the rethrown error comes back to the same boundary. React
skips a boundary that failed while showing its fallback and moves on to the next one.

## Run it

```bash
npm install
npm run dev:react   # http://localhost:5173/?case=update
npm run dev:redact  # same URL, with the Redact plugin
```

Production builds behave the same: `npm run build:react` / `npm run build:redact`, then `npx vite preview --outDir dist-redact`.
