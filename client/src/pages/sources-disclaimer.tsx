import { Browser } from '@capacitor/browser';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect, useRef } from 'react';

const openUrl = async (url: string) => {
  await Browser.open({ url });
};

export function SourcesDisclaimer() {
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to top when component mounts
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  return (
    <div ref={containerRef} className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        {/* Back Button */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-lg border-b z-10 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/profile')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <main className="text-sm">
        <div className="rounded-xl bg-card text-card-foreground p-6 space-y-4">
          <h2 className="text-lg font-semibold">
            Not Affiliated with the Government of Canada
          </h2>
          <p>
            RepFinder Canada is an independent application and is not
            affiliated with, sponsored by, or endorsed by any government or
            political entity. The app is designed to provide publicly available
            information in an accessible format.
          </p>
        </div>

        <div className="rounded-xl bg-card text-card-foreground p-6 mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Official Data Sources</h2>
          <p className="text-xs text-muted-foreground">Last Updated: September 24, 2025</p>
          <p>
            All information presented in the app is sourced from the following official,
            public-record websites. You can verify all data by visiting these
            sources. If you find a discrepancy, please check the official source linked
            here and contact us so we can update the app.
          </p>

          <h3 className="font-semibold pt-2">Federal Government</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="#" onClick={() => openUrl('https://www.parl.ca')} className="text-primary hover:underline">
                Parliament of Canada (parl.ca)
              </a> - Official source for Member of Parliament (MP) profiles, contact information, and roles.
            </li>
            <li>
              <a href="#" onClick={() => openUrl('https://www.ourcommons.ca')} className="text-primary hover:underline">
                House of Commons (ourcommons.ca)
              </a> - Information on MP activities, parliamentary business, and committees.
            </li>
            <li>
              <a href="#" onClick={() => openUrl('https://www.elections.ca')} className="text-primary hover:underline">
                Elections Canada (elections.ca)
              </a> - Definitive source for federal electoral districts and election information.
            </li>
          </ul>

          <h3 className="font-semibold pt-2">Provincial & Territorial Legislatures</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li><a href="#" onClick={() => openUrl('https://www.assembly.ab.ca')} className="text-primary hover:underline">Legislative Assembly of Alberta</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.leg.bc.ca')} className="text-primary hover:underline">Legislative Assembly of British Columbia</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.leg.gov.mb.ca')} className="text-primary hover:underline">Legislative Assembly of Manitoba</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.legnb.ca')} className="text-primary hover:underline">Legislative Assembly of New Brunswick</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.assembly.nl.ca')} className="text-primary hover:underline">House of Assembly of Newfoundland and Labrador</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.ntassembly.ca')} className="text-primary hover:underline">Legislative Assembly of the Northwest Territories</a></li>
            <li><a href="#" onClick={() => openUrl('https://nslegislature.ca')} className="text-primary hover:underline">Nova Scotia Legislature</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.assembly.nu.ca')} className="text-primary hover:underline">Legislative Assembly of Nunavut</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.ola.org')} className="text-primary hover:underline">Legislative Assembly of Ontario</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.assembly.pe.ca')} className="text-primary hover:underline">Legislative Assembly of Prince Edward Island</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.assnat.qc.ca')} className="text-primary hover:underline">National Assembly of Québec</a></li>
            <li><a href="#" onClick={() => openUrl('https://www.legassembly.sk.ca')} className="text-primary hover:underline">Legislative Assembly of Saskatchewan</a></li>
            <li><a href="#" onClick={() => openUrl('https://yukonassembly.ca')} className="text-primary hover:underline">Yukon Legislative Assembly</a></li>
          </ul>

          <h3 className="font-semibold pt-2">Municipal Governments</h3>
          <p>Information for municipal councillors is sourced from official city websites (e.g., toronto.ca, vancouver.ca).</p>

          <h3 className="font-semibold pt-2">Lookup Service</h3>
           <ul className="list-disc pl-5 space-y-2">
            <li>
              <a href="#" onClick={() => openUrl('https://represent.opennorth.ca')} className="text-primary hover:underline">
                Represent API (by Open North)
              </a> - This non-government service is used to match postal codes to their respective electoral districts. The official sources listed above are the canonical records for representative data.
            </li>
          </ul>
        </div>

        <div className="rounded-xl bg-card text-card-foreground p-6 mt-4 space-y-4">
          <h2 className="text-lg font-semibold">Credits</h2>
          <p>
            Created by <span className="font-semibold">Rajin Santos Gajadhar</span> (Development).
          </p>
        </div>
      </main>
      </div>
    </div>
  );
}

