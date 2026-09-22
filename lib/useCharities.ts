"use client";

import { useCallback, useEffect, useState } from "react";
import { Charity, DEFAULT_CHARITIES } from "./charities";

const KEY = "digitalheroes_charities_v1";

function load(): Charity[] {
  if (typeof window === "undefined") return DEFAULT_CHARITIES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fall through to defaults
  }
  return DEFAULT_CHARITIES;
}

/**
 * Shared charity directory. Both the subscriber-facing charity picker and the
 * admin "Charity management" screen read/write this same store, so an
 * add/edit/delete in admin shows up immediately for subscribers — this is the
 * PRD's single charity directory, not two separate lists.
 */
export function useCharities() {
  const [charities, setCharities] = useState<Charity[]>(DEFAULT_CHARITIES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCharities(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(charities));
    } catch (e) {
      // best effort only
    }
  }, [charities, hydrated]);

  const addCharity = useCallback((c: Omit<Charity, "id">) => {
    setCharities((list) => [...list, { ...c, id: "c" + Date.now() }]);
  }, []);

  const editCharity = useCallback((id: string, fields: Partial<Charity>) => {
    setCharities((list) => list.map((c) => (c.id === id ? { ...c, ...fields } : c)));
  }, []);

  const deleteCharity = useCallback((id: string) => {
    setCharities((list) => list.filter((c) => c.id !== id));
  }, []);

  return { charities, hydrated, addCharity, editCharity, deleteCharity };
}
