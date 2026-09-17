const DB_NAME = 'PerformanceGoalTrackerDB';
const DB_VERSION = 1;
const STORE_GOALS = 'goals';
const STORE_RESULTS = 'results';

const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
        console.error("Database error: " + event.target.errorCode);
        reject(event.target.error);
    };

    request.onsuccess = (event) => {
        resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Goals store
        if (!db.objectStoreNames.contains(STORE_GOALS)) {
            const goalsStore = db.createObjectStore(STORE_GOALS, { keyPath: 'id' });
            goalsStore.createIndex('name', 'name', { unique: false });
        }
        
        // Results store
        if (!db.objectStoreNames.contains(STORE_RESULTS)) {
            const resultsStore = db.createObjectStore(STORE_RESULTS, { keyPath: 'id' });
            resultsStore.createIndex('goalId', 'goalId', { unique: false });
            resultsStore.createIndex('date', 'date', { unique: false });
            resultsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
    };
});

window.DB = {
    async getGoal(id) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_GOALS, 'readonly');
            const store = tx.objectStore(STORE_GOALS);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getGoals() {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_GOALS, 'readonly');
            const store = tx.objectStore(STORE_GOALS);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveGoal(goal) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_GOALS, 'readwrite');
            const store = tx.objectStore(STORE_GOALS);
            const request = store.put(goal);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deleteGoal(id) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_GOALS, STORE_RESULTS], 'readwrite');
            const goalStore = tx.objectStore(STORE_GOALS);
            const resultStore = tx.objectStore(STORE_RESULTS);
            
            goalStore.delete(id);
            
            const index = resultStore.index('goalId');
            const request = index.openCursor(IDBKeyRange.only(id));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    },

    async getResults(goalId = null) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_RESULTS, 'readonly');
            const store = tx.objectStore(STORE_RESULTS);
            
            if (goalId) {
                const index = store.index('goalId');
                const request = index.getAll(IDBKeyRange.only(goalId));
                request.onsuccess = () => resolve(request.result.sort((a,b) => b.timestamp - a.timestamp));
                request.onerror = () => reject(request.error);
            } else {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result.sort((a,b) => b.timestamp - a.timestamp));
                request.onerror = () => reject(request.error);
            }
        });
    },

    async saveResult(result) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_RESULTS, 'readwrite');
            const store = tx.objectStore(STORE_RESULTS);
            const request = store.put(result);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async deleteResult(id) {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_RESULTS, 'readwrite');
            const store = tx.objectStore(STORE_RESULTS);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async clearAll() {
        const db = await dbPromise;
        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_GOALS, STORE_RESULTS], 'readwrite');
            tx.objectStore(STORE_GOALS).clear();
            tx.objectStore(STORE_RESULTS).clear();
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    async exportData() {
        const goals = await this.getGoals();
        const results = await this.getResults();
        return JSON.stringify({ goals, results });
    },

    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.goals || !data.results) throw new Error("Invalid backup format");
            
            await this.clearAll();
            
            const db = await dbPromise;
            return new Promise((resolve, reject) => {
                const tx = db.transaction([STORE_GOALS, STORE_RESULTS], 'readwrite');
                const goalsStore = tx.objectStore(STORE_GOALS);
                const resultsStore = tx.objectStore(STORE_RESULTS);
                
                data.goals.forEach(goal => goalsStore.put(goal));
                data.results.forEach(result => resultsStore.put(result));
                
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (e) {
            throw new Error("Failed to import data: " + e.message);
        }
    }
};
