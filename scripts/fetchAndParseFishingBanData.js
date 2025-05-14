import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import mammoth from 'mammoth';

// Get current file's directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const url = 'https://moktu.fish.gov.ru/activities/rybookhrana/vnimanie-nerest/';
const dataDir = path.join(__dirname, '..', 'data');
const regionsDir = path.join(dataDir, 'regions');

// Ensure the data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Function to ensure region directory exists and return paths
function getRegionPaths(regionName) {
  const safeName = createSafeFilename(regionName);
  const regionDir = path.join(regionsDir, safeName);
  const htmlDir = path.join(regionDir, 'html');
  const documentsDir = path.join(regionDir, 'documents');

  // Create directories if they don't exist
  [regionDir, htmlDir, documentsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  return {
    regionDir,
    htmlDir,
    documentsDir,
    safeName
  };
}

// Function to fetch a URL and return its content
function fetchUrl(url, isBuffer = false) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        if (isBuffer) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(Buffer.concat(chunks).toString('utf-8'));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Function to save content to a file
function saveToFile(filePath, content) {
  fs.writeFileSync(filePath, content);
}

// Function to create a safe filename
function createSafeFilename(name) {
  // Transliteration map for Cyrillic characters
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };

  return name
    .toLowerCase()
    .split('')
    .map(char => translitMap[char] || char)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

// Function to parse points from text
function parsePoints(text) {
  // Remove extra spaces and normalize line endings
  text = text.replace(/\s+/g, ' ').trim();
  
  // If text is empty, return empty array
  if (!text) return [];

  let points = [];

  // Try to split by different patterns
  if (text.match(/^\d+\./m)) {
    // Numbered list (1. 2. 3.)
    points = text.split(/\d+\.\s*/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  } else if (text.match(/^[а-я]\)/mi)) {
    // Lettered list (а) б) в))
    points = text.split(/[а-я]\)\s*/i)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  } else if (text.includes(';')) {
    // Semicolon separated
    points = text.split(';')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  } else if (text.includes('–')) {
    // Dash separated
    points = text.split('–')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  } else if (text.includes('-')) {
    // Hyphen separated (fallback)
    points = text.split('-')
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }

  // If no points were detected, return the original text as a single point
  return points.length > 0 ? points : [text];
}

// Function to check if text contains a list of points
function containsPointsList(text) {
  // Common patterns that indicate a list
  const patterns = [
    /\d+\./,           // Numbered list (1. 2. 3.)
    /[а-я]\)/i,        // Lettered list (а) б) в))
    /;\s+/,            // Semicolon separated with space
    /\s+[-–]\s+/,      // Dash/hyphen with spaces
  ];

  return patterns.some(pattern => pattern.test(text));
}

// Function to convert DMS to decimal degrees
function dmsToDecimal(degrees, minutes, seconds) {
  return degrees + (minutes / 60) + (seconds / 3600);
}

// Function to parse coordinate point
function parseCoordinate(coordText) {
  // Match pattern: degrees°minutes'seconds,decimals" direction
  const pattern = /(\d+)°(\d+)'(\d+,\d+)"\s*(с\.ш\.|в\.д\.)/g;
  const matches = [...coordText.matchAll(pattern)];
  
  if (matches.length === 0) return null;

  return matches.map(match => {
    const [_, degrees, minutes, seconds, direction] = match;
    const decimal = dmsToDecimal(
      parseInt(degrees),
      parseInt(minutes),
      parseFloat(seconds.replace(',', '.'))
    );
    return {
      decimal,
      direction: direction === 'с.ш.' ? 'N' : 'E'
    };
  });
}

