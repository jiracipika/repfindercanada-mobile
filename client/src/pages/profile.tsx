import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  GitBranch,
  Heart,
  Info,
  Loader2,
  MapPin,
  Play,
  Save,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { repRepository } from "@/lib/storage/repRepository";
import { getSearchCount, subscribeActivityChanges } from "@/lib/storage/activityRepository";
import { fetchRepsByPostalCodeDirect } from "@/lib/representApiService";
import { Section } from "@/components/ui/section";
import { Link } from "wouter";
import type { ApiRepresentative as Representative } from "@shared/schema";
import { getCacheManagementStatus, forceClearAllCaches } from "@/lib/cacheManager";
import { ListGroup, ListRow, ListSectionLabel, Skeleton } from "@/components/civic";
import { APP_VERSION } from "@/version";
import { runDevSelfTest } from "@/lib/dev-selftest";

const BASE_WEB_URL = "https://canadarepfinder.vercel.app";

// Test data for development auto tester - updated for local database + Represent API
const TEST_POSTAL_CODES = [
  { code: "V2H1L5", expected: "Kamloops—Thompson—Nicola", province: "BC" },
  { code: "E6G0B1", expected: "Nackawic", province: "NB" },
  { code: "T6T0Y4", expected: "Edmonton-Ellerslie", province: "AB" },
  { code: "L3M0B4", expected: "Ward 3", province: "ON" },
  { code: "V3T1N2", expected: "Surrey", province: "BC" },
  { code: "V2M6K8", expected: "Cariboo—Prince George", province: "BC" },
  { code: "J6S2M3", expected: "Beauharnois—Salaberry—Soulanges—Huntingdon", province: "QC" },
  { code: "J1M2A2", expected: "Compton—Stanstead", province: "QC" },
  { code: "K1J7R8", expected: "Rideau-Rockcliffe", province: "ON" },
  { code: "V2A1N6", expected: "Similkameen—South Okanagan—West Kootenay", province: "BC" },
  { code: "N0M2N0", expected: "Lambton", province: "ON" },
  { code: "L2E0A3", expected: "Niagara Falls", province: "ON" },
  { code: "V7K2H9", expected: "North Vancouver—Capilano", province: "BC" },
  { code: "N6J3P4", expected: "London West", province: "ON" },
  { code: "K6J3M7", expected: "Stormont—Dundas—South Glengarry", province: "ON" },
  { code: "J1L2X5", expected: "Sherbrooke", province: "QC" },
  { code: "G8B3R4", expected: "Lac-Saint-Jean", province: "QC" },
  { code: "P6B2B2", expected: "Sault Ste. Marie", province: "ON" },
  { code: "J7M2B2", expected: "District 2", province: "QC" },
  { code: "M1C5E9", expected: "Scarborough-Guildwood-Rouge Park", province: "ON" }
];

interface TestResult {
  code: string;
  expected: string;
  province: string;
  coordinates?: { lat: number; lon: number };
  actual?: string;
  repName?: string;
  passed?: boolean;
  error?: string;
}

