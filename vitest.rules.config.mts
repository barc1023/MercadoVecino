import { defineConfig } from 'vitest/config';

// Configuracion para las pruebas de firestore.rules contra el emulador.
// Es independiente de las pruebas unitarias de Angular (ng test).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-tests/**/*.test.ts'],
    // Todas las pruebas comparten el mismo emulador y limpian sus datos.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
