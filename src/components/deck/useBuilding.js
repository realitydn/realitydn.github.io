import { useMemo } from 'react';
import useFeed from '../../hooks/useFeed';
import useNow from '../../hooks/useNow';
import { buildingNow } from '../../data/deck/building';
import { ictClock, openNow } from '../../data/deck/open-hours';
import { isDealEvent } from '../../data/event-category';
import { isStill } from './parts';

// useBuilding — what the building is doing right now, for the card face and
// the opened card: the shared events feed (no extra fetch) read against the
// minute clock. `live` is false in the static HTML (parts.jsx isStill): the
// capture shows the building dark and states the hours, never a baked "now".
export default function useBuilding() {
  const { events, loading } = useFeed();
  const now = useNow();
  const live = !isStill();
  const state = useMemo(
    () => buildingNow(live ? events : [], { now, isDeal: isDealEvent }),
    [events, now, live]
  );
  return { state, events, loading, now, live, clock: ictClock(now), hours: openNow(now) };
}
