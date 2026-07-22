/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getPricePerBed } from "@/constants/pricing";

export type PGPropertyDraft = {
  name: string;
  type: "Women's PG" | "Men's PG" | "Co-living";
  city: string;
  address: string;
  totalFloors: number;
  imageFile: File | null;
  imagePreview: string | null;
};

export type PGFloorDraft = {
  id: string;
  floorNumber: number;
  name: string;
  rooms: number;
  bedsPerRoom: number;
  pricePerBed: number;
  isAc: boolean;
};

export type PGCreationResult = {
  pgId: string;
  pgName: string;
  floors: number;
  rooms: number;
  beds: number;
};

type PGSetupDraftValue = {
  property: PGPropertyDraft;
  floors: PGFloorDraft[];
  startingRoom: string;
  creationResult: PGCreationResult | null;
  updateProperty: (patch: Partial<PGPropertyDraft>) => void;
  setPropertyImage: (file: File | null) => void;
  setFloorCount: (count: number) => void;
  updateFloor: (id: string, patch: Partial<PGFloorDraft>) => void;
  addFloor: () => void;
  setStartingRoom: (value: string) => void;
  setCreationResult: (result: PGCreationResult | null) => void;
  reset: () => void;
};

const floorLabel = (floorNumber: number) => {
  if (floorNumber === 0) return "Ground Floor";
  if (floorNumber === 1) return "First Floor";
  if (floorNumber === 2) return "Second Floor";
  if (floorNumber === 3) return "Third Floor";
  return `Floor ${floorNumber}`;
};

const makeFloors = (count: number): PGFloorDraft[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `floor-${index}`,
    floorNumber: index,
    name: floorLabel(index),
    rooms: index === 0 ? 10 : 8,
    bedsPerRoom: 3,
    pricePerBed: getPricePerBed(3),
    isAc: false,
  }));

const initialProperty = (): PGPropertyDraft => ({
  name: "",
  type: "Women's PG",
  city: "",
  address: "",
  totalFloors: 3,
  imageFile: null,
  imagePreview: null,
});

const PGSetupDraftContext = createContext<PGSetupDraftValue | null>(null);

export function PGSetupDraftProvider({ children }: { children: ReactNode }) {
  const [property, setProperty] = useState<PGPropertyDraft>(initialProperty);
  const [floors, setFloors] = useState<PGFloorDraft[]>(() => makeFloors(3));
  const [startingRoom, setStartingRoomState] = useState("001");
  const [creationResult, setCreationResult] = useState<PGCreationResult | null>(null);

  const updateProperty = useCallback((patch: Partial<PGPropertyDraft>) => {
    setProperty((current) => ({ ...current, ...patch }));
  }, []);

  const setPropertyImage = useCallback((file: File | null) => {
    setProperty((current) => {
      if (current.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(current.imagePreview);
      return {
        ...current,
        imageFile: file,
        imagePreview: file ? URL.createObjectURL(file) : null,
      };
    });
  }, []);

  const setFloorCount = useCallback((count: number) => {
    const nextCount = Math.max(1, Math.min(20, count || 1));
    setProperty((current) => ({ ...current, totalFloors: nextCount }));
    setFloors((current) => {
      if (current.length === nextCount) return current;
      if (current.length > nextCount) return current.slice(0, nextCount);
      const additions = makeFloors(nextCount).slice(current.length);
      return [...current, ...additions];
    });
  }, []);

  const updateFloor = useCallback((id: string, patch: Partial<PGFloorDraft>) => {
    setFloors((current) => current.map((floor) => (floor.id === id ? { ...floor, ...patch } : floor)));
  }, []);

  const addFloor = useCallback(() => {
    setFloors((current) => {
      if (current.length >= 20) return current;
      const floorNumber = current.length;
      setProperty((value) => ({ ...value, totalFloors: floorNumber + 1 }));
      return [
        ...current,
        {
          id: `floor-${floorNumber}-${Date.now()}`,
          floorNumber,
          name: floorLabel(floorNumber),
          rooms: 1,
          bedsPerRoom: 3,
          pricePerBed: getPricePerBed(3),
          isAc: false,
        },
      ];
    });
  }, []);

  const setStartingRoom = useCallback((value: string) => {
    setStartingRoomState(value.replace(/\D/g, "").slice(0, 4));
  }, []);

  const reset = useCallback(() => {
    setProperty((current) => {
      if (current.imagePreview?.startsWith("blob:")) URL.revokeObjectURL(current.imagePreview);
      return initialProperty();
    });
    setFloors(makeFloors(3));
    setStartingRoomState("001");
    setCreationResult(null);
  }, []);

  const value = useMemo<PGSetupDraftValue>(
    () => ({
      property,
      floors,
      startingRoom,
      creationResult,
      updateProperty,
      setPropertyImage,
      setFloorCount,
      updateFloor,
      addFloor,
      setStartingRoom,
      setCreationResult,
      reset,
    }),
    [
      property,
      floors,
      startingRoom,
      creationResult,
      updateProperty,
      setPropertyImage,
      setFloorCount,
      updateFloor,
      addFloor,
      setStartingRoom,
      reset,
    ],
  );

  return <PGSetupDraftContext.Provider value={value}>{children}</PGSetupDraftContext.Provider>;
}

export function usePGSetupDraft() {
  const context = useContext(PGSetupDraftContext);
  if (!context) throw new Error("usePGSetupDraft must be used within PGSetupDraftProvider");
  return context;
}
