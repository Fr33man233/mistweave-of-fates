import type { Plugin } from 'vite';
import { DeepSeekProvider } from '../../src/model/deepseek-provider.ts';
import { createGatewayHandler } from './gateway.ts';

function provider() {
  return new DeepSeekProvider({ apiKey: process.env.DEEPSEEK_API_KEY });
}

export function modelGatewayPlugin(): Plugin {
  return {
    name: 'mistweave-model-gateway',
    configureServer: (server) => {
      server.middlewares.use(createGatewayHandler(provider()));
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(createGatewayHandler(provider()));
    },
  };
}
