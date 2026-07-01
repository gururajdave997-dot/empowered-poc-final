export type Role = "Admin" | "ResourceManager" | "DeliveryManager" | "HR" | "Leadership" | "Viewer";

export type AvailabilityStatus =
  | "Available Now"
  | "Available in 15 Days"
  | "Available in 30 Days"
  | "Available in 60 Days"
  | "Available in 90 Days"
  | "Allocated";

// Merged resource row (Skill Management Report + Time Sheet, joined on employeeCode)
export interface Resource {
  employeeCode: string;
  name: string;
  department: string;
  businessUnit: string;
  band: string;              // Band 3..7
  experience: number;        // years
  // from Skill Management Report
  primarySkill: string;
  secondarySkill: string;
  certifications: string[];
  proficiency: number;       // 1..5
  // from Time Sheet
  currentProject: string;
  allocationPct: number;     // 0..100+
  timesheetHours: number;
  availableDate: string;     // ISO date
  availabilityStatus: AvailabilityStatus;
}

export interface FinderQuery {
  skills: string[];
  minExperience?: number;
  band?: string;
  department?: string;
  certification?: string;
  availabilityWindowDays?: number;
}

export interface FinderResult extends Resource {
  score: number;
  reason: string;
}