const pointPattern = /(?:\d+\.\s*)?(\d+°\d+'[\d,]+"\s*с\.ш\.?\s*\d+°\d+'[\d,]+"\s*в\.д\.?)/g;

// Function to parse coordinate points list
function parseCoordinatePoints(text) {
  // Remove extra spaces and normalize line endings
  text = text.replace(/\s+/g, ' ').trim();

  console.log(text)
  
  const points = [...text.matchAll(pointPattern)]
    .map(match => match[1])
  console.log(points)

  return points.map((point, index) => {
    const coords = parseCoordinate(point);
    if (!coords || coords.length !== 2) return null;

    return {
      index: index + 1,
      lat: coords[0].decimal,  // с.ш. - N
      lon: coords[1].decimal,  // в.д. - E
      original: point
    };
  }).filter(p => p !== null);
}

// Function to check if text contains coordinate points
function containsCoordinatePoints(text) {
  // Check for typical patterns in coordinate lists:
  // - Numbers with degree symbols
  // - с.ш. (latitude) and в.д. (longitude) markers
  // - Numbered points
  return pointPattern.test(text);
}

// Function to parse table from HTML content
function parseLocationTable(html) {
  const $ = cheerio.load(html);
  const tables = [];
  
  $('table').each((tableIndex, tableElement) => {
    const table = {
      index: tableIndex,
      headers: [],
      rows: [],
      hasLocationData: false
    };

    // Extract headers
    $(tableElement).find('tr').first().find('td, th').each((_, cell) => {
      table.headers.push($(cell).text().trim());
    });

    // Check if this table might contain location data
    const headerText = table.headers.join(' ').toLowerCase();
    const locationKeywords = ['водоем', 'участок', 'местоположение', 'река', 'озеро', 'водохранилище', 'координаты'];
    table.hasLocationData = locationKeywords.some(keyword => headerText.includes(keyword));

    // Extract rows
    $(tableElement).find('tr').slice(1).each((_, row) => {
      const rowData = [];
      $(row).find('td').each((cellIndex, cell) => {
        const cellText = $(cell).text().trim();
        rowData.push(cellText);
      });
      
      if (rowData.length > 0) {
        table.rows.push(rowData);
      }
    });

    // Only add tables that have data
    if (table.rows.length > 0) {
      tables.push(table);
    }
  });

  return tables;
}

// Function to extract content from a Word document
async function extractDocumentContent(filePath) {
  try {
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    return htmlResult.value
  } catch (error) {
    console.error(`Error extracting content from ${filePath}:`, error.message);
    return error.message
  }
}

// Function to download a document and extract its content
async function downloadDocument(url, filename, documentsDir) {
  try {
    console.log(`Downloading document: ${filename}`);
    const content = await fetchUrl(url, true);
    const filePath = path.join(documentsDir, filename);
    saveToFile(filePath, content);

    // Extract content from the document
    console.log(`Extracting content from: ${filename}`);
    const extractedContent = await extractDocumentContent(filePath);
    
    // Save extracted content as JSON
    const contentJsonPath = path.join(documentsDir, `${path.parse(filename).name}.json`);
    saveToFile(contentJsonPath, JSON.stringify({
      filename,
      extractedAt: new Date().toISOString(),
      content: extractedContent
    }, null, 2));

    return {
      filePath: path.relative(dataDir, filePath),
      contentPath: path.relative(dataDir, contentJsonPath),
      content: extractedContent,
    };
  } catch (error) {
    console.error(`Error downloading document ${filename}:`, error.message);
    return null;
  }
}

// Function to parse region page and extract content
async function parseRegionPage(html, baseUrl, documentsDir) {
  const $ = cheerio.load(html);
  
  // Find the first card with the main content
  const $firstCard = $('.col.card').first();
  
  if (!$firstCard.length) {
    console.log('Warning: No card found in the page');
    return { content: '', contentHtml: '', documents: [] };
  }

  // Extract text content from the card body
  const textContent = $firstCard
    .find('.card-body')
    .clone()
    .find('script, style, link')
    .remove()
    .end()
    .text()
    .trim()
    .replace(/\s+/g, ' ');

  // Extract HTML content from the card body
  const contentHtml = $firstCard
    .find('.card-body')
    .clone()
    .find('script, style, link')
    .remove()
    .end()
    .html();

  // Find all document links within the first card
  const documents = [];
  const documentLinks = $firstCard.find('a[href*=".doc"]'); // Match both .doc and .docx
  
  for (const link of documentLinks) {
    const $link = $(link);
    const href = $link.attr('href');
    if (!href || (!href.endsWith('.doc') && !href.endsWith('.docx'))) continue;
    
    const docUrl = new URL(href, baseUrl).toString();
    const originalName = $link.text().trim() || path.basename(docUrl);
    const extension = href.endsWith('.docx') ? '.docx' : '.doc';
    const safeFilename = `${createSafeFilename(originalName)}${extension}`;
    
    // Download the document and extract content
    const docResult = await downloadDocument(docUrl, safeFilename, documentsDir);
    
    if (docResult) {
      documents.push({
        title: originalName,
        url: docUrl,
        filePath: docResult.filePath,
        content: docResult.content
      });
      
      // Add a small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return {
    contentHtml: contentHtml,
    documents
  };
}

// Function to parse main page and extract region links
function parseMainPage(html) {
  const $ = cheerio.load(html);
  const regions = [];
  
  // The section title we're looking for
  const sectionTitle = 'Об ограничениях в период нереста рыбы';
  
  // Find all links under sections that match our title
  $('h1, h2, h3, h4').each((_, element) => {
    const $element = $(element);
    if ($element.text().trim() === sectionTitle) {
      // Get the next section that contains links
      const $section = $element.next();
      
      // Find all links in this section
      $section.find('a').each((_, link) => {
        const $link = $(link);
        const title = $link.text().trim();
        // Extract region name from the title (remove the number in parentheses)
        const regionName = title.replace(/\s*\(\d+\)\s*$/, '').trim();
        
        const region = {
          title: title,
          url: new URL($link.attr('href'), 'https://moktu.fish.gov.ru').toString(),
          region: regionName
        };
        regions.push(region);
      });
    }
  });

  return regions;
}

// Main function to fetch and process all data
async function fetchAllData() {
  try {
    // Fetch main page
    console.log('Fetching main page...');
    const mainPageHtml = await fetchUrl(url);
    
    // Save main page HTML
    const mainPageFile = path.join(dataDir, 'fishing-ban-data.html');
    saveToFile(mainPageFile, mainPageHtml);
    console.log(`Main page saved to: ${mainPageFile}`);

    // Parse regions from main page
    const regions = parseMainPage(mainPageHtml);
    
    // Fetch and process each region's page
    console.log('\nFetching and processing region pages...');
    for (const region of regions) {
      try {
        console.log(`\nProcessing ${region.region}...`);
        
        // Get region-specific paths
        const paths = getRegionPaths(region.region);
        
        // Fetch region page
        const regionHtml = await fetchUrl(region.url);
        const regionFile = path.join(paths.htmlDir, 'index.html');
        saveToFile(regionFile, regionHtml);
        console.log(`HTML saved to: ${regionFile}`);
        
        // Parse region page content and download documents
        const parsedContent = await parseRegionPage(regionHtml, region.url, paths.documentsDir);
        
        // Add content and documents to region object
        region.contentHtml = parsedContent.contentHtml;
        region.documents = parsedContent.documents;

        // Save region content as HTML file
        const contentHtmlFile = path.join(paths.htmlDir, 'content.html');
        const htmlWrapper = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${region.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .content { background: #fff; padding: 20px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="content">
        ${parsedContent.contentHtml}
    </div>
</body>
</html>`;
        saveToFile(contentHtmlFile, htmlWrapper);
        
        // Save region metadata
        const metadataFile = path.join(paths.regionDir, 'metadata.json');
        saveToFile(metadataFile, JSON.stringify({
          title: region.title,
          url: region.url,
          content: region.content,
          contentHtml: region.contentHtml,
          documents: region.documents,
          lastUpdated: new Date().toISOString()
        }, null, 2));
        
        // Add a small delay between regions
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing ${region.region}:`, error.message);
      }
    }

    // Save the complete data
    const jsonOutputFile = path.join(dataDir, 'fishing-ban-regions.json');
    saveToFile(jsonOutputFile, JSON.stringify({
      lastUpdated: new Date().toISOString(),
      sourceUrl: url,
      regions: regions
    }, null, 2));
    
    console.log(`\nFound ${regions.length} regions`);
    console.log(`Complete data saved to: ${jsonOutputFile}`);
    
    // Print summary with location data information
    regions.forEach(region => {
      console.log(`\nRegion: ${region.region}`);
      console.log(`Documents found: ${region.documents?.length || 0}`);
      if (region.documents?.length > 0) {
        region.documents.forEach(doc => {
          console.log(`- ${doc.title}:`);
          console.log(`  Path: ${doc.filePath}`);
        });
      }
    });

  } catch (error) {
    console.error('Error in main process:', error);
  }
}

// Run the main function
fetchAllData(); 