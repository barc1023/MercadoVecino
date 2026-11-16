import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Angular's unit-test builder bundles each spec with the code it imports, and
    // Vitest's file-system module cache can then serve a stale bundle after a
    // non-spec file changes. Turn the cache off so reruns always test current code.
    fsModuleCache: false,
    // The builder shares one module registry across specs in a worker
    // (isolate: false, like Karma), so only the first vi.mock('firebase/*')
    // factory to run wins; later specs assert on their own mocks, which never
    // get called. Isolate each spec file so every mock factory applies.
    isolate: true,
  },
});
