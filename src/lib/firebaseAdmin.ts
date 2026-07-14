import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let firebaseConfig: any = null;

try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.error("Failed to read firebase-applet-config.json:", e);
}

if (!firebaseConfig) {
  throw new Error("firebase-applet-config.json is required to initialize Firebase Admin.");
}

// Initialize Firebase Admin
const app = getApps().length === 0
  ? initializeApp({ projectId: firebaseConfig.projectId })
  : getApp();

// Get the specific database instance using the app and custom database ID
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

let lastState: any = null;

/**
 * Initializes Firestore and synchronizes with the local cache/initialDb.
 * If Firestore is empty, it seeds Firestore with the initialDb.
 * Otherwise, it fetches all data from Firestore and returns it to be used in memory.
 */
export async function initFirestoreSync(initialDb: any): Promise<any> {
  console.log("Initializing Firestore Sync...");
  
  try {
    // 1. Fetch Config
    const configDoc = await db.collection("config").doc("global").get();
    const bannedIpsDoc = await db.collection("config").doc("bannedIps").get();
    const censoredWordsDoc = await db.collection("config").doc("censoredWords").get();
    
    // Check if we have users in Firestore to determine if seeded
    const usersSnapshot = await db.collection("users").limit(1).get();
    const isFirstTime = usersSnapshot.empty;
    
    if (isFirstTime) {
      console.log("Firestore is empty. Seeding initial data to Firestore...");
      
      // Seed Config
      await db.collection("config").doc("global").set(initialDb.config || {});
      await db.collection("config").doc("bannedIps").set({ ips: initialDb.bannedIps || [] });
      await db.collection("config").doc("censoredWords").set({ words: initialDb.censoredWords || [] });
      
      // Seed collections
      const collectionsToSeed = ["users", "announcements", "conversions", "friendships", "messages", "systemLogs"];
      for (const col of collectionsToSeed) {
        const items = initialDb[col] || [];
        console.log(`Seeding ${items.length} items to collection '${col}'...`);
        for (const item of items) {
          if (item && item.id) {
            await db.collection(col).doc(item.id).set(item);
          }
        }
      }
      
      lastState = JSON.parse(JSON.stringify(initialDb));
      return initialDb;
    } else {
      console.log("Firestore contains data. Loading data from Firestore into memory...");
      
      const loadedDb: any = {
        users: [],
        announcements: [],
        conversions: [],
        friendships: [],
        messages: [],
        systemLogs: [],
        config: configDoc.exists ? configDoc.data() : (initialDb.config || {}),
        bannedIps: bannedIpsDoc.exists ? (bannedIpsDoc.data()?.ips || []) : (initialDb.bannedIps || []),
        censoredWords: censoredWordsDoc.exists ? (censoredWordsDoc.data()?.words || []) : (initialDb.censoredWords || []),
      };
      
      const collectionsToLoad = ["users", "announcements", "conversions", "friendships", "messages", "systemLogs"];
      for (const col of collectionsToLoad) {
        const snapshot = await db.collection(col).get();
        snapshot.forEach((doc) => {
          loadedDb[col].push(doc.data());
        });
        console.log(`Loaded ${loadedDb[col].length} items for collection '${col}'.`);
      }
      
      lastState = JSON.parse(JSON.stringify(loadedDb));
      return loadedDb;
    }
  } catch (error) {
    console.error("Error during Firestore sync initialization:", error);
    // Fallback to local cache/initialDb if Firestore fails
    lastState = JSON.parse(JSON.stringify(initialDb));
    return initialDb;
  }
}

/**
 * Compares the new memory state with the previous state and pushes changes to Firestore.
 */
export async function syncToFirestore(newState: any): Promise<void> {
  if (!lastState) {
    lastState = JSON.parse(JSON.stringify(newState));
    return;
  }
  
  try {
    // 1. Sync Config
    if (JSON.stringify(newState.config) !== JSON.stringify(lastState.config)) {
      await db.collection("config").doc("global").set(newState.config || {});
    }
    
    // 2. Sync Banned IPs
    if (JSON.stringify(newState.bannedIps) !== JSON.stringify(lastState.bannedIps)) {
      await db.collection("config").doc("bannedIps").set({ ips: newState.bannedIps || [] });
    }
    
    // 3. Sync Censored Words
    if (JSON.stringify(newState.censoredWords) !== JSON.stringify(lastState.censoredWords)) {
      await db.collection("config").doc("censoredWords").set({ words: newState.censoredWords || [] });
    }
    
    // 4. Sync Collections
    const collectionsToSync = ["users", "announcements", "conversions", "friendships", "messages", "systemLogs"];
    for (const col of collectionsToSync) {
      const newItems = newState[col] || [];
      const oldItems = lastState[col] || [];
      
      const newMap = new Map(newItems.map((item: any) => [item.id, item]));
      const oldMap = new Map(oldItems.map((item: any) => [item.id, item]));
      
      // Find added or updated items
      for (const [id, item] of newMap.entries()) {
        const oldItem = oldMap.get(id);
        if (!oldItem || JSON.stringify(item) !== JSON.stringify(oldItem)) {
          await db.collection(col).doc(id as string).set(item);
        }
      }
      
      // Find deleted items
      for (const id of oldMap.keys()) {
        if (!newMap.has(id)) {
          await db.collection(col).doc(id as string).delete();
        }
      }
    }
    
    // Keep lastState reference updated
    lastState = JSON.parse(JSON.stringify(newState));
  } catch (error) {
    console.error("Error during Firestore background sync:", error);
  }
}
