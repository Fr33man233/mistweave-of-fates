import { createServer } from 'vite';

export default async function globalSetup() {
  const previousE2eMode = process.env.VITE_E2E;
  process.env.VITE_E2E = '1';

  const server = await createServer({
    configFile: './vite.config.ts',
    // Production builds use the GitHub Pages subpath in Actions. E2E always
    // runs against an isolated local root so locators and URLs stay portable.
    base: '/',
    server: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
    },
  });
  await server.listen();

  return async () => {
    await server.close();
    if (previousE2eMode === undefined) delete process.env.VITE_E2E;
    else process.env.VITE_E2E = previousE2eMode;
  };
}
