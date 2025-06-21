
import { getRedirectLinkByShortId, type RedirectLink } from '@/lib/utmLinkService';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

const GA_MEASUREMENT_ID = "G-TSV3YRCHJD";

async function getMeasurementProtocolApiSecret(): Promise<string | null> {
  try {
    console.log("[Redirect Service] Attempting to fetch 'google-analytics-mp' secret...");
    const keysRef = collection(db, 'apiKeys');
    const q = query(keysRef, where('serviceName', '==', 'google-analytics-mp'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("[Redirect Service] 'google-analytics-mp' API secret not found in Firestore.");
      return null;
    }
    const secret = snapshot.docs[0].data().keyValue;
    console.log("[Redirect Service] Successfully fetched 'google-analytics-mp' secret.");
    return secret;
  } catch (error) {
    console.error("[Redirect Service] Error fetching 'google-analytics-mp' secret:", error);
    return null;
  }
}

async function sendAnalyticsEvent(linkData: RedirectLink, apiSecret: string) {
  // A unique ID for the client. This should be persisted for a user across sessions if possible.
  // For this server-side context, we generate a new one for each redirect.
  const clientId = crypto.randomUUID();

  // The event payload. We are sending a 'session_start' event to ensure
  // Google Analytics correctly attributes the new session to our campaign.
  const eventPayload = {
    client_id: clientId,
    events: [{
      name: 'session_start', // Using a standard event for better processing by GA.
      params: {
        campaign_source: linkData.utmSource,
        campaign_medium: linkData.utmMedium,
        campaign_name: linkData.utmCampaign,
        // page_location is helpful for context
        page_location: linkData.destinationUrl,
      },
    }],
  };
  
  console.log(`[Redirect Service] Preparing to send 'session_start' event for campaign: ${linkData.utmCampaign}`);
  console.log('[Redirect Service] Payload:', JSON.stringify(eventPayload, null, 2));

  try {
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: JSON.stringify(eventPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
        const responseBody = await response.text();
        console.error(`[Redirect Service] Measurement Protocol request failed with status ${response.status}: ${responseBody}`);
    } else {
        console.log(`[Redirect Service] Successfully sent 'session_start' event for campaign: ${linkData.utmCampaign}`);
    }
  } catch (error) {
    console.error('[Redirect Service] Failed to send Measurement Protocol event:', error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  const shortId = params.linkId;
  console.log(`[Redirect Service] Received request for shortId: ${shortId}`);

  if (!shortId) {
    console.log("[Redirect Service] No shortId provided, redirecting to home.");
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const linkData = await getRedirectLinkByShortId(shortId);

    if (linkData && linkData.destinationUrl) {
      console.log(`[Redirect Service] Found destination URL: ${linkData.destinationUrl}`);
      const apiSecret = await getMeasurementProtocolApiSecret();
      if (apiSecret) {
        // We now wait for the tracking event to be sent before redirecting.
        await sendAnalyticsEvent(linkData, apiSecret);
      } else {
        console.warn("[Redirect Service] No API Secret for Measurement Protocol found. Skipping server-side tracking.");
      }
      
      console.log(`[Redirect Service] Redirecting user to ${linkData.destinationUrl}`);
      return NextResponse.redirect(new URL(linkData.destinationUrl));
    } else {
      console.warn(`[Redirect Service] No link data found for shortId: ${shortId}. Redirecting to home.`);
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error(`[Redirect Service] Error during redirect for linkId ${shortId}:`, error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
    