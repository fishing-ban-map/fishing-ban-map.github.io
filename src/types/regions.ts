export interface Coordinate {
  lat: number;
  lon: number;
  original: string;
  index: number;
}

export interface TableRow {
  type?: string;
  original?: string;
  points?: Coordinate[];
  text?: string;
}

export interface Table {
  index: number;
  headers: string[];
  rows: (string | TableRow)[][];
}

export interface Document {
  title: string;
  url: string;
  filePath: string;
  content: string;
}

export interface FishingBanRegion {
  title: string;
  url: string;
  region: string;
  contentHtml: string;
  documents: Document[];
} 