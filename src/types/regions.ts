
export interface Coordinate {
  lat: number;
  lon: number;
  original: string;
  index: number;
}

export interface TableRow {
  header: string;
  points?: Coordinate[];
}

export interface Table {
  rows: TableRow[];
}

export interface Document {
  title: string;
  url: string;
  filePath: string;
  content: string;
  header?: string;
  rows: TableRow[];
  region?: FishingBanRegion;
}

export interface FishingBanRegion {
  title: string;
  url: string;
  region: string;
  contentHtml: string;
  documents: Document[];
} 