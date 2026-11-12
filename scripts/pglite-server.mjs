// The local development database: one PGlite instance (embedded Postgres, WASM —
// nothing to install) exposed on a TCP port via the Postgres wire protocol.
//
// Everything else connects as an ordinary Postgres client, which is what makes
// dev safe: PGlite is a single Postgres over a data directory, and `next dev`
// alone runs app code in two processes (the server and a route worker). Opening
// the directory from several processes would give each its own isolated — and
// mutually corrupting — view, so exactly this process owns it.
//
// Started automatically by `npm run dev` (scripts/with-local-db.mjs); run it
// directly (`npm run db:serve`) to keep the DB up for drizzle-kit studio or psql.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import {
  LOCAL_DATA_DIR,
  LOCAL_DB_HOST,
  LOCAL_DB_PORT,
} from '../lib/db/local.mjs';

mkdirSync(path.resolve(LOCAL_DATA_DIR), { recursive: true });

// Contrib extensions ship as separate WASM bundles and must be registered here
// before a migration can CREATE EXTENSION them (pg_trgm: catalog search index,
// drizzle/0008_material_search_trgm.sql).
const client = new PGlite(LOCAL_DATA_DIR, { extensions: { pg_trgm } });
await client.waitReady;

const server = new PGLiteSocketServer({
  db: client,
  host: LOCAL_DB_HOST,
  port: LOCAL_DB_PORT,
  // Default is 1. The Next server, its route workers and any CLI script each
  // hold their own pool; queries are serialized inside PGlite regardless.
  maxConnections: 20,
});
keepExtendedQueryBatchesTogether(server);
await server.start();

// scripts/with-local-db.mjs waits for this line before starting Next.
console.log(
  `[db] PGlite ready on ${LOCAL_DB_HOST}:${LOCAL_DB_PORT} (${LOCAL_DATA_DIR})`
);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await client.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

/**
 * pglite-socket (≤ 0.2.19) queues every wire message on its own and only keeps
 * one connection's messages together while a transaction is open. node-postgres
 * sends each parameterised query as Parse/Bind/Describe/Execute/Sync, all on the
 * single unnamed portal, so under concurrent connections another client's batch
 * could run between our Bind and Execute, and its Sync would drop our portal:
 * `portal "" does not exist` (34000). That surfaced as random 500s in the
 * parallel e2e suite.
 *
 * This replaces the queue's scheduler: once a connection has sent an
 * extended-protocol message, only that connection's messages run until its
 * Sync. Transactions stay pinned as before. A failing message is rejected
 * without stalling the queue (upstream leaves `processing` stuck in that case).
 */
function keepExtendedQueryBatchesTogether(socketServer) {
  const queue = socketServer.queryQueue;
  if (!queue || typeof queue.processQueue !== 'function') {
    throw new Error(
      'pglite-socket internals changed: re-check keepExtendedQueryBatchesTogether'
    );
  }
  // Parse, Bind, Describe, Execute, Close, Flush — all wait for a Sync.
  const EXTENDED = new Set(
    ['P', 'B', 'D', 'E', 'C', 'H'].map((c) => c.charCodeAt(0))
  );
  let batchOwner = null;

  const clearForHandler = queue.clearQueueForHandler.bind(queue);
  queue.clearQueueForHandler = (handlerId) => {
    if (batchOwner === handlerId) batchOwner = null;
    clearForHandler(handlerId);
    // A released pin may unblock messages from other connections.
    void queue.processQueue();
  };

  queue.processQueue = async function processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        const owner =
          batchOwner ?? (this.db.isInTransaction() ? this.lastHandlerId : null);
        let item;
        if (owner != null) {
          const index = this.queue.findIndex((q) => q.handlerId === owner);
          // The owner's next message isn't here yet; its arrival restarts us.
          if (index === -1) break;
          [item] = this.queue.splice(index, 1);
        } else {
          item = this.queue.shift();
        }

        let bytes = 0;
        try {
          await this.db.runExclusive(() =>
            this.db.execProtocolRawStream(item.message, {
              onRawData: (data) => {
                bytes += data.length;
                item.onData(data);
              },
            })
          );
        } catch (error) {
          if (batchOwner === item.handlerId) batchOwner = null;
          item.reject(error);
          continue;
        }
        this.lastHandlerId = item.handlerId;
        batchOwner = EXTENDED.has(item.message[0]) ? item.handlerId : null;
        item.resolve(bytes);
      }
    } finally {
      this.processing = false;
    }
  };
}
