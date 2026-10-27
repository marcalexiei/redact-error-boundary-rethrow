import { Component, type ReactNode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

declare const __RUNTIME__: string;

/** `?case=mount`: the child throws on its first render. `?case=update` (default): it throws on a re-render, like a query that loads and then fails. */
const throwOn = new URLSearchParams(location.search).get("case") === "mount" ? "mount" : "update";

const MAX_FALLBACK_RENDERS = 1000;
let fallbackRenders = 0;

interface BoundaryProps {
  fallback: (error: Error) => ReactNode;
  children: ReactNode;
}

class ErrorBoundary extends Component<BoundaryProps, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override render() {
    return this.state.error ? this.props.fallback(this.state.error) : this.props.children;
  }
}

/**
 * The inner boundary only handles some errors and rethrows the others from its fallback,
 * like TanStack Router's `CatchNotFound` (non-notFound errors) or an app-level
 * `errorComponent: ({ error }) => { throw error }`.
 *
 * React: an error thrown while a boundary renders its fallback goes to the closest boundary
 * ABOVE it, so the outer boundary shows "Outer boundary caught: boom".
 */
function Rethrow({ error }: { error: Error }): ReactNode {
  fallbackRenders++;
  Object.assign(globalThis, { fallbackRenders });
  if (fallbackRenders >= MAX_FALLBACK_RENDERS) {
    // Guard so the tab stays usable: without it the loop never ends.
    return (
      <p id="result">
        Inner fallback rendered {fallbackRenders} times: the rethrown error keeps coming back to it
      </p>
    );
  }
  throw error;
}

function Thrower(): ReactNode {
  const [loaded, setLoaded] = useState(throwOn === "mount");

  useEffect(() => {
    setLoaded(true);
  }, []);

  if (loaded) {
    throw new Error("boom");
  }

  return <p>Loading…</p>;
}

function App() {
  return (
    <>
      <p>
        Runtime: <strong>{__RUNTIME__}</strong>, child throws on <strong>{throwOn}</strong> (
        <a href="?case=update">update</a> / <a href="?case=mount">mount</a>)
      </p>
      <ErrorBoundary
        fallback={(error) => (
          <p id="result">
            Outer boundary caught: {error.message} (inner fallback rendered {fallbackRenders} times)
          </p>
        )}
      >
        <ErrorBoundary fallback={(error) => <Rethrow error={error} />}>
          <Thrower />
        </ErrorBoundary>
      </ErrorBoundary>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
