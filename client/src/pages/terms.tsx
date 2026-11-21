import { Button } from "@/components/ui/button";
import { ListGroup } from "@/components/civic";

interface TermsPageProps {
  onAccept: () => void;
}

export function TermsPage({ onAccept }: TermsPageProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-6">
        <h1 className="civic-title">Terms of use.</h1>
        <p className="mt-2 text-footnote text-muted-foreground">
          Effective date: August 14, 2025 · Last updated: September 24, 2025
        </p>
      </div>

      <div className="mobile-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        <ListGroup className="space-y-3 p-4 text-subheadline leading-relaxed text-muted-foreground">
          <p className="text-foreground">These Terms of Use explain the rules for using the RepFinder Canada mobile app and website (together, the “Service”). By using the Service, you agree to these Terms and to our Privacy Policy at https://canadarepfinder.vercel.app/privacy. If you do not agree, please do not use the Service.</p>

          <h2 className="pt-1 text-headline text-foreground">1. Who we are</h2>
          <p>RepFinder Canada helps people in Canada find their federal and provincial representatives by postal code or approximate location. We are not a government entity.</p>
          <p className="font-semibold text-foreground">Disclaimer of affiliation</p>
          <p>RepFinder Canada is not affiliated with the Government of Canada or any provincial or territorial government.</p>

          <h2 className="pt-1 text-headline text-foreground">2. What the Service does</h2>
          <p>The Service lets you search by postal code or, if you allow it, by approximate device location to show representative details such as name, role, and public contact information. The Service is for general information. It is not legal advice, policy advice, or an official communication channel with any government.</p>

          <h2 className="pt-1 text-headline text-foreground">3. Data sources and licensing</h2>
          <p>Representative information is provided by the Represent API operated by Open North: https://represent.opennorth.ca/. Contains information licensed under the Open Government Licence – Canada: https://open.canada.ca/en/open-government-licence-canada. When the API includes a licence link for a specific dataset, that licence applies as well.</p>

          <h2 className="pt-1 text-headline text-foreground">Official Data Sources</h2>
          <p>All information presented in the app is sourced from the following official, public-record websites. You can verify all data by visiting these sources.</p>

          <h3 className="font-semibold text-foreground">Federal Government</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <a href="https://www.parl.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">
                Parliament of Canada (parl.ca)
              </a>
            </li>
            <li>
              <a href="https://www.ourcommons.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">
                House of Commons (ourcommons.ca)
              </a>
            </li>
            <li>
              <a href="https://www.elections.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">
                Elections Canada (elections.ca)
              </a>
            </li>
          </ul>

          <h3 className="font-semibold text-foreground">Provincial &amp; Territorial Legislatures</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li><a href="https://www.assembly.ab.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Alberta</a></li>
            <li><a href="https://www.leg.bc.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of British Columbia</a></li>
            <li><a href="https://www.leg.gov.mb.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Manitoba</a></li>
            <li><a href="https://www.legnb.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of New Brunswick</a></li>
            <li><a href="https://www.assembly.nl.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">House of Assembly of Newfoundland and Labrador</a></li>
            <li><a href="https://www.ntassembly.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of the Northwest Territories</a></li>
            <li><a href="https://nslegislature.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Nova Scotia Legislature</a></li>
            <li><a href="https://www.assembly.nu.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Nunavut</a></li>
            <li><a href="https://www.ola.org" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Ontario</a></li>
            <li><a href="https://www.assembly.pe.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Prince Edward Island</a></li>
            <li><a href="https://www.assnat.qc.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">National Assembly of Québec</a></li>
            <li><a href="https://www.legassembly.sk.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Legislative Assembly of Saskatchewan</a></li>
            <li><a href="https://yukonassembly.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">Yukon Legislative Assembly</a></li>
          </ul>

          <h3 className="font-semibold text-foreground">Municipal Governments</h3>
          <p>Information for municipal councillors is sourced from official city websites (e.g., toronto.ca, vancouver.ca).</p>

          <h3 className="font-semibold text-foreground">Lookup Service</h3>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <a href="https://represent.opennorth.ca" target="_blank" rel="noopener noreferrer" className="text-primary-text hover:underline">
                Represent API (by Open North)
              </a>
            </li>
          </ul>

          <h2 className="pt-1 text-headline text-foreground">4. Eligibility and acceptable use</h2>
          <p>You must be at least 13 years old to use the Service. You agree to use the Service only for lawful purposes and not to: Attempt to access data or systems without permission; Interfere with or disrupt the Service; Reverse engineer or scrape the Service in a way that violates applicable laws or third party rights; Misrepresent that the Service is official or government run.</p>

          <h2 className="pt-1 text-headline text-foreground">5. Your privacy</h2>
          <p>Our Privacy Policy explains what we collect and how we use it. Postal code lookups run on your device first using the built-in database. If a postal code is newer than that database, or you search by name, city or riding, the search text may be sent over HTTPS to the Represent API, geocoder.ca, or our search API to complete your lookup. If you tap "Use my location," your device coordinates may be sent to the Represent API. We do not create user accounts, and search text is never used for advertising or profiling. We may store recent lookups, saved representatives and search history on your device for your convenience. Read the full policy at https://canadarepfinder.vercel.app/privacy.</p>

          <h2 className="pt-1 text-headline text-foreground">6. Third party services</h2>
          <p>The Service relies on third parties, including Open North’s Represent API, geocoder.ca, OpenStreetMap map imagery, and links to official government websites. We do not control third party content or availability. Your use of third party sites and services is at your own risk and may be subject to their terms and policies.</p>

          <h2 className="pt-1 text-headline text-foreground">7. Accuracy and availability</h2>
          <p>We aim to provide accurate information, but postal code matching is not perfect and district boundaries or representative details can change. The Service is provided “as is” and “as available.” We do not guarantee accuracy, completeness, or uninterrupted operation. If you believe data is incorrect, you can contact us at santosgajadhar@gmail.com.</p>

          <h2 className="pt-1 text-headline text-foreground">8. No emergency use</h2>
          <p>Do not use the Service for emergencies. In an emergency, call your local emergency number.</p>

          <h2 className="pt-1 text-headline text-foreground">9. Intellectual property</h2>
          <p>We own the Service’s software, design, and content except for third party materials described in Section 3. You may use the Service only as permitted by these Terms. You may not copy, modify, or create derivative works from the Service except where allowed by law.</p>

          <h2 className="pt-1 text-headline text-foreground">10. App stores and devices</h2>
          <p>Your use of the mobile app may also be governed by the terms of Apple, Google, or your device manufacturer. They are not responsible for providing maintenance or support for the app. To the extent allowed by law, they have no warranty obligations regarding the app.</p>

          <h2 className="pt-1 text-headline text-foreground">11. Disclaimers and limitation of liability</h2>
          <p>To the fullest extent permitted by law, we disclaim all warranties, express or implied, including any warranties of merchantability, fitness for a particular purpose, title, and non infringement. To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits or data, arising from or related to your use of the Service. Our total liability for any claim will not exceed the greater of twenty Canadian dollars (CAD 20) or the amount you paid us, if any, for using the Service during the twelve months before the claim. Some jurisdictions do not allow certain disclaimers or limits. In those places, these terms apply only to the extent allowed by law.</p>

          <h2 className="pt-1 text-headline text-foreground">12. Changes and termination</h2>
          <p>We may change or discontinue any part of the Service at any time. We may update these Terms from time to time. When we post changes, the “Last updated” date will change. If you continue using the Service after the changes take effect, you accept the updated Terms. We may suspend or end your access if we believe you have violated these Terms or applicable law.</p>

          <h2 className="pt-1 text-headline text-foreground">13. Governing law</h2>
          <p>These Terms are governed by the laws of the Province of Ontario and the laws of Canada that apply in Ontario. Any disputes will be handled by the courts located in Ontario, Canada.</p>

          <h2 className="pt-1 text-headline text-foreground">14. Contact</h2>
          <p>Questions or concerns</p>
          <p>Name: Santos Gajadhar</p>
          <p>Email: santosgajadhar@gmail.com</p>
        </ListGroup>
      </div>

      <div className="px-4 pt-2" style={{ paddingBottom: "max(1rem, var(--s-bottom))" }}>
        <Button onClick={onAccept} className="civic-primary-button w-full">
          Accept &amp; Continue
        </Button>
      </div>
    </div>
  );
}
