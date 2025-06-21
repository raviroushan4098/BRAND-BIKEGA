
import { getRedirectLinkByShortId } from '@/lib/utmLinkService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { linkId: string } }
) {
  const shortId = params.linkId;

  // If no linkId is provided, redirect to the homepage.
  if (!shortId) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const linkData = await getRedirectLinkByShortId(shortId);

    if (linkData && linkData.destinationUrl) {
      // TODO: Implement Measurement Protocol ping to Google Analytics here.
      // This would involve making a server-side POST request to:
      // https://www.google-analytics.com/mp/collect?measurement_id=G-YOUR_ID&api_secret=YOUR_SECRET
      // with a payload including the campaign details from linkData.
      
      // Redirect to the original destination URL.
      return NextResponse.redirect(new URL(linkData.destinationUrl));
    } else {
      // If the link is not found, redirect to the homepage (or a 404 page).
      // A dedicated 404 page would be better in a full implementation.
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error(`[Redirect Service] Error during redirect for linkId ${shortId}:`, error);
    // On any error, redirect to the homepage to avoid showing a broken page.
    return NextResponse.redirect(new URL('/', request.url));
  }
}
