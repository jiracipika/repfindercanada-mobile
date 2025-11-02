/**
 * MP Contact Information Scraper
 * Scrapes detailed contact information from individual MP pages on ourcommons.ca
 */

import * as cheerio from 'cheerio';

export interface MPOffice {
  type: 'Hill' | 'Constituency';
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export interface MPContactInfo {
  mpId: string;
  name: string;
  email?: string;
  phone?: string;
  offices: MPOffice[];
  photoUrl?: string;
  lastUpdated: Date;
}

/**
 * Scrapes contact information from an MP's ourcommons.ca profile page
 * @param mpProfileUrl - Full URL to the MP's profile page
 */
export async function scrapeMPContactInfo(mpProfileUrl: string): Promise<MPContactInfo | null> {
  try {
    console.log(`Scraping MP contact info from: ${mpProfileUrl}`);

    const response = await fetch(mpProfileUrl, {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0 (Educational/Research)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!response.ok) {
      console.log(`Failed to fetch MP profile: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract MP ID from URL (e.g., /members/en/John-Smith(12345))
    const mpIdMatch = mpProfileUrl.match(/\((\d+)\)$/);
    const mpId = mpIdMatch ? mpIdMatch[1] : '';

    // Extract name
    const name = $('h1').first().text().trim() || '';

    // Extract photo URL
    const photoUrl = $('img.profile-img, img[alt*="Photo"], .member-photo img').attr('src');
    const fullPhotoUrl = photoUrl && photoUrl.startsWith('http')
      ? photoUrl
      : photoUrl
      ? `https://www.ourcommons.ca${photoUrl}`
      : undefined;

    // Extract email - common patterns
    const emailLinks = $('a[href^="mailto:"]');
    const emails: string[] = [];
    emailLinks.each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        const email = href.replace('mailto:', '').trim();
        if (email && !emails.includes(email)) {
          emails.push(email);
        }
      }
    });

    // Extract offices information
    const offices: MPOffice[] = [];

    // Look for office sections (Hill Office and Constituency Office)
    $('.office, .member-office, div:contains("Hill Office"), div:contains("Constituency Office")').each((_, officeEl) => {
      const officeHtml = $(officeEl).html() || '';
      const officeText = $(officeEl).text();

      const isHill = officeText.includes('Hill Office') || officeText.includes('Parliament Hill');
      const isConstituency = officeText.includes('Constituency Office') || officeText.includes('Riding Office');

      if (!isHill && !isConstituency) {
        return; // Skip if we can't determine office type
      }

      const office: MPOffice = {
        type: isHill ? 'Hill' : 'Constituency',
      };

      // Extract address (look for postal code pattern)
      const addressMatch = officeText.match(/([^\n]+[A-Z]\d[A-Z]\s*\d[A-Z]\d)/);
      if (addressMatch) {
        office.address = addressMatch[0].trim();
      }

      // Extract phone (look for phone number patterns)
      const phoneMatch = officeText.match(/(?:Tel|Phone|Telephone)[:\s]*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
      if (phoneMatch) {
        office.phone = phoneMatch[1].trim();
      }

      // Extract fax
      const faxMatch = officeText.match(/(?:Fax)[:\s]*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
      if (faxMatch) {
        office.fax = faxMatch[1].trim();
      }

      // Extract office-specific email
      const officeEmailMatch = officeHtml.match(/mailto:([^\s"'>]+)/);
      if (officeEmailMatch) {
        office.email = officeEmailMatch[1].trim();
      }

      if (office.address || office.phone || office.email) {
        offices.push(office);
      }
    });

    // If no structured offices found, try to extract contact info from general page content
    if (offices.length === 0) {
      const pageText = $('body').text();

      // Try to find Hill Office info
      const hillPhoneMatch = pageText.match(/Hill Office[^\d]*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
      if (hillPhoneMatch) {
        offices.push({
          type: 'Hill',
          phone: hillPhoneMatch[1].trim(),
          address: 'House of Commons, Ottawa, ON K1A 0A6',
        });
      }

      // Try to find Constituency Office info
      const constPhoneMatch = pageText.match(/Constituency Office[^\d]*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
      if (constPhoneMatch) {
        offices.push({
          type: 'Constituency',
          phone: constPhoneMatch[1].trim(),
        });
      }
    }

    return {
      mpId,
      name,
      email: emails[0],
      phone: offices.find(o => o.type === 'Hill')?.phone || offices[0]?.phone,
      offices,
      photoUrl: fullPhotoUrl,
      lastUpdated: new Date(),
    };
  } catch (error: any) {
    console.error(`Error scraping MP contact info from ${mpProfileUrl}:`, error?.message || String(error));
    return null;
  }
}

/**
 * Scrapes contact information for multiple MPs in batch
 * Includes rate limiting to be respectful to the server
 */
export async function scrapeMPContactInfoBatch(
  mpProfileUrls: string[],
  delayMs: number = 1000
): Promise<MPContactInfo[]> {
  const results: MPContactInfo[] = [];

  for (const url of mpProfileUrls) {
    const info = await scrapeMPContactInfo(url);
    if (info) {
      results.push(info);
    }

    // Delay between requests to be respectful
    if (mpProfileUrls.indexOf(url) < mpProfileUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Extracts contact information from the MP addresses page
 * This page lists all MPs with their contact information
 * https://www.ourcommons.ca/members/en/addresses
 */
export async function scrapeAllMPContacts(): Promise<MPContactInfo[]> {
  try {
    console.log('Scraping all MP contacts from addresses page...');

    const response = await fetch('https://www.ourcommons.ca/members/en/addresses', {
      headers: {
        'User-Agent': 'CanadianRepFinder/1.0 (Educational/Research)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MP addresses page: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const contacts: MPContactInfo[] = [];

    // Find all MP entries on the addresses page
    $('.member-info, .mp-info, tr.member-row, .member-card').each((_, el) => {
      const $el = $(el);
      const text = $el.text();

      // Extract name
      const nameEl = $el.find('h3, h4, .member-name, .mp-name, a[href*="/members/"]').first();
      const name = nameEl.text().trim();

      if (!name) return; // Skip if no name found

      // Extract MP ID from profile link
      const profileLink = $el.find('a[href*="/members/"]').attr('href');
      const mpIdMatch = profileLink?.match(/\((\d+)\)/);
      const mpId = mpIdMatch ? mpIdMatch[1] : '';

      // Extract email
      const emailLink = $el.find('a[href^="mailto:"]').first();
      const email = emailLink.attr('href')?.replace('mailto:', '').trim();

      // Extract offices
      const offices: MPOffice[] = [];

      // Look for office blocks
      $el.find('.office, .office-info').each((_, officeEl) => {
        const officeText = $(officeEl).text();
        const isHill = officeText.includes('Hill') || officeText.includes('Parliament');

        const office: MPOffice = {
          type: isHill ? 'Hill' : 'Constituency',
        };

        // Extract phone
        const phoneMatch = officeText.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
        if (phoneMatch) {
          office.phone = phoneMatch[1];
        }

        // Extract fax
        const faxMatch = officeText.match(/Fax[:\s]*(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/i);
        if (faxMatch) {
          office.fax = faxMatch[1];
        }

        // Extract address (look for postal code)
        const addressMatch = officeText.match(/([^\n]+[A-Z]\d[A-Z]\s*\d[A-Z]\d)/);
        if (addressMatch) {
          office.address = addressMatch[0].trim();
        }

        if (office.phone || office.address) {
          offices.push(office);
        }
      });

      contacts.push({
        mpId,
        name,
        email,
        phone: offices.find(o => o.type === 'Hill')?.phone,
        offices,
        lastUpdated: new Date(),
      });
    });

    console.log(`Scraped ${contacts.length} MP contacts from addresses page`);
    return contacts;
  } catch (error: any) {
    console.error('Error scraping all MP contacts:', error?.message || String(error));
    return [];
  }
}
