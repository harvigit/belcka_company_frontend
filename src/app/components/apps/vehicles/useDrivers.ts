"use client";
import { DriverOption } from "./useVehicles";

// TEMPORARY static employees for the UI. Replace with the company employee list once the backend is ready.
const SAMPLE_DRIVERS: DriverOption[] = [
  { id: 101, name: "Jamie Storeman" },
  { id: 102, name: "Morgan Buyer" },
  { id: 103, name: "Jordan Supervisor" },
  { id: 104, name: "Sam Carpenter" },
  { id: 105, name: "Casey Commercial" },
  { id: 106, name: "Alex Finance" },
  { id: 107, name: "Robin People" },
];

// Company employees who can be given a vehicle.
export function useDrivers(_companyId?: number | null) {
  return SAMPLE_DRIVERS;
}
