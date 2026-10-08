import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsPageProps {
  onAccept: () => void;
}

export function TermsPage({ onAccept }: TermsPageProps) {
  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center my-4">Terms of Use</h1>
      <ScrollArea className="flex-grow bg-white border rounded-lg p-4 text-sm">
        <p className="font-bold">Effective date: August 14, 2025</p>
        <p className="mb-4 font-bold">Last updated: September 24, 2025</p>
        
        <p className="mb-4">These Terms of Use explain the rules for using the RepFinder Canada mobile app and website (together, the “Service”). By using the Service, you agree to these Terms and to our Privacy Policy at https://canadarepfinder.vercel.app/privacy. If you do not agree, please do not use the Service.</p>

        <h2 className="text-lg font-semibold mt-4">1. Who we are</h2>
        <p className="mb-4">RepFinder Canada helps people in Canada find their federal and provincial representatives by postal code or approximate location. We are not a government entity.</p>
        <p className="font-semibold">Disclaimer of affiliation</p>
        <p className="mb-4">RepFinder Canada is not affiliated with the Government of Canada or any provincial or territorial government.</p>

        <h2 className="text-lg font-semibold mt-4">2. What the Service does</h2>
        <p className="mb-4">The Service lets you search by postal code or, if you allow it, by approximate device location to show representative details such as name, role, and public contact information. The Service is for general information. It is not legal advice, policy advice, or an official communication channel with any government.</p>

        <h2 className="text-lg font-semibold mt-4">3. Data sources and licensing</h2>
        <p className="mb-4">Representative information is provided by the Represent API operated by Open North: https://represent.opennorth.ca/. Contains information licensed under the Open Government Licence – Canada: https://open.canada.ca/en/open-government-licence-canada. When the API includes a licence link for a specific dataset, that licence applies as well.</p>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Official Data Sources</h2>
          <p>
            All information presented in the app is sourced from the following official,
            public-record websites. You can verify all data by visiting these
            sources.
          </p>

          <h3 className="font-semibold pt-2">Federal Government</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="https://www.parl.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Parliament of Canada (parl.ca)
              </a>
            </li>
            <li>
              <a href="https://www.ourcommons.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                House of Commons (ourcommons.ca)
              </a>
            </li>
            <li>
              <a href="https://www.elections.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Elections Canada (elections.ca)
              </a>
            </li>
          </ul>

          <h3 className="font-semibold pt-2">Provincial & Territorial Legislatures</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><a href="https://www.assembly.ab.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Alberta</a></li>
            <li><a href="https://www.leg.bc.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of British Columbia</a></li>
            <li><a href="https://www.leg.gov.mb.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Manitoba</a></li>
            <li><a href="https://www.legnb.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of New Brunswick</a></li>
            <li><a href="https://www.assembly.nl.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">House of Assembly of Newfoundland and Labrador</a></li>
            <li><a href="https://www.ntassembly.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of the Northwest Territories</a></li>
            <li><a href="https://nslegislature.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Nova Scotia Legislature</a></li>
            <li><a href="https://www.assembly.nu.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Nunavut</a></li>
            <li><a href="https://www.ola.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Ontario</a></li>
            <li><a href="https://www.assembly.pe.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Prince Edward Island</a></li>
            <li><a href="https://www.assnat.qc.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">National Assembly of Québec</a></li>
            <li><a href="https://www.legassembly.sk.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Legislative Assembly of Saskatchewan</a></li>
            <li><a href="https://yukonassembly.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Yukon Legislative Assembly</a></li>
          </ul>

          <h3 className="font-semibold pt-2">Municipal Governments</h3>
          <p>Information for municipal councillors is sourced from official city websites (e.g., toronto.ca, vancouver.ca).</p>

          <h3 className="font-semibold pt-2">Lookup Service</h3>
           <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="https://represent.opennorth.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Represent API (by Open North)
              </a>
            </li>
          </ul>
        </div>

        <h2 className="text-lg font-semibold mt-4">4. Eligibility and acceptable use</h2>
        <p className="mb-4">You must be at least 13 years old to use the Service. You agree to use the Service only for lawful purposes and not to: Attempt to access data or systems without permission; Interfere with or disrupt the Service; Reverse engineer or scrape the Service in a way that violates applicable laws or third party rights; Misrepresent that the Service is official or government run.</p>

        <h2 className="text-lg font-semibold mt-4">5. Your privacy</h2>
        <p className="mb-4">Our Privacy Policy explains what we collect and how we use it. Your postal code or approximate location may be sent to the Represent API to complete your lookup. We do not create user accounts. We may store recent lookups on your device for your convenience. Read the full policy at https://canadarepfinder.vercel.app/privacy.</p>

        <h2 className="text-lg font-semibold mt-4">6. Third party services</h2>
        <p className="mb-4">The Service relies on third parties, including Open North’s Represent API and links to official government websites. We do not control third party content or availability. Your use of third party sites and services is at your own risk and may be subject to their terms and policies.</p>

        <h2 className="text-lg font-semibold mt-4">7. Accuracy and availability</h2>
        <p className="mb-4">We aim to provide accurate information, but postal code matching is not perfect and district boundaries or representative details can change. The Service is provided “as is” and “as available.” We do not guarantee accuracy, completeness, or uninterrupted operation. If you believe data is incorrect, you can contact us at santosgajadhar@gmail.com.</p>

        <h2 className="text-lg font-semibold mt-4">8. No emergency use</h2>
        <p className="mb-4">Do not use the Service for emergencies. In an emergency, call your local emergency number.</p>

        <h2 className="text-lg font-semibold mt-4">9. Intellectual property</h2>
        <p className="mb-4">We own the Service’s software, design, and content except for third party materials described in Section 3. You may use the Service only as permitted by these Terms. You may not copy, modify, or create derivative works from the Service except where allowed by law.</p>

        <h2 className="text-lg font-semibold mt-4">10. App stores and devices</h2>
        <p className="mb-4">Your use of the mobile app may also be governed by the terms of Apple, Google, or your device manufacturer. They are not responsible for providing maintenance or support for the app. To the extent allowed by law, they have no warranty obligations regarding the app.</p>

        <h2 className="text-lg font-semibold mt-4">11. Disclaimers and limitation of liability</h2>
        <p className="mb-4">To the fullest extent permitted by law, we disclaim all warranties, express or implied, including any warranties of merchantability, fitness for a particular purpose, title, and non infringement. To the fullest extent permitted by law, we are not liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits or data, arising from or related to your use of the Service. Our total liability for any claim will not exceed the greater of twenty Canadian dollars (CAD 20) or the amount you paid us, if any, for using the Service during the twelve months before the claim. Some jurisdictions do not allow certain disclaimers or limits. In those places, these terms apply only to the extent allowed by law.</p>

        <h2 className="text-lg font-semibold mt-4">12. Changes and termination</h2>
        <p className="mb-4">We may change or discontinue any part of the Service at any time. We may update these Terms from time to time. When we post changes, the “Last updated” date will change. If you continue using the Service after the changes take effect, you accept the updated Terms. We may suspend or end your access if we believe you have violated these Terms or applicable law.</p>

        <h2 className="text-lg font-semibold mt-4">13. Governing law</h2>
        <p className="mb-4">These Terms are governed by the laws of the Province of Ontario and the laws of Canada that apply in Ontario. Any disputes will be handled by the courts located in Ontario, Canada.</p>

        <h2 className="text-lg font-semibold mt-4">14. Contact</h2>
        <p>Questions or concerns</p>
        <p>Name: Santos Gajadhar</p>
        <p>Email: santosgajadhar@gmail.com</p>
      </ScrollArea>
      <Button onClick={onAccept} className="mt-4 h-12 text-lg font-bold">Accept & Continue</Button>
    </div>
  );
}
