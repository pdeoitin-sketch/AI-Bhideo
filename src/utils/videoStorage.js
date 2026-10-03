const DATABASE_NAME = 'ai-bhideo-video-assets';
const DATABASE_VERSION = 1;
const STORE_NAME = 'videos';

let databasePromise;

function openDatabase() {
  if (!globalThis.indexedDB) {
    return Promise.reject(new Error('IndexedDB is unavailable in this browser.'));
  }

  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open video storage.'));
      request.onblocked = () => reject(new Error('Video storage is blocked by another tab.'));
    }).catch((error) => {
      databasePromise = null;
      throw error;
    });
  }

  return databasePromise;
}

export async function saveVideoBlob(id, blob) {
  if (!id || !blob) return false;
  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(blob, String(id));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not save the video.'));
      transaction.onabort = () => reject(transaction.error || new Error('Video storage was interrupted.'));
    });
    return true;
  } catch {
    // Keep the video usable for this session even when persistent storage is full/blocked.
    return false;
  }
}

export async function getVideoBlob(id) {
  if (!id) return null;
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const request = transaction.objectStore(STORE_NAME).get(String(id));
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error('Could not load the saved video.'));
    });
  } catch {
    return null;
  }
}

export async function deleteVideoBlob(id) {
  if (!id) return false;
  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(String(id));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Could not remove the video.'));
      transaction.onabort = () => reject(transaction.error || new Error('Video removal was interrupted.'));
    });
    return true;
  } catch {
    return false;
  }
}
