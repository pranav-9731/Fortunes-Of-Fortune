export interface Charity {
  id: string;
  name: string;
  blurb: string;
  mediaNote: string; // stand-in for uploaded media until a real asset pipeline exists
  event: string;
}

export const DEFAULT_CHARITIES: Charity[] = [
  {
    id: "nirmal",
    name: "Nirmal Chhaya Rural Health Trust",
    blurb: "Mobile clinics across three districts.",
    mediaNote: "clinic-van-01.jpg (placeholder)",
    event: "Open golf day fundraiser — November",
  },
  {
    id: "vidya",
    name: "Vidya Setu Foundation",
    blurb: "After-school learning centres for first-gen students.",
    mediaNote: "classroom-hero.jpg (placeholder)",
    event: "Annual scholarship drive — December",
  },
  {
    id: "harit",
    name: "Harit Kal Reforestation",
    blurb: "Native tree planting along riverbanks.",
    mediaNote: "riverbank-planting.jpg (placeholder)",
    event: "Community plantation weekend — October",
  },
  {
    id: "asha",
    name: "Asha Elder Care Collective",
    blurb: "Home visits and meals for isolated seniors.",
    mediaNote: "homecare-visit.jpg (placeholder)",
    event: "Volunteer visitation day — monthly",
  },
];
