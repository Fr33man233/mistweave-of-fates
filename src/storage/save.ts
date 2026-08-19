import { openDB } from 'idb';
import type { Game } from '../core/game';
let dbPromise: ReturnType<typeof openDB> | undefined;
function database() { if (!globalThis.indexedDB) return undefined; return (dbPromise ??= openDB('veilport-v01', 1, { upgrade(db) { db.createObjectStore('run'); } })); }
export async function saveGame(game: Game) { const db = database(); if (db) await (await db).put('run', game, 'current'); }
export async function loadGame(): Promise<Game | undefined> { const db = database(); return db ? (await db).get('run', 'current') : undefined; }
