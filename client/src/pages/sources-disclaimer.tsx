import { Header } from "@/components/header";

export function SourcesDisclaimer() {
  return (
    <div className="pb-20">
      <Header title="Sources & Disclaimers" />
      <main className="container mx-auto p-4 text-sm">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            Not Affiliated with the Government of Canada
          </h2>
          <p>
            Rep Finder for Canada is an independent application and is not
            affiliated with, sponsored by, or endorsed by any government or
            political entity. The app is designed to provide publicly available
            information in an accessible format.
          </p>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Official Data Sources</h2>
          <p className="text-xs text-gray-500">Last Updated: September 24, 2025</p>
          <p>
            All information presented in the app is sourced from the following official,
            public-record websites. You can verify all data by visiting these
            sources. If you find a discrepancy, please check the official source linked
            here and contact us so we can update the app.
          </p>

          <h3 className="font-semibold pt-2">Federal Government</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="https://www.parl.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Parliament of Canada (parl.ca)
              </a> - Official source for Member of Parliament (MP) profiles, contact information, and roles.
            </li>
            <li>
              <a href="https://www.ourcommons.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                House of Commons (ourcommons.ca)
              </a> - Information on MP activities, parliamentary business, and committees.
            </li>
            <li>
              <a href="https://www.elections.ca" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Elections Canada (elections.ca)
              </a> - Definitive source for federal electoral districts and election information.
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
              </a> - This non-government service is used to match postal codes to their respective electoral districts. The official sources listed above are the canonical records for representative data.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
