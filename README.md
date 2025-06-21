# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Deploying the Application

This project is a Next.js application that can be deployed to Firebase App Hosting.

## Deploying Firebase Functions

This project includes a scheduled Firebase Function (`dailyDataRefresh`) to automatically fetch social media analytics data once a day. This function lives in the `functions/` directory.

To deploy this function to your Firebase project, run the following command from your terminal:

```bash
firebase deploy --only functions
```

Once deployed, the function will automatically run on the schedule defined in `functions/src/index.ts` (e.g., every day at 3:00 AM). You can monitor its execution logs in the Firebase console under the Functions section.

# BRAND-BIKEGA
