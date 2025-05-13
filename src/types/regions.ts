export interface Coordinate {
  lat: number;
  lon: number;
  original: string;
}

export interface Document {
  title: string;
  url: string;
  filePath: string;
  contentPath: string;
  hasContent: boolean;
  hasLocationData: boolean;
  extractionMessages: any[];
}

export interface FishingBanRegion {
  title: string;
  url: string;
  region: string;
  content: string;
  contentHtml: string;
  documents: Document[];
} 