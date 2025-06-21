
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// --- Type Definitions ---
// We define types here to ensure data consistency within the function.
interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name: string;
  lastLogin: string;
}

// --- Helper Functions ---

/**
 * Fetches API keys for required services from the 'apiKeys' collection in Firestore.
 * @returns {Promise<{youtube: string | null; instagram: string | null}>} A promise that resolves to an object containing the API keys.
 */
async function getApiKeys(): Promise<{ youtube: string | null; instagram: string | null }> {
  const apiKeys: { youtube: string | null; instagram: string | null } = {
    youtube: null,
    instagram: null,
  };
  try {
    const youtubeSnapshot = await db.collection('apiKeys').where('serviceName', '==', 'youtube').limit(1).get();
    if (!youtubeSnapshot.empty) {
      apiKeys.youtube = youtubeSnapshot.docs[0].data().keyValue;
    } else {
      console.warn("YouTube API key not found in Firestore.");
    }

    const instagramSnapshot = await db.collection('apiKeys').where('serviceName', '==', 'RapidAPI-Instagram-Scraper').limit(1).get();
    if (!instagramSnapshot.empty) {
      apiKeys.instagram = instagramSnapshot.docs[0].data().keyValue;
    } else {
        console.warn("RapidAPI-Instagram-Scraper key not found in Firestore.");
    }
  } catch (error) {
    console.error("Error fetching API keys:", error);
  }
  return apiKeys;
}

/**
 * Fetches all user profiles from the 'users' collection.
 * @returns {Promise<User[]>} A promise that resolves to an array of User objects.
 */
async function getAllUsers(): Promise<User[]> {
  const users: User[] = [];
  try {
    const usersSnapshot = await db.collection('users').get();
    usersSnapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() } as User);
    });
  } catch (error) {
    console.error("Error fetching users:", error);
  }
  return users;
}

/**
 * Fetches the list of YouTube links assigned to a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string[]>} A promise that resolves to an array of YouTube link strings.
 */
async function getYouTubeLinks(userId: string): Promise<string[]> {
    try {
        const docRef = db.collection('youtube').doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.links || [];
        }
    } catch(error) {
        console.error(`Error fetching YouTube links for user ${userId}:`, error);
    }
    return [];
}

/**
 * Fetches the list of Instagram links assigned to a specific user.
 * @param {string} userId - The ID of the user.
 * @returns {Promise<string[]>} A promise that resolves to an array of Instagram link strings.
 */
async function getInstagramLinks(userId: string): Promise<string[]> {
    try {
        const docRef = db.collection('instagramReelLinks').doc(userId);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            return docSnap.data()?.links || [];
        }
    } catch(error) {
        console.error(`Error fetching Instagram links for user ${userId}:`, error);
    }
    return [];
}

/**
 * A scheduled Cloud Function that runs daily to refresh social media analytics data.
 */
export const dailyDataRefresh = functions
    // It's good practice to give complex functions more time and memory.
    .runWith({timeoutSeconds: 540, memory: "1GB"})
    // This schedule uses unix-cron syntax to run at 3:00 AM every day.
    .pubsub.schedule("every day 03:00")
    // Set a specific timezone to ensure the function runs consistently.
    .timeZone("America/Los_Angeles") 
    .onRun(async (context) => {
        console.log("Daily data refresh job started!");

        const apiKeys = await getApiKeys();
        
        const users = await getAllUsers();
        if (users.length === 0) {
            console.log("No users found to refresh data for.");
            return null;
        }

        console.log(`Found ${users.length} user(s) to process.`);

        for (const user of users) {
            console.log(`--- Processing user: ${user.name} (${user.id}) ---`);
            
            // Fetch YouTube links and stats
            if (apiKeys.youtube) {
                const youtubeLinks = await getYouTubeLinks(user.id);
                if (youtubeLinks.length > 0) {
                    console.log(`Found ${youtubeLinks.length} YouTube links for ${user.name}.`);
                    // TODO: In the next step, fetch YouTube stats for these links.
                } else {
                    console.log(`No YouTube links for ${user.name}.`);
                }
            } else {
                console.log("Skipping YouTube refresh due to missing API key.");
            }

            // Fetch Instagram links and stats
            if (apiKeys.instagram) {
                const instagramLinks = await getInstagramLinks(user.id);
                if (instagramLinks.length > 0) {
                    console.log(`Found ${instagramLinks.length} Instagram links for ${user.name}.`);
                    // TODO: In the next step, fetch Instagram stats for these links.
                } else {
                    console.log(`No Instagram links for ${user.name}.`);
                }
            } else {
                console.log("Skipping Instagram refresh due to missing API key.");
            }
        }

        console.log("Daily data refresh job finished.");
        return null;
    });
