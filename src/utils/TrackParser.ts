import distance from '@turf/distance';

export interface Track {
  id: string;
  name: string;
  coordinates: [number, number][];
  color: string;
  lengthKm: number;
}

function calculateTrackLength(coordinates: [number, number][]): number {
  if (coordinates.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    const from = coordinates[i - 1];
    const to = coordinates[i];
    totalDistance += distance(from, to, { units: 'kilometers' });
  }
  
  return Math.round(totalDistance * 10) / 10; // Round to 1 decimal place
}

export function parseGpxFile(gpxContent: string, fileName: string): Track {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'application/xml');
  
  // Check for parsing errors
  const parseError = xmlDoc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid GPX file format');
  }

  // Extract track points
  const trkpts = xmlDoc.querySelectorAll('trkpt');
  if (trkpts.length === 0) {
    throw new Error('No track points found in GPX file');
  }

  const coordinates: [number, number][] = [];
  trkpts.forEach(trkpt => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    if (!isNaN(lat) && !isNaN(lon)) {
      coordinates.push([lon, lat]); // GeoJSON format: [longitude, latitude]
    }
  });

  if (coordinates.length === 0) {
    throw new Error('No valid coordinates found in GPX file');
  }

  // Extract track name
  const trackNameElement = xmlDoc.querySelector('trk > name');
  const trackName = trackNameElement?.textContent || fileName.replace('.gpx', '');

  // Generate a unique ID and use consistent light orange color
  const id = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const color = '#FF9A56'; // Light orange
  
  // Calculate track length
  const lengthKm = calculateTrackLength(coordinates);

  return {
    id,
    name: trackName,
    coordinates,
    color,
    lengthKm
  };
}

export function readGpxFile(file: File): Promise<Track> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const gpxContent = event.target?.result as string;
        const track = parseGpxFile(gpxContent, file.name);
        resolve(track);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}