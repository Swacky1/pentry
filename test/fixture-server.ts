import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

export type Handler = (req: IncomingMessage, res: ServerResponse) => void;

export interface Fixture {
  url: string;
  close: () => Promise<void>;
}

/** Spin up a throwaway HTTP server on a random port for a single test. */
export async function startFixture(handler: Handler): Promise<Fixture> {
  const server: Server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
