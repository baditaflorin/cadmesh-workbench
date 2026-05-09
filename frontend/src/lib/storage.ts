import { openDB } from 'idb';

const DB_NAME = 'cadmesh-workbench';

export async function savePreference(key: string, value: string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('preferences');
    },
  });
  await db.put('preferences', value, key);
}

export async function loadPreference(key: string): Promise<string | undefined> {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('preferences');
    },
  });
  return db.get('preferences', key);
}

export async function deletePreference(key: string) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore('preferences');
    },
  });
  await db.delete('preferences', key);
}
