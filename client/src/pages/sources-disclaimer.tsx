import { Browser } from '@capacitor/browser';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe, Landmark, MapPinned, Server } from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect, useRef } from 'react';
import { ListGroup, ListRow, ListSectionLabel } from '@/components/civic';
import { Section } from '@/components/ui/section';

const openUrl = async (url: string) => {
  await Browser.open({ url });
};

const iconProps = { className: "h-[22px] w-[22px]", strokeWidth: 1.8 } as const;

interface SourceLinkProps {
  url: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  divider?: boolean;
}

function SourceLink({ url, name, description, icon, divider }: SourceLinkProps) {
  return (
    <ListRow
      icon={icon ?? <Globe {...iconProps} />}
      divider={divider}
      label={
        <span className="block min-w-0">
          <span className="block truncate text-body text-primary">{name}</span>
          {description && (
            <span className="mt-0.5 block whitespace-normal text-footnote leading-relaxed text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      }
      chevron
      onClick={() => openUrl(url)}
    />
  );
}

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
      <div className="civic-page space-y-6">
        <Section className="civic-page-header">
          <Button
            variant="ghost"
            onClick={() => setLocation('/profile')}
            className="mb-3 h-11 gap-2 rounded-full px-3 text-subheadline text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
          </Button>
          <span className="civic-kicker">Where the data comes from</span>
          <h2 className="civic-title mt-1">Sources &amp; disclaimers.</h2>
        </Section>

        <Section>
          <ListGroup>
            <div className="space-y-2 px-4 py-4">
              <h3 className="text-headline text-foreground">
                Not Affiliated with the Government of Canada
              </h3>
              <p className="text-subheadline leading-relaxed text-muted-foreground">
                RepFinder Canada is an independent application and is not
                affiliated with, sponsored by, or endorsed by any government or
                political entity. The app is designed to provide publicly available
                information in an accessible format.
              </p>
            </div>
          </ListGroup>
        </Section>

        <Section>
          <ListSectionLabel>Official data sources</ListSectionLabel>
          <ListGroup>
            <div className="space-y-2 px-4 py-4">
              <p className="text-caption1 text-muted-foreground">Last Updated: September 24, 2025</p>
              <p className="text-subheadline leading-relaxed text-muted-foreground">
                All information presented in the app is sourced from the following official,
                public-record websites. You can verify all data by visiting these
                sources. If you find a discrepancy, please check the official source linked
                here and contact us so we can update the app.
              </p>
            </div>
          </ListGroup>

          <ListGroup className="mt-4">
            <SourceLink
              url="https://www.parl.ca"
              name="Parliament of Canada (parl.ca)"
              description="Official source for Member of Parliament (MP) profiles, contact information, and roles."
              icon={<Landmark {...iconProps} />}
            />
            <SourceLink divider
              url="https://www.ourcommons.ca"
              name="House of Commons (ourcommons.ca)"
              description="Information on MP activities, parliamentary business, and committees."
              icon={<Landmark {...iconProps} />}
            />
            <SourceLink divider
              url="https://www.elections.ca"
              name="Elections Canada (elections.ca)"
              description="Definitive source for federal electoral districts and election information."
              icon={<Landmark {...iconProps} />}
            />
          </ListGroup>

          <p className="mb-2 mt-5 px-1 text-caption1 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Provincial &amp; Territorial Legislatures
          </p>
          <ListGroup>
            <SourceLink url="https://www.assembly.ab.ca" name="Legislative Assembly of Alberta" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.leg.bc.ca" name="Legislative Assembly of British Columbia" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.leg.gov.mb.ca" name="Legislative Assembly of Manitoba" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.legnb.ca" name="Legislative Assembly of New Brunswick" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.assembly.nl.ca" name="House of Assembly of Newfoundland and Labrador" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.ntassembly.ca" name="Legislative Assembly of the Northwest Territories" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://nslegislature.ca" name="Nova Scotia Legislature" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.assembly.nu.ca" name="Legislative Assembly of Nunavut" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.ola.org" name="Legislative Assembly of Ontario" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.assembly.pe.ca" name="Legislative Assembly of Prince Edward Island" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.assnat.qc.ca" name="National Assembly of Québec" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://www.legassembly.sk.ca" name="Legislative Assembly of Saskatchewan" icon={<Landmark {...iconProps} />} />
            <SourceLink divider url="https://yukonassembly.ca" name="Yukon Legislative Assembly" icon={<Landmark {...iconProps} />} />
          </ListGroup>

          <p className="mb-2 mt-5 px-1 text-caption1 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Municipal Governments
          </p>
          <ListGroup>
            <div className="px-4 py-3">
              <p className="text-subheadline leading-relaxed text-muted-foreground">
                Information for municipal councillors is sourced from official city websites (e.g., toronto.ca, vancouver.ca).
              </p>
            </div>
          </ListGroup>

          <p className="mb-2 mt-5 px-1 text-caption1 font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Lookup Service
          </p>
          <ListGroup>
            <SourceLink
              divider
              url="https://represent.opennorth.ca"
              name="Represent API (by Open North)"
              description="This non-government service is used to match postal codes to their respective electoral districts. The official sources listed above are the canonical records for representative data."
              icon={<Server {...iconProps} />}
            />
          </ListGroup>
        </Section>

        <Section>
          <ListSectionLabel>Credits</ListSectionLabel>
          <ListGroup>
            <div className="flex items-start gap-3 px-4 py-3.5">
              <MapPinned {...iconProps} />
              <p className="text-subheadline leading-relaxed text-muted-foreground">
                Created by <span className="font-semibold text-foreground">Rajin Santos Gajadhar</span> (Development).
              </p>
            </div>
          </ListGroup>
        </Section>
      </div>
    </div>
  );
}
