/**
 * Federal MP Data Source
 * Fetches official MP data from House of Commons XML feed
 */

export interface FederalMP {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  honorific?: string;
  riding: string;
  province: string;
  party: string;
  startDate: string;
  endDate?: string;
  email?: string;
  photoUrl?: string;
  profileUrl?: string;
  // Contact info (if available from other sources)
  phone?: string;
  offices?: Array<{
    type: 'constituency' | 'hill';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
}

/**
 * Fetches all current MPs from House of Commons XML feed
 * Source: https://www.ourcommons.ca/Members/en/search/xml
 */
export async function fetchHouseOfCommonsMPs(): Promise<FederalMP[]> {
  try {
    console.log('[FederalDataSource] Fetching MPs from House of Commons...');

    const response = await fetch('https://www.ourcommons.ca/Members/en/search/xml', {
      headers: {
        'Accept': 'application/xml, text/xml',
      },
    });

    if (!response.ok) {
      throw new Error(`House of Commons fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const mps = parseHouseOfCommonsXML(xmlText);

    console.log(`[FederalDataSource] Successfully fetched ${mps.length} MPs`);
    return mps;
  } catch (error) {
    console.error('[FederalDataSource] Failed to fetch MPs:', error);
    throw error;
  }
}

/**
 * Parse House of Commons XML into structured MP data
 */
function parseHouseOfCommonsXML(xmlText: string): FederalMP[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const memberNodes = xmlDoc.querySelectorAll('MemberOfParliament');
  const mps: FederalMP[] = [];

  memberNodes.forEach((node) => {
    const personId = getTextContent(node, 'PersonId');
    const firstName = getTextContent(node, 'PersonOfficialFirstName');
    const lastName = getTextContent(node, 'PersonOfficialLastName');

    if (!personId || !firstName || !lastName) {
      console.warn('[FederalDataSource] Skipping MP with missing required fields');
      return;
    }

    const mp: FederalMP = {
      id: personId,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      honorific: getTextContent(node, 'PersonShortHonorific') || undefined,
      riding: getTextContent(node, 'ConstituencyName') || '',
      province: getTextContent(node, 'ConstituencyProvinceTerritoryName') || '',
      party: getTextContent(node, 'CaucusShortName') || '',
      startDate: getTextContent(node, 'FromDateTime') || '',
      endDate: getTextContent(node, 'ToDateTime') || undefined,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@parl.gc.ca`,
      profileUrl: `https://www.ourcommons.ca/members/en/${firstName}-${lastName}(${personId})`,
    };

    mps.push(mp);
  });

  return mps;
}

/**
 * Helper to get text content from XML node
 */
function getTextContent(node: Element, tagName: string): string | null {
  const element = node.querySelector(tagName);
  return element?.textContent?.trim() || null;
}

/**
 * Fetch detailed contact info for a specific MP from their profile page
 * This scrapes the ourcommons.ca MP profile page
 */
export async function fetchMPContactInfo(profileUrl: string): Promise<{
  phone?: string;
  offices?: Array<{
    type: 'constituency' | 'hill';
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    fax?: string;
  }>;
} | null> {
  try {
    console.log(`[FederalDataSource] Fetching contact info from ${profileUrl}`);

    const response = await fetch(profileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }

    const html = await response.text();

    // Create a temporary DOM to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    // Extract office information
    // Note: This is a basic implementation - the actual selectors will depend on the HTML structure
    const offices: Array<{
      type: 'constituency' | 'hill';
      address?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      phone?: string;
      fax?: string;
    }> = [];

    // Look for office divs (you'll need to inspect the actual HTML and adjust selectors)
    const officeElements = tempDiv.querySelectorAll('.ce-mip-mp-description');

    officeElements.forEach((element) => {
      const text = element.textContent || '';

      // Try to identify office type
      const isHill = text.toLowerCase().includes('parliament') || text.toLowerCase().includes('hill');

      // Extract phone numbers (basic pattern)
      const phoneMatch = text.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);

      offices.push({
        type: isHill ? 'hill' : 'constituency',
        phone: phoneMatch ? phoneMatch[0] : undefined,
      });
    });

    return offices.length > 0 ? { offices } : null;
  } catch (error) {
    console.error(`[FederalDataSource] Failed to fetch contact info:`, error);
    return null;
  }
}
