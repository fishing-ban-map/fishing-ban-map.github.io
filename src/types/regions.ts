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
  filename: string;
  extractedAt: string;
  content: {
    text: string;
    html: string;
    tables: Table[];
  };
  title?: string;
  url?: string;
  filePath?: string;
  contentPath: string;
  hasContent: boolean;
  extractionMessages?: Array<{
    type: string;
    message: string;
  }>;
}

export interface FishingBanRegion {
  title: string;
  url: string;
  region: string;
  content: string;
  contentHtml: string;
  documents: Document[];
} 