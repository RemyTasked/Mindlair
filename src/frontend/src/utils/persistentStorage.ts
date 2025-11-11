/**
 * Persistent Storage Utility
 * 
 * Uses IndexedDB for more reliable persistence on iOS PWAs
 * Falls back to localStorage if IndexedDB is not available
 */

const DB_NAME = 'meetcute_db';
const STORE_NAME = 'auth';
const DB_VERSION = 1;

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Store token in IndexedDB
async function setTokenInDB(token: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(token, 'token');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ Token saved to IndexedDB');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('❌ Failed to save token to IndexedDB:', error);
    throw error;
  }
}

// Get token from IndexedDB
async function getTokenFromDB(): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('token');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const token = request.result;
        if (token) {
          console.log('✅ Token retrieved from IndexedDB');
        }
        resolve(token || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('❌ Failed to get token from IndexedDB:', error);
    return null;
  }
}

// Remove token from IndexedDB
async function removeTokenFromDB(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete('token');

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ Token removed from IndexedDB');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('❌ Failed to remove token from IndexedDB:', error);
  }
}

/**
 * Save auth token to both localStorage and IndexedDB for maximum persistence
 */
export async function saveToken(token: string): Promise<void> {
  console.log('💾 Saving token to persistent storage...');
  
  // Save to localStorage (fast, synchronous)
  try {
    localStorage.setItem('meetcute_token', token);
    console.log('✅ Token saved to localStorage');
  } catch (error) {
    console.error('❌ Failed to save token to localStorage:', error);
  }

  // Save to IndexedDB (more persistent on iOS PWA)
  try {
    await setTokenInDB(token);
  } catch (error) {
    console.error('❌ Failed to save token to IndexedDB:', error);
  }
}

/**
 * Get auth token from storage (checks both IndexedDB and localStorage)
 */
export async function getToken(): Promise<string | null> {
  console.log('🔍 Looking for auth token...');

  // First, try localStorage (fastest)
  try {
    const localToken = localStorage.getItem('meetcute_token');
    if (localToken) {
      console.log('✅ Token found in localStorage');
      // Also save to IndexedDB for future persistence
      await setTokenInDB(localToken).catch(() => {});
      return localToken;
    }
  } catch (error) {
    console.error('❌ Failed to read from localStorage:', error);
  }

  // If not in localStorage, try IndexedDB
  try {
    const dbToken = await getTokenFromDB();
    if (dbToken) {
      console.log('✅ Token found in IndexedDB, restoring to localStorage');
      // Restore to localStorage for faster access
      try {
        localStorage.setItem('meetcute_token', dbToken);
      } catch (e) {
        console.error('❌ Failed to restore token to localStorage:', e);
      }
      return dbToken;
    }
  } catch (error) {
    console.error('❌ Failed to read from IndexedDB:', error);
  }

  console.log('❌ No token found in any storage');
  return null;
}

/**
 * Remove auth token from all storage locations
 */
export async function removeToken(): Promise<void> {
  console.log('🗑️ Removing token from all storage...');

  // Remove from localStorage
  try {
    localStorage.removeItem('meetcute_token');
    console.log('✅ Token removed from localStorage');
  } catch (error) {
    console.error('❌ Failed to remove from localStorage:', error);
  }

  // Remove from IndexedDB
  try {
    await removeTokenFromDB();
  } catch (error) {
    console.error('❌ Failed to remove from IndexedDB:', error);
  }
}

/**
 * Check if user is authenticated (has a valid token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return !!token;
}

