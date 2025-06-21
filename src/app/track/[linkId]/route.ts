
import { getRedirectLinkByShortId, type RedirectLink } from '@/lib/utmLinkService';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { randomUUID } from 'crypto';

const GA_MEASUREMENT_ID = "G-TSV3YRCHJD";

async function getMeasurementProtocolApiSecret(): Promise<string | null> {
  try {
    const keysRef = collection(db, 'apiKeys');
    // Service name for the Measurement Protocol API Secret
    const q = query(keysRef, where('serviceName', '==', 'google-analytics-mp'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.warn("[Redirect Service] 'google-analytics-mp' API secret not found in Firestore.");
      return null;
    }
    return snapshot.docs[0].data().keyValue;
  } catch (error) {
    console.error("[Redirect Service] Error fetching google-analytics-mp secret:", error);
    return null;
  }
}

async function sendAnalyticsEvent(linkData: RedirectLink, apiSecret: string, request: NextRequest) {
  // A unique identifier for a client. Using a new UUID for each event treats each click as a unique interaction.
  const clientId = randomUUID();

  const eventPayload = {
    client_id: clientId,
    events: [{
      name: 'campaign_click', // A custom event to signify the redirect click
      params: {
        // These parameters are automatically recognized by GA4 for attribution
        source: linkData.utmSource,
        medium: linkData.utmMedium,
        campaign: linkData.utmCampaign,
        
        // Session parameters
        session_id: `${clientId}_${Math.floor(Date.now() / 1000)}`,
        engagement_time_msec: "100", // A minimal engagement time
        page_location: linkData.destinationUrl,
        page_title: `Redirect for ${linkData.utmCampaign}`,
      },
    }],
  };
  
  try {
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: JSON.stringify(eventPayload),
    });

    if (!response.ok) {
        const responseBody = await response.text();
        console.error(`[Redirect Service] Measurement Protocol request failed with status ${response.status}: ${responseBody}`);
    } else {
        console.log(`[Redirect Service] Sent Measurement Protocol event for campaign: ${linkData.utmCampaign}`);
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

  if (!shortId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const linkData = await getRedirectLinkByShortId(shortId);

    if (linkData && linkData.destinationUrl) {
      // Server-side tracking using Measurement Protocol
      const apiSecret = await getMeasurementProtocolApiSecret();
      if (apiSecret) {
        // Fire-and-forget the analytics event, don't wait for it to complete
        sendAnalyticsEvent(linkData, apiSecret, request);
      } else {
        console.warn("[Redirect Service] No API Secret for Measurement Protocol found. Skipping server-side tracking. Client-side tracking will be used as a fallback.");
      }
      
      // Redirect to the original destination URL. The URL still contains the UTM parameters,
      // allowing the client-side gtag script to work as a fallback.
      return NextResponse.redirect(new URL(linkData.destinationUrl));
    } else {
      // If the link is not found, redirect to the homepage.
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error(`[Redirect Service] Error during redirect for linkId ${shortId}:`, error);
    return NextResponse.redirect(new URL('/', request.url));
  }
}
