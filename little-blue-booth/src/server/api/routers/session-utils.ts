import type { HealthMarker } from "@prisma/client";

/**
 * A simple helper that groups markers by type and attempts
 * to parse minimal "trend" info
 */
export function parseHealthMarkersForTrends(markers: HealthMarker[]) {
  // Group by markerType
  const grouped = markers.reduce<Record<string, HealthMarker[]>>((acc, marker) => {
    if (!acc[marker.markerType]) {
      acc[marker.markerType] = [];
    }
    acc[marker.markerType].push(marker);
    return acc;
  }, {});

  const trends: Record<
    string,
    {
      earliest: number | null;
      latest: number | null;
      difference: number | null;
    }
  > = {};

  for (const [markerType, markerList] of Object.entries(grouped)) {
    // Sort by timestamp
    const sorted = markerList.sort(
      (a, b) => new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime(),
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    let earliestValue: number | null = null;
    let latestValue: number | null = null;
    let difference: number | null = null;

    // Example: assume `marker.data` holds JSON with shape { value: number }
    try {
      const firstData = JSON.parse(first.data);
      const lastData = JSON.parse(last.data);
      if (typeof firstData.value === "number") earliestValue = firstData.value;
      if (typeof lastData.value === "number") latestValue = lastData.value;
      if (earliestValue !== null && latestValue !== null) {
        difference = latestValue - earliestValue;
      }
    } catch {
      // If data isn't parseable or doesn't follow expected shape, just skip
    }

    trends[markerType] = {
      earliest: earliestValue,
      latest: latestValue,
      difference,
    };
  }

  return trends;
}
