import { lazy, Suspense, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import {
  Building2,
  ExternalLink,
  Globe,
  Heart,
  Landmark,
  Link2,
  Loader2,
  Mail,
  Map as MapIcon,
  MapPin,
  Phone,
  Printer,
  Share2,
  X,
} from "lucide-react";
import type { ApiRepresentative } from "@shared/schema";
import { repRepository } from "@/lib/storage/repRepository";
import { repShareUrl } from "@/lib/appUrls";
import { hapticLight } from "@/lib/native-shell";
import { useToast } from "@/hooks/use-toast";
import { SafeArea } from "@/components/ui/safe-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BottomSheet,
  LevelChip,
  ListGroup,
  ListRow,
  ListSectionLabel,
  PartyBadge,
  Skeleton,
  getPositionLabel,
  hasPartyAffiliation,
} from "@/components/civic";

// RidingMap pulls in Leaflet and the map bundle — load it on first render
// of a sheet that actually shows a boundary.
const RidingMap = lazy(() =>
  import("@/components/riding-map").then((m) => ({ default: m.RidingMap })),
);

interface RepresentativeModalProps {
  representative: ApiRepresentative;
  isOpen: boolean;
  onClose: () => void;
}

export function RepresentativeModal({ representative, isOpen, onClose }: RepresentativeModalProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkSavedStatus = async () => {
      const saved = await repRepository.isSaved(representative.id);
      setIsSaved(saved);
    };

    if (isOpen) {
      checkSavedStatus();

      // Subscribe to saved changes to update status in real-time
      const unsubscribe = repRepository.subscribeSavedChanges(() => {
        checkSavedStatus();
      });

      return () => unsubscribe();
    }
  }, [representative.id, isOpen]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (isSaved) {
        await repRepository.removeRep(representative.id);
        // Don't manually set state - let the subscription handle it
        toast({
          title: "Removed from saved",
          description: "Representative removed from your saved list",
        });
      } else {
        await repRepository.saveRep(representative);
        hapticLight();
        // Don't manually set state - let the subscription handle it
        toast({
          title: "Saved successfully",
          description: "Representative added to your saved list",
        });
      }
    } catch (error) {
      console.error("Failed to update saved status:", error);
      toast({
        title: "Error",
        description: "Failed to update saved status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCall = (phone: string) => {
    const cleanPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
    window.open(`tel:${cleanPhone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_self');
  };

  const handleMap = () => {
    const ottawaAddress = `House of Commons, Ottawa, ON, Canada`;
    const constituencyAddress = `${representative.constituency}, ${representative.province}, Canada`;

    // Open multiple maps showing both office locations
    const combinedUrl = `https://maps.google.com/maps/dir/${encodeURIComponent(ottawaAddress)}/${encodeURIComponent(constituencyAddress)}`;

    window.open(combinedUrl, '_blank');
  };

  const handleShare = async () => {
    const legislatureOffice = getLegislatureOffice();
    const constituencyOffice = getConstituencyOffice();
    const legislaturePhone = getOfficePhone(legislatureOffice) || 'Not available';
    const constituencyPhone = getOfficePhone(constituencyOffice) || 'Not available';

    const title = `Contact ${representative.name}`;
    // Deep-ish link to the production web app — never the webview origin
    // (https://localhost/...), which is what window.location.href holds
    // inside the Capacitor shell.
    const url = repShareUrl(representative.id);
    const shareText = `Contact ${representative.name} - ${representative.party} ${getPositionLabel(representative.electedOffice)} for ${representative.constituency}${representative.province ? ', ' + representative.province : ''}\n\nLegislature Office: ${legislaturePhone}\nConstituency Office: ${constituencyPhone}\nEmail: ${representative.email || 'Not available'}\n\nFind your representative at: ${url}`;

    // Native shell: system share sheet via Capacitor Share.
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({ title, text: shareText, url, dialogTitle: 'Share contact' });
        return;
      } catch {
        // User dismissed the sheet (or it failed) — fall through to web paths.
      }
    }

    if (navigator.share) {
      navigator.share({
        title,
        text: shareText,
        url
      }).catch(() => {
        // Fallback if native sharing fails
        navigator.clipboard.writeText(shareText).then(() => {
          toast({
            title: "Copied to clipboard",
            description: "Contact information copied — paste it anywhere to share.",
          });
        });
      });
    } else {
      // No Web Share API — copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        toast({
          title: "Copied to clipboard",
          description: "Contact information copied — paste it anywhere to share.",
        });
      });
    }
  };

  // A real biography only — no synthesized placeholder copy.
  const biography = representative.biography?.trim() ?? "";
  // Source link shown when we cannot provide a biography, so details can
  // be verified upstream.
  const sourceUrl = representative.source || representative.website || "";

  // Parse offices from the representative data
  const offices = representative.offices as any[] || [];

  // Helper functions to get office contact information
  const getLegislatureOffice = () => {
    return offices.find(office =>
      office.type?.toLowerCase().includes('legislature') ||
      office.type?.toLowerCase().includes('parliament') ||
      office.type?.toLowerCase().includes('house of commons')
    );
  };

  const getConstituencyOffice = () => {
    return offices.find(office =>
      office.type?.toLowerCase().includes('constituency') ||
      office.type?.toLowerCase().includes('district')
    );
  };

  const getOfficePhone = (office: any) => {
    return office?.tel || office?.phone || '';
  };

  const getOfficeFax = (office: any) => {
    return office?.fax || '';
  };

  const getOfficeAddress = (office: any) => {
    if (office?.postal) {
      let address = '';
      if (office.address) address += office.address + '\n';
      if (office.city) address += office.city + ' ';
      if (office.province) address += office.province + ' ';
      if (office.postal) address += office.postal;
      return address.trim();
    }
    return '';
  };

  const iconProps = { className: "h-[22px] w-[22px]", strokeWidth: 1.8 } as const;

  const sectionLabel = (text: string) => <ListSectionLabel>{text}</ListSectionLabel>;

  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      label={`${representative.name} — representative details`}
      header={
        <div className="relative flex items-center justify-center px-2 pb-2 pt-1">
          <h2 className="truncate px-12 text-center text-headline text-foreground">
            {representative.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            // Keep the header's drag-to-dismiss zone from swallowing this press.
            onPointerDown={(event) => event.stopPropagation()}
            aria-label="Close"
            className="absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors active:bg-muted"
          >
            <X className="h-7 w-7" strokeWidth={1.8} />
          </button>
        </div>
      }
      footer={
        <SafeArea bottom className="px-4 pt-3">
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            whileTap={{ scale: 0.97 }}
            className="civic-primary-button flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Heart className="h-5 w-5" fill={isSaved ? "currentColor" : "none"} />
            )}
            {isSaved ? "Unsave Representative" : "Save Representative"}
          </motion.button>
        </SafeArea>
      }
    >
      <div className="space-y-5 px-4 pb-6 pt-2">
        {/* Identity */}
        <div className="flex flex-col items-center pb-1 pt-2 text-center">
          <Avatar className="h-20 w-20">
            {representative.photo && (
              <AvatarImage
                src={representative.photo}
                alt={`${representative.name} photo`}
                className="object-cover"
              />
            )}
            <AvatarFallback
              className="text-xl font-semibold text-muted-foreground"
              style={{ background: "var(--muted)" }}
            >
              {representative.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <h3 className="mt-3 text-title3 text-foreground">{representative.name}</h3>
          <p className="mt-0.5 text-subheadline text-muted-foreground">
            {getPositionLabel(representative.electedOffice)}
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {hasPartyAffiliation(representative.party) && representative.party && (
              <PartyBadge party={representative.party} />
            )}
            {representative.level && representative.level !== "other" && (
              <LevelChip level={representative.level} electedOffice={representative.electedOffice} />
            )}
          </div>

          <p className="mt-2 flex items-center justify-center gap-1.5 text-subheadline text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="break-words">{representative.constituency}{representative.province ? `, ${representative.province}` : ""}</span>
          </p>
        </div>

        {/* Contact — inset-grouped rows */}
        <section>
          {sectionLabel("Contact")}
          <ListGroup>
            <ListRow
              icon={<Phone {...iconProps} />}
              label={representative.phone || "Phone not available"}
              disabled={!representative.phone}
              onClick={() => representative.phone && handleCall(representative.phone)}
            />
            <ListRow
              divider
              icon={<Mail {...iconProps} />}
              label={representative.email || "Email not available"}
              disabled={!representative.email}
              href={representative.email ? `mailto:${representative.email}` : undefined}
            />
            <ListRow
              divider
              icon={<Globe {...iconProps} />}
              label="Official website"
              detail={representative.website ? undefined : "Not available"}
              chevron={Boolean(representative.website)}
              disabled={!representative.website}
              href={representative.website || undefined}
              external
            />
            <ListRow
              divider
              icon={<Share2 {...iconProps} />}
              label="Share contact"
              chevron
              onClick={handleShare}
            />
            <ListRow
              divider
              icon={<MapIcon {...iconProps} />}
              label="Directions to both offices"
              chevron
              onClick={handleMap}
            />
          </ListGroup>
        </section>

        {/* About */}
        <section>
          {sectionLabel("About")}
          <ListGroup>
            <div className="px-4 py-3">
              <p className="whitespace-pre-line break-words text-subheadline leading-relaxed text-muted-foreground">
                {biography || "Biography not available."}
              </p>
            </div>
            {sourceUrl && (
              <ListRow
                divider
                icon={<Link2 {...iconProps} />}
                label="View source"
                chevron
                href={sourceUrl}
                external
              />
            )}
          </ListGroup>
        </section>

        {/* Electoral district boundary map (lazy — Leaflet loads on demand) */}
        {representative.boundaryUrl && (
          <section>
            {sectionLabel(`Electoral district: ${representative.constituency}`)}
            <ListGroup className="p-3">
              <Suspense fallback={<Skeleton className="h-64 w-full rounded-lg" />}>
                <RidingMap
                  boundaryUrl={representative.boundaryUrl}
                  ridingName={representative.constituency}
                  province={representative.province}
                  className="relative h-64 w-full overflow-hidden rounded-lg"
                />
              </Suspense>
            </ListGroup>
            <ListGroup className="mt-3">
              <ListRow
                icon={<MapPin {...iconProps} />}
                label="View on Google Maps"
                chevron
                onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(representative.constituency + ', ' + representative.province + ', Canada')}`, '_blank')}
              />
            </ListGroup>
          </section>
        )}

        {/* Offices */}
        <section>
          {sectionLabel("Office information")}
          {offices.length === 0 && (
            <ListGroup>
              <div className="px-4 py-6 text-center text-subheadline text-muted-foreground">
                No office information available
              </div>
            </ListGroup>
          )}
          {offices.map((office: any, index: number) => {
            const phone = getOfficePhone(office);
            const fax = getOfficeFax(office);
            const address = getOfficeAddress(office);

            return (
              <ListGroup key={index} className={index > 0 ? "mt-3" : undefined}>
                <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                  <Building2 className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
                  <h4 className="text-subheadline font-semibold text-foreground">
                    {office.type || 'Office'}
                  </h4>
                </div>

                {address && (
                  <p className="whitespace-pre-line break-words px-4 pb-2 text-footnote leading-relaxed text-muted-foreground">
                    {address}
                  </p>
                )}

                {phone && (
                  <ListRow
                    divider
                    icon={<Phone {...iconProps} />}
                    label={phone}
                    onClick={() => handleCall(phone)}
                  />
                )}

                {fax && (
                  <ListRow
                    divider={Boolean(phone)}
                    icon={<Printer {...iconProps} />}
                    label={`Fax: ${fax}`}
                  />
                )}

                {office.email && (
                  <ListRow
                    divider
                    icon={<Mail {...iconProps} />}
                    label={office.email}
                    href={`mailto:${office.email}`}
                  />
                )}
              </ListGroup>
            );
          })}

          {/* Default Parliament contact — shown only for federal
              representatives with no reported offices, and labelled
              honestly as a default. */}
          {representative.level === 'federal' && offices.length === 0 && (
            <ListGroup className="mt-3">
              <div className="flex items-center gap-2 px-4 pb-1 pt-3">
                <Landmark className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.8} />
                <h4 className="text-subheadline font-semibold text-foreground">
                  Default constituency office
                </h4>
              </div>
              <p className="break-words px-4 pb-2 text-footnote leading-relaxed text-muted-foreground">
                House of Commons<br />
                Ottawa, ON K1A 0A6<br />
                Canada
              </p>
              <p className="px-4 pb-3 text-footnote leading-relaxed text-muted-foreground">
                Specific contact details are not available from our sources yet — this is
                the default Parliament address.
              </p>
              {representative.website && (
                <ListRow
                  divider
                  icon={<ExternalLink {...iconProps} />}
                  label="Check the official website"
                  chevron
                  href={representative.website}
                  external
                />
              )}
            </ListGroup>
          )}
        </section>
      </div>
    </BottomSheet>
  );
}
