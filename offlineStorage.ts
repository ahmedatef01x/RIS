// Offline Storage using IndexedDB
const DB_NAME = 'RIS_OfflineDB';
const DB_VERSION = 1;

interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores for each table
        const tables = [
          'patients',
          'exam_orders',
          'appointments',
          'reports',
          'billing',
          'devices',
          'notifications',
          'exam_types',
          'profiles',
        ];

        tables.forEach((table) => {
          if (!db.objectStoreNames.contains(table)) {
            db.createObjectStore(table, { keyPath: 'id' });
          }
        });

        // Store for pending offline operations
        if (!db.objectStoreNames.contains('pending_operations')) {
          db.createObjectStore('pending_operations', { keyPath: 'id' });
        }
      };
    });
  }

  async get<T>(table: string, id: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(table, 'readonly');
      const store = transaction.objectStore(table);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(table: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(table, 'readonly');
      const store = transaction.objectStore(table);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async put<T>(table: string, data: T): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(table, 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async delete(table: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(table, 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(table: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(table, 'readwrite');
      const store = transaction.objectStore(table);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async addPendingOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
    const op: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    await this.put('pending_operations', op);
  }

  async getPendingOperations(): Promise<OfflineOperation[]> {
    return this.getAll<OfflineOperation>('pending_operations');
  }

  async clearPendingOperation(id: string): Promise<void> {
    await this.delete('pending_operations', id);
  }

  async syncData<T>(table: string, data: T[]): Promise<void> {
    await this.clear(table);
    for (const item of data) {
      await this.put(table, item);
    }
  }
}

export const offlineStorage = new OfflineStorage();

// Check if online
export const isOnline = () => navigator.onLine;

// Listen for online/offline events
export const setupConnectivityListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};