const openExternal = async (url: string) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_WEB_URL}${url}`;
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: fullUrl });
  } else {
    window.open(fullUrl, '_blank');
  }
};

export default function Profile() {
  const { userData, isLoading, updateProfile } = useUserData();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [homePostalCode, setHomePostalCode] = useState("");
  const [savedRepCount, setSavedRepCount] = useState(0);
  const [searchCount, setSearchCount] = useState(0);

  // Auto tester states
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testProgress, setTestProgress] = useState({ current: 0, total: 0 });

  // Cache management state
  const [cacheStatus, setCacheStatus] = useState<{
    currentVersion: string;
    lastProcessedVersion: string | null;
    shouldPreserveCache: boolean;
  } | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Developer options state
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDevOptions, setShowDevOptions] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);

  // Development environment check. IMPORTANT: the native Capacitor shell
  // serves the app from https://localhost, so a hostname check would read
  // as "development" inside PRODUCTION builds — import.meta.env.DEV only.
  const isDevelopment = import.meta.env.DEV;

  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setHomePostalCode(userData.homePostalCode || "");
    }
  }, [userData]);

  // Load saved rep count from repRepository
  useEffect(() => {
    const loadSavedCount = async () => {
      const reps = await repRepository.listSavedReps();
      setSavedRepCount(reps.length);
    };
    loadSavedCount();

    // Subscribe to saved changes
    const unsubscribe = repRepository.subscribeSavedChanges(() => {
      loadSavedCount();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load search count from activity service
  useEffect(() => {
    const loadSearchCount = async () => {
      const count = await getSearchCount();
      setSearchCount(count);
    };
    loadSearchCount();

    // Subscribe to activity changes
    const unsubscribe = subscribeActivityChanges(() => {
      loadSearchCount();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load cache management status
  useEffect(() => {
    const loadCacheStatus = async () => {
      try {
        const status = await getCacheManagementStatus();
        setCacheStatus(status);
      } catch (error) {
        console.error('[Profile] Error loading cache status:', error);
      }
    };
    loadCacheStatus();
  }, []);

  const handleSave = () => {
    updateProfile(name, homePostalCode);
    toast({
      title: "Profile saved",
      description: "Your profile has been updated.",
    });
  };

  // Auto tester function - updated to use local database + Represent API (same as mobile app)
  const runAutoTest = async () => {
    setIsTesting(true);
    setTestProgress({ current: 0, total: TEST_POSTAL_CODES.length });
    setTestResults([]);

    const results: TestResult[] = [];

    for (let i = 0; i < TEST_POSTAL_CODES.length; i++) {
      const testCase = TEST_POSTAL_CODES[i];
      setTestProgress({ current: i + 1, total: TEST_POSTAL_CODES.length });

      const result: TestResult = {
        code: testCase.code,
        expected: testCase.expected,
        province: testCase.province
      };

      try {

        // Use direct local database + Represent API implementation (same as mobile app)
        const searchResult = await fetchRepsByPostalCodeDirect(testCase.code);
        const representatives = searchResult.representatives;

        // Extract coordinates from geocoding result
        if (searchResult.geocoding) {
          result.coordinates = {
            lat: searchResult.geocoding.latitude,
            lon: searchResult.geocoding.longitude
          };
        }

        // Find federal representative (MP) - updated for new data structure
        const federalRep = representatives.find(rep =>
          rep.level === 'federal' ||
          rep.office?.toLowerCase().includes('mp') ||
          rep.extra?.representativeSetName?.toLowerCase().includes('house of commons')
        );

        if (federalRep) {
          result.actual = federalRep.riding || federalRep.constituency || '';
          result.repName = federalRep.name;

          // Check if result matches expected (allowing for some variations)
          const expectedLower = testCase.expected.toLowerCase();
          const actualLower = (federalRep.riding || '').toLowerCase();

          result.passed = actualLower.includes(expectedLower.split(' ')[0]) ||
                         expectedLower.includes(actualLower.split(' ')[0]) ||
                         expectedLower.includes(actualLower) ||
                         actualLower.includes(expectedLower);
        } else {
          result.error = "No federal representative found";
          result.passed = false;
        }
      } catch (error) {
        result.error = error instanceof Error ? error.message : 'Unknown error';
        result.passed = false;
        console.error(`[AutoTest] Error testing ${testCase.code}:`, error);
      }

      results.push(result);
      setTestResults([...results]);

      // Small delay between requests to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsTesting(false);

    // Calculate pass rate
    const passCount = results.filter(r => r.passed).length;
    const passRate = ((passCount / results.length) * 100).toFixed(1);

    toast({
      title: "Auto Test Complete",
      description: `${passCount}/${results.length} tests passed (${passRate}% pass rate)`,
    });
  };

  // Handle cache clearing
  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      await forceClearAllCaches();
      toast({
        title: "Cache Cleared",
        description: "All caches have been successfully cleared.",
      });
      // Reload cache status
      const status = await getCacheManagementStatus();
      setCacheStatus(status);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cache. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearingCache(false);
    }
  };

  // Handle developer options activation
  const handleProfileTitleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    // Reset if more than 3 seconds between taps
    if (timeSinceLastTap > 3000) {
      setDevTapCount(1);
    } else {
      setDevTapCount(prev => prev + 1);
    }

    setLastTapTime(now);

    // Show toast feedback for taps
    const newCount = timeSinceLastTap > 3000 ? 1 : devTapCount + 1;

    if (newCount < 7) {
      const remaining = 7 - newCount;
      toast({
        title: `Developer Options`,
        description: `Tap ${remaining} more time${remaining > 1 ? 's' : ''} to enable`,
        duration: 1000,
      });
    }

    // Enable developer options after 7 taps
    if (newCount >= 7) {
      setShowDevOptions(true);
      setDevTapCount(0);
      toast({
        title: "Developer Options Enabled! 🎉",
        description: "You now have access to developer tools",
        duration: 3000,
      });
      // DEV-only offline smoke (postal validation, share URLs, PWA wiring).
      // Not in prod bundles: both this branch and dev-selftest tree-shake.
      if (import.meta.env.DEV) {
        const result = runDevSelfTest();
        toast({
          title: `Self-test: ${result.passed} passed`,
          description: result.failed.length ? `Failed: ${result.failed.join(", ")}` : "All checks green — see console",
          duration: 4000,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="civic-page space-y-4" aria-busy="true">
          <Section className="civic-page-header">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-3 h-9 w-56" />
          </Section>
          <Section>
            <Skeleton className="h-48 w-full rounded-xl" />
          </Section>
          <Section>
            <Skeleton className="h-40 w-full rounded-xl" />
          </Section>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <Section className="pt-8 pb-4 text-center">
        <p className="text-subheadline" style={{ color: "var(--destructive)" }}>Error: No user data found.</p>
      </Section>
    );
  }

  return (
    <div className="h-full overflow-y-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="civic-page space-y-6">
        <Section className="civic-page-header">
          <span className="civic-kicker">Preferences and privacy</span>
          <h2
            className="civic-title cursor-pointer select-none active:scale-[.98] transition-transform"
            onClick={handleProfileTitleTap}
          >
            Your profile.
          </h2>
          <p className="civic-lede">Save a home postal code on this device and manage your local activity.</p>
        </Section>

        {/* Edit Profile Form */}
        <Section>
          <ListSectionLabel>Edit profile</ListSectionLabel>
          <Card className="space-y-4 p-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Home Postal Code</Label>
              <Input
                id="postalCode"
                value={homePostalCode}
                onChange={(e) => setHomePostalCode(e.target.value.toUpperCase())}
                placeholder="A1A 1A1"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="done"
                maxLength={7}
              />
            </div>
            <Button onClick={handleSave} className="civic-primary-button w-full gap-2">
              <Save className="h-4 w-4" />
              Save Profile
            </Button>
          </Card>
        </Section>

        {/* User Stats */}
        <Section>
          <ListSectionLabel>Your activity</ListSectionLabel>
          <ListGroup>
            <ListRow
              icon={<MapPin className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Searches"
              detail={String(searchCount)}
            />
            <ListRow
              divider
              icon={<Heart className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Saved representatives"
              detail={String(savedRepCount)}
            />
            <ListRow
              divider
              icon={<Clock className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Last search"
              detail={userData.lastPostalCodeSearch || userData.lastNameSearch || "None yet"}
              labelClassName="text-subheadline"
            />
            <ListRow
              divider
              icon={<User className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Member since"
              detail={new Date(userData.joinDate).toLocaleDateString()}
              labelClassName="text-subheadline"
            />
          </ListGroup>
        </Section>

        {/* App Information */}
        <Section>
          <ListSectionLabel>App information</ListSectionLabel>
          <ListGroup>
            <ListRow
              icon={<GitBranch className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Version"
              detail={cacheStatus?.currentVersion || APP_VERSION}
            />
            {cacheStatus && (
              <ListRow
                divider
                icon={<Info className="h-[22px] w-[22px]" strokeWidth={1.8} />}
                label="Cache status"
                detail={
                  <Badge variant={cacheStatus.shouldPreserveCache ? "default" : "secondary"}>
                    {cacheStatus.shouldPreserveCache ? "Preserved" : "Clearable"}
                  </Badge>
                }
              />
            )}
            {cacheStatus && (
              <div className="px-4 py-2.5">
                <div className="text-caption1 text-muted-foreground">
                  <div>Last processed: {cacheStatus.lastProcessedVersion || 'Never'}</div>
                  <div>
                    {cacheStatus.shouldPreserveCache
                      ? "Cache is preserved for v>3.0.0"
                      : "Cache will be cleared for v≤3.0.0"}
                  </div>
                </div>
              </div>
            )}
            {cacheStatus && (
              <ListRow
                divider
                icon={isClearingCache
                  ? <Loader2 className="h-[22px] w-[22px] animate-spin" strokeWidth={1.8} />
                  : <GitBranch className="h-[22px] w-[22px]" strokeWidth={1.8} />}
                label={isClearingCache ? "Clearing caches…" : "Clear all caches"}
                onClick={handleClearCache}
                disabled={isClearingCache}
              />
            )}
            <Link href="/sources-disclaimer">
              <ListRow
                divider
                icon={<Info className="h-[22px] w-[22px]" strokeWidth={1.8} />}
                label="Sources & Disclaimers"
                chevron
              />
            </Link>
            <ListRow
              divider
              icon={<Heart className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Privacy Policy"
              chevron
              onClick={() => openExternal('/privacy')}
            />
            <ListRow
              divider
              icon={<Info className="h-[22px] w-[22px]" strokeWidth={1.8} />}
              label="Terms of Service"
              chevron
              onClick={() => openExternal('/terms')}
            />
          </ListGroup>
        </Section>

        {/* Developer Options - Hidden until enabled */}
        {showDevOptions && (
          <Section>
            <ListSectionLabel>Developer options</ListSectionLabel>
            <Card className="space-y-5 p-4">
              <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                <Info className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-subheadline text-foreground">
                  Developer options enabled! These tools are for testing and debugging purposes.
                </span>
              </div>

              {/* Development Auto Tester — DEV builds only (import.meta.env.DEV);
                  it fires 20 live Represent API requests per run. */}
              {isDevelopment && (
                <div className="space-y-4">
                  <div className="border-t border-border pt-4">
                    <h4 className="mb-3 flex items-center gap-2 text-subheadline font-semibold text-foreground">
                      <Play className="h-4 w-4" />
                      Auto Tester
                    </h4>
                    <p className="mb-4 text-subheadline text-muted-foreground">
                      Test local postal database + Represent API implementation (same as mobile app) with sample postal codes from across Canada.
                    </p>

                    <Button
                      onClick={runAutoTest}
                      disabled={isTesting}
                      className="w-full gap-2"
                      variant={isTesting ? "secondary" : "default"}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Testing... ({testProgress.current}/{testProgress.total})
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Run Auto Test ({TEST_POSTAL_CODES.length} postal codes)
                        </>
                      )}
                    </Button>

                    {testResults.length > 0 && (
                      <div className="mt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <h3 className="text-subheadline font-semibold text-foreground">Test Results</h3>
                          <Badge variant="outline">
                            {testResults.filter(r => r.passed).length}/{testResults.length} passed
                          </Badge>
                        </div>

                        <div className="max-h-96 space-y-2 overflow-y-auto rounded-xl p-3" style={{ background: "var(--muted)" }}>
                          {testResults.map((result, index) => (
                            <div
                              key={index}
                              className="rounded-xl p-3 text-subheadline"
                              style={{
                                background: result.passed
                                  ? "color-mix(in srgb, var(--civic-mint) 12%, transparent)"
                                  : "color-mix(in srgb, var(--destructive) 12%, transparent)",
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5">
                                  {result.passed ? (
                                    <CheckCircle className="h-4 w-4" style={{ color: "var(--civic-mint)" }} />
                                  ) : (
                                    <XCircle className="h-4 w-4" style={{ color: "var(--destructive)" }} />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-1 flex items-center gap-2">
                                    <span className="font-mono font-semibold">{result.code}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {result.province}
                                    </Badge>
                                  </div>

                                  <div className="space-y-1">
                                    <div>
                                      <span className="text-xs text-muted-foreground">Expected: </span>
                                      <span className="text-xs font-medium">{result.expected}</span>
                                    </div>

                                    {result.actual && (
                                      <div>
                                        <span className="text-xs text-muted-foreground">Actual: </span>
                                        <span className="text-xs font-medium">{result.actual}</span>
                                      </div>
                                    )}

                                    {result.repName && (
                                      <div>
                                        <span className="text-xs text-muted-foreground">Rep: </span>
                                        <span className="text-xs">{result.repName}</span>
                                      </div>
                                    )}

                                    {result.coordinates && (
                                      <div>
                                        <span className="text-xs text-muted-foreground">Coords: </span>
                                        <span className="font-mono text-xs">
                                          {result.coordinates.lat.toFixed(4)}, {result.coordinates.lon.toFixed(4)}
                                        </span>
                                      </div>
                                    )}

                                    {result.error && (
                                      <div className="mt-1 text-xs" style={{ color: "var(--destructive)" }}>
                                        Error: {result.error}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Force Clear Cache Button */}
              <div className="border-t border-border pt-4">
                <h4 className="mb-3 flex items-center gap-2 text-subheadline font-semibold text-foreground">
                  <GitBranch className="h-4 w-4" />
                  Cache Management
                </h4>
                <p className="mb-4 text-subheadline text-muted-foreground">
                  Force clear all caches for testing purposes.
                </p>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                >
                  {isClearingCache ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Clearing All Caches...
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4" />
                      Force Clear All Caches
                    </>
                  )}
                </Button>
              </div>

              {/* Disable Developer Options */}
              <div className="border-t border-border pt-4">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setShowDevOptions(false);
                    toast({
                      title: "Developer Options Disabled",
                      description: "Tap the Profile title 7 times to re-enable",
                      duration: 2000,
                    });
                  }}
                >
                  Disable Developer Options
                </Button>
              </div>
            </Card>
          </Section>
        )}
      </div>
    </div>
  );
}
