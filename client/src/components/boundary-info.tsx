import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Building, Users, Landmark } from "lucide-react";

interface BoundaryData {
  url: string;
  name: string;
  boundary_set_name: string;
  external_id?: string;
  metadata?: {
    shape_area?: number;
    shape_length?: number;
    [key: string]: any;
  };
}

interface BoundaryInfoProps {
  boundaries: BoundaryData[];
  className?: string;
}

export function BoundaryInfo({ boundaries, className = "" }: BoundaryInfoProps) {
  if (!boundaries || boundaries.length === 0) {
    return null;
  }

  // Group boundaries by type for better organization
  const groupedBoundaries = boundaries.reduce((acc, boundary) => {
    const type = boundary.boundary_set_name || 'Other';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(boundary);
    return acc;
  }, {} as Record<string, BoundaryData[]>);

  const getIconForBoundaryType = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('federal') || lowerType.includes('parliament')) {
      return <Building className="h-4 w-4" />;
    } else if (lowerType.includes('provincial') || lowerType.includes('legislature')) {
      return <Landmark className="h-4 w-4" />;
    } else if (lowerType.includes('municipal') || lowerType.includes('city') || lowerType.includes('ward')) {
      return <Users className="h-4 w-4" />;
    } else {
      return <MapPin className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('federal')) {
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    } else if (lowerType.includes('provincial')) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    } else if (lowerType.includes('municipal')) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    } else {
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5" />
          Electoral Boundaries
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedBoundaries).map(([type, typeBoundaries]) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              {getIconForBoundaryType(type)}
              <Badge className={getTypeColor(type)} variant="secondary">
                {type}
              </Badge>
              <span className="text-sm text-muted-foreground">
                ({typeBoundaries.length} {typeBoundaries.length === 1 ? 'area' : 'areas'})
              </span>
            </div>
            <div className="ml-6 space-y-1">
              {typeBoundaries.map((boundary, index) => (
                <div key={`${boundary.url}-${index}`} className="text-sm">
                  <div className="font-medium text-foreground">
                    {boundary.name}
                  </div>
                  {boundary.external_id && (
                    <div className="text-xs text-muted-foreground">
                      ID: {boundary.external_id}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Total: {boundaries.length} electoral boundaries found for this location
          </div>
        </div>
      </CardContent>
    </Card>
  );
}