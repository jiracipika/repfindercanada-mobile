import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/use-user-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Clock, Heart, Info, Save, GitBranch, Loader2, Play, CheckCircle, XCircle } from "lucide-react";
import { Browser } from '@capacitor/browser';
import { isPlatform } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { repRepository } from "@/lib/storage/repRepository";
import { getSearchCount, subscribeActivityChanges } from "@/lib/storage/activityRepository";
import { fetchRepsByPostalBackend } from "@/lib/backendSearchService";
import {
  APP_DISCLAIMER,
  DATA_SOURCE_SINGLE,
  OFFICIAL_LINKS,
  PRIVACY_NOTE,
  ABOUT_PARAGRAPH_1,
} from '../lib/constants/appCopy';
import { Section } from "@/components/ui/section";
import { Link } from "wouter";
import type { Representative } from "@shared/schema";
import { getCacheManagementStatus, forceClearAllCaches } from "@/lib/cacheManager";

const BASE_WEB_URL = "https://canadarepfinder.vercel.app";

// Test data for development auto tester
const TEST_POSTAL_CODES = [
  { code: "M4C 1A1", expected: "Beaches East York", province: "ON" },
  { code: "V6B 5K3", expected: "Vancouver Centre", province: "BC" },
  { code: "H2X 1Y4", expected: "Laurier Saint Marie", province: "QC" },
  { code: "T6G 2R3", expected: "Edmonton Strathcona", province: "AB" },
  { code: "R3T 2N2", expected: "Winnipeg South", province: "MB" },
  { code: "S7N 3R1", expected: "Saskatoon-University", province: "SK" },
  { code: "B3H 4R2", expected: "Halifax", province: "NS" },
  { code: "E1C 5H7", expected: "Moncton-Dieppe", province: "NB" },
  { code: "G1R 2K5", expected: "Quebec Centre", province: "QC" },
  { code: "K1N 5C8", expected: "Ottawa-Vanier-Gloucester", province: "ON" },
  { code: "A1C 2Z3", expected: "St. John's East", province: "NL" },
  { code: "Y1A 2B5", expected: "Yukon", province: "YT" },
  { code: "X1A 1E2", expected: "Northwest Territories", province: "NT" },
  { code: "X0A 0H0", expected: "Nunavut", province: "NU" },
  { code: "L5L 2T1", expected: "Mississauga Erin Mills", province: "ON" },
  { code: "T2P 3G4", expected: "Calgary Centre", province: "AB" },
  { code: "V8W 1L6", expected: "Victoria", province: "BC" },
  { code: "J8X 2M7", expected: "Hull-Alymer", province: "QC" },
  { code: "N2L 3G1", expected: "Waterloo", province: "ON" },
  { code: "C1A 4R4", expected: "Charlottetown", province: "PE" },
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
  if (isPlatform('capacitor')) {
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

  // Development environment check
  const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

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

  // Auto tester function
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
        console.log(`[AutoTest] Testing ${testCase.code} (${testCase.province})`);

        // Use our hybrid geocoder + Represent API implementation
        const representatives: Representative[] = await fetchRepsByPostalBackend(testCase.code);

        // Find federal representative (MP)
        const federalRep = representatives.find(rep =>
          rep.electedOffice === "MP" ||
          rep.level === "Federal" ||
          rep.rep_set?.toLowerCase().includes("house of commons")
        );

        if (federalRep) {
          result.actual = federalRep.constituency;
          result.repName = federalRep.name;

          // Extract coordinates from representative data if available
          if (federalRep.latitude && federalRep.longitude) {
            result.coordinates = { lat: federalRep.latitude, lon: federalRep.longitude };
          }

          // Check if result matches expected (allowing for some variations)
          const expectedLower = testCase.expected.toLowerCase();
          const actualLower = federalRep.constituency.toLowerCase();

          result.passed = actualLower.includes(expectedLower.split(' ')[0]) ||
                         expectedLower.includes(actualLower.split(' ')[0]);
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
      await new Promise(resolve => setTimeout(resolve, 100));
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
    }
  };

  if (isLoading) {
    return (
      <Section className="pt-8 pb-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground mt-2">Loading profile...</p>
      </Section>
    );
  }

  if (!userData) {
    return (
      <Section className="pt-8 pb-4 text-center">
        <p className="text-destructive">Error: No user data found.</p>
      </Section>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="space-y-6 px-4 pt-8 pb-32">
        <Section className="pt-8 pb-4">
          <h2
            className="text-3xl font-bold text-center cursor-pointer select-none active:scale-95 transition-transform"
            onClick={handleProfileTitleTap}
          >
            Profile
          </h2>
        </Section>

        {/* Edit Profile Form */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Home Postal Code</Label>
              <Input id="postalCode" value={homePostalCode} onChange={(e) => setHomePostalCode(e.target.value)} placeholder="A1A 1A1" />
            </div>
            <Button onClick={handleSave} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </CardContent>
          </Card>
        </Section>

        {/* User Stats */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Activity — {searchCount} searches
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{searchCount}</div>
                <div className="text-sm text-muted-foreground">Searches</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{savedRepCount}</div>
                <div className="text-sm text-muted-foreground">Saved</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Last search: {userData.lastPostalCodeSearch || userData.lastNameSearch || "No recent search"}</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              <span>Member since: {new Date(userData.joinDate).toLocaleDateString()}</span>
            </div>
          </CardContent>
          </Card>
        </Section>

        {/* App Information */}
        <Section>
          <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              App Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GitBranch className="h-4 w-4 shrink-0" />
              <span>Version: {cacheStatus?.currentVersion || '3.0.0'}</span>
            </div>

            {/* Cache Management Status */}
            {cacheStatus && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Cache Status:</span>
                  <Badge variant={cacheStatus.shouldPreserveCache ? "default" : "secondary"}>
                    {cacheStatus.shouldPreserveCache ? "Preserved" : "Clearable"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>Last processed: {cacheStatus.lastProcessedVersion || 'Never'}</div>
                  <div>
                    {cacheStatus.shouldPreserveCache
                      ? "Cache is preserved for v>3.0.0"
                      : "Cache will be cleared for v≤3.0.0"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleClearCache}
                  disabled={isClearingCache}
                >
                  {isClearingCache ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Clearing Cache...
                    </>
                  ) : (
                    <>
                      <GitBranch className="h-4 w-4 mr-2" />
                      Clear All Caches
                    </>
                  )}
                </Button>
              </div>
            )}

            <Link href="/sources-disclaimer">
              <Button variant="outline" className="w-full justify-start">
                <Info className="h-4 w-4 mr-2" />
                Sources & Disclaimers
              </Button>
            </Link>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/privacy')}>
              <Heart className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => openExternal('/terms')}>
              <Info className="h-4 w-4 mr-2" />
              Terms of Service
            </Button>
          </CardContent>
          </Card>
        </Section>

        {/* Developer Options - Hidden until enabled */}
        {showDevOptions && (
          <Section>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Developer Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800">
                    Developer options enabled! These tools are for testing and debugging purposes.
                  </span>
                </div>

                {/* Development Auto Tester */}
                {(isDevelopment || showDevOptions) && (
                  <div className="space-y-4">
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Play className="h-4 w-4" />
                        Auto Tester
                      </h4>
                      <p className="text-sm text-muted-foreground mb-4">
                        Test hybrid geocoder + Represent API implementation with sample postal codes from across Canada.
                      </p>

                      <Button
                        onClick={runAutoTest}
                        disabled={isTesting}
                        className="w-full"
                        variant={isTesting ? "secondary" : "default"}
                      >
                        {isTesting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testing... ({testProgress.current}/{testProgress.total})
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Run Auto Test ({TEST_POSTAL_CODES.length} postal codes)
                          </>
                        )}
                      </Button>

                      {testResults.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center gap-2 mb-3">
                            <h3 className="text-sm font-semibold">Test Results</h3>
                            <Badge variant="outline">
                              {testResults.filter(r => r.passed).length}/{testResults.length} passed
                            </Badge>
                          </div>

                          <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
                            {testResults.map((result, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border text-sm ${
                                  result.passed
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className="mt-0.5">
                                    {result.passed ? (
                                      <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-red-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
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
                                          <span className="text-xs font-mono">
                                            {result.coordinates.lat.toFixed(4)}, {result.coordinates.lon.toFixed(4)}
                                          </span>
                                        </div>
                                      )}

                                      {result.error && (
                                        <div className="text-xs text-red-600 mt-1">
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
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Cache Management
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Force clear all caches for testing purposes.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleClearCache}
                    disabled={isClearingCache}
                  >
                    {isClearingCache ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Clearing All Caches...
                      </>
                    ) : (
                      <>
                        <GitBranch className="h-4 w-4 mr-2" />
                        Force Clear All Caches
                      </>
                    )}
                  </Button>
                </div>

                {/* Disable Developer Options */}
                <div className="border-t pt-4">
                  <Button
                    variant="destructive"
                    size="sm"
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
              </CardContent>
            </Card>
          </Section>
        )}
      </div>
    </div>
  );
}
