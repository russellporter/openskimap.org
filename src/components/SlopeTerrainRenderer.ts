import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";
import * as turf from "@turf/helpers";
import { 
  getRunDifficultyConvention,
  RunDifficultyConvention,
  getSlopeGradingScaleForUse,
  RunUse,
  getRunColor
} from "openskidata-format";
import { MapStyleOverlay } from "../MapStyle";

class TexturePool {
  private pool: WebGLTexture[] = [];
  private gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  getTexture(): WebGLTexture {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    
    // Create new texture if pool is empty
    const texture = this.gl.createTexture();
    if (!texture) {
      throw new Error("Failed to create WebGL texture");
    }
    return texture;
  }

  releaseTexture(texture: WebGLTexture): void {
    // Only keep up to 10 textures in the pool to avoid memory bloat
    if (this.pool.length < 10) {
      this.pool.push(texture);
    } else {
      this.gl.deleteTexture(texture);
    }
  }

  cleanup(): void {
    for (const texture of this.pool) {
      this.gl.deleteTexture(texture);
    }
    this.pool.length = 0;
  }
}

// Helper function to convert HSL color string to RGB vec3 for shader
function hslToRgb(hslString: string): { r: number; g: number; b: number } {
  // Parse HSL string like "hsl(125, 100%, 33%)"
  const match = hslString.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) {
    return { r: 0, g: 0, b: 0 };
  }
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return { r, g, b };
}

export class SlopeTerrainRenderer {
  private canvas: OffscreenCanvas | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private programs: Map<MapStyleOverlay, WebGLProgram> = new Map();
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private isSupported: boolean = false;
  private demSource: InstanceType<typeof mlcontour.DemSource>;
  private texturePool: TexturePool | null = null;
  public sunExposureDate: Date = new Date(new Date().getFullYear(), 0, 15); // Default Jan 15
  
  // Coarse terrain zoom level for extended shadow casting
  private static readonly COARSE_TERRAIN_ZOOM = 8;

  private vertexShaderSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  private generateDownhillDifficultyShaderCode(): string {
    // Get slope grading scales for all conventions
    const conventions = [
      RunDifficultyConvention.EUROPE,
      RunDifficultyConvention.JAPAN,
      RunDifficultyConvention.NORTH_AMERICA
    ];
    
    // Generate the color function
    let shaderCode = `
      // Map slope to downhill difficulty colors based on regional convention
      vec3 getSlopeColor(float slope) {
        // Convert slope from degrees to gradient percentage (as decimal)
        // gradient = tan(slope_in_radians)
        // 45 degrees = 1.0 gradient (100% slope)
        float gradient = tan(radians(slope));
        
        vec3 color = vec3(0.0, 0.0, 0.0); // Default black
    `;
    
    // Generate if-else chain for each convention
    conventions.forEach((convention, index) => {
      const scale = getSlopeGradingScaleForUse(RunUse.Downhill, convention);
      
      shaderCode += `
        ${index === 0 ? 'if' : 'else if'} (u_difficultyConvention == ${index}) { // ${convention.toUpperCase()}
      `;
      
      // Generate conditions for each difficulty threshold
      let firstCondition = true;
      scale.stops.forEach((stop, stopIndex) => {
        if (stop.difficulty === null) {
          // No difficulty - transparent
          shaderCode += `
          ${firstCondition ? 'if' : 'else if'} (gradient < ${stop.maxSteepness.toFixed(3)}f) {
            discard; // Transparent for no difficulty
          }`;
          firstCondition = false;
        } else {
          // Get the color for this difficulty and convention
          const colorString = getRunColor(convention, stop.difficulty);
          const rgb = hslToRgb(colorString);
          
          // Check if this is the last stop or has Infinity threshold
          const isLastStop = stopIndex === scale.stops.length - 1;
          const hasInfiniteThreshold = stop.maxSteepness === Infinity;
          
          if (!isLastStop && !hasInfiniteThreshold) {
            shaderCode += `
          ${firstCondition ? 'if' : 'else if'} (gradient < ${stop.maxSteepness.toFixed(3)}f) {
            color = vec3(${rgb.r.toFixed(3)}f, ${rgb.g.toFixed(3)}f, ${rgb.b.toFixed(3)}f);
          }`;
          } else if (hasInfiniteThreshold) {
            // Handle Infinity threshold - this covers everything above the previous threshold
            shaderCode += `
          else {
            // ${stop.difficulty} - above previous threshold
            color = vec3(${rgb.r.toFixed(3)}f, ${rgb.g.toFixed(3)}f, ${rgb.b.toFixed(3)}f);
          }`;
          } else {
            // Last stop with finite threshold - check if we should show this difficulty or make it transparent
            shaderCode += `
          else if (gradient <= ${stop.maxSteepness.toFixed(3)}f) {
            // ${stop.difficulty}
            color = vec3(${rgb.r.toFixed(3)}f, ${rgb.g.toFixed(3)}f, ${rgb.b.toFixed(3)}f);
          }
          else {
            // Above ${stop.maxSteepness.toFixed(3)} - beyond all defined levels, make transparent
            discard;
          }`;
          }
          firstCondition = false;
        }
      });
      
      shaderCode += `
        }`;
    });
    
    // Close the convention if-else chain
    shaderCode += `
        
        return color;
      }
    `;
    
    return shaderCode;
  }

  private getFragmentShaderSource(style: MapStyleOverlay): string {
    const baseFragmentShader = `#version 300 es
    precision highp float;
    
    out vec4 fragColor;
    
    uniform sampler2D u_texture;
    uniform sampler2D u_lowResTexture;
    uniform float u_zoomLevel;
    uniform float u_latitude;
    uniform float u_longitude;
    uniform int u_difficultyConvention;
    uniform int u_style;
    uniform float u_dayOfYear;
    uniform float u_lowResScale;
    uniform vec2 u_lowResOffset;
    uniform float u_tileX;
    uniform float u_tileY;
    in vec2 v_texCoord;
    `;

    const slopeCalculationCode = `
    // Calculate per-pixel latitude and longitude from tile coordinates
    vec2 calculatePixelLatLng(vec2 texCoord, float zoom, float tileX, float tileY) {
      // Calculate pixel position within the tile (0.0 to 1.0)
      float pixelX = tileX + texCoord.x;
      float pixelY = tileY + texCoord.y;

      // Convert to longitude (straightforward linear mapping)
      float longitude = (pixelX / pow(2.0, zoom)) * 360.0 - 180.0;

      // Convert to latitude using Web Mercator inverse projection
      float n = 3.14159265359 - (2.0 * 3.14159265359 * pixelY) / pow(2.0, zoom);
      float latitude = (180.0 / 3.14159265359) * atan(0.5 * (exp(n) - exp(-n)));

      return vec2(latitude, longitude);
    }

    // Calculate slope using standard Sobel operator (full resolution)
    float calculateStandardSlope(vec2 adjustedTexCoord, vec2 texelSize, float centerHeight, float pixelSizeMeters) {
      // Sample neighboring pixels for slope calculation (Sobel operator)
      float n = texture(u_texture, adjustedTexCoord + vec2(0.0, -texelSize.y)).r;
      float s = texture(u_texture, adjustedTexCoord + vec2(0.0, texelSize.y)).r;
      float e = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, 0.0)).r;
      float w = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, 0.0)).r;
      float ne = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, -texelSize.y)).r;
      float nw = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, -texelSize.y)).r;
      float se = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, texelSize.y)).r;
      float sw = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, texelSize.y)).r;
      
      // Check if any neighboring pixels are invalid (use center height as fallback)
      if (n < -9999.0) n = centerHeight;
      if (s < -9999.0) s = centerHeight;
      if (e < -9999.0) e = centerHeight;
      if (w < -9999.0) w = centerHeight;
      if (ne < -9999.0) ne = centerHeight;
      if (nw < -9999.0) nw = centerHeight;
      if (se < -9999.0) se = centerHeight;
      if (sw < -9999.0) sw = centerHeight;
      
      // Sobel operator for gradient calculation
      float dzdx = ((ne + 2.0 * e + se) - (nw + 2.0 * w + sw)) / 8.0;
      float dzdy = ((ne + 2.0 * n + nw) - (se + 2.0 * s + sw)) / 8.0;
      
      // Calculate the magnitude of the gradient vector
      float gradientMagnitude = sqrt(dzdx * dzdx + dzdy * dzdy);
      
      // Calculate slope in radians, then convert to degrees
      float slope = atan(gradientMagnitude / pixelSizeMeters);
      return degrees(slope);
    }
    
    // Calculate smoothed slope using larger sampling area
    float calculateSmoothedSlope(vec2 adjustedTexCoord, vec2 texelSize, float centerHeight, float pixelSizeMeters) {
      // Sample in a 5x5 grid for smoothing
      float slopeSum = 0.0;
      int sampleCount = 0;
      
      for (int dy = -2; dy <= 2; dy++) {
        for (int dx = -2; dx <= 2; dx++) {
          vec2 offset = vec2(float(dx), float(dy)) * texelSize;
          vec2 sampleCoord = adjustedTexCoord + offset;
          
          // Sample center and neighbors for this position
          float center = texture(u_texture, sampleCoord).r;
          if (center < -9999.0) continue; // Skip invalid pixels
          
          float n = texture(u_texture, sampleCoord + vec2(0.0, -texelSize.y)).r;
          float s = texture(u_texture, sampleCoord + vec2(0.0, texelSize.y)).r;
          float e = texture(u_texture, sampleCoord + vec2(texelSize.x, 0.0)).r;
          float w = texture(u_texture, sampleCoord + vec2(-texelSize.x, 0.0)).r;
          
          // Use center value for invalid neighbors
          if (n < -9999.0) n = center;
          if (s < -9999.0) s = center;
          if (e < -9999.0) e = center;
          if (w < -9999.0) w = center;
          
          // Simple gradient calculation
          float dzdx = (e - w) / 2.0;
          float dzdy = (n - s) / 2.0;
          
          float gradientMagnitude = sqrt(dzdx * dzdx + dzdy * dzdy);
          float slope = atan(gradientMagnitude / pixelSizeMeters);
          
          slopeSum += degrees(slope);
          sampleCount++;
        }
      }
      
      return sampleCount > 0 ? slopeSum / float(sampleCount) : 0.0;
    }
    
    // Calculate sun exposure hours for a given slope
    vec3 calculateSunExposure(vec2 adjustedTexCoord, vec2 texelSize, float centerHeight, float pixelSizeMeters) {
      // Calculate per-pixel latitude and longitude
      // Note: adjustedTexCoord is in padded texture space, but we need original texture coordinates
      // Convert back to original tile coordinates (0.0 to 1.0 within the tile)
      vec2 textureSize = vec2(textureSize(u_texture, 0));
      vec2 originalTexCoord = (adjustedTexCoord * textureSize - 1.0) / (textureSize - 2.0);
      vec2 pixelLatLng = calculatePixelLatLng(originalTexCoord, u_zoomLevel, u_tileX, u_tileY);
      float latitude = pixelLatLng.x;
      float longitude = pixelLatLng.y;

      // Calculate gradients for slope normal
      float n = texture(u_texture, adjustedTexCoord + vec2(0.0, -texelSize.y)).r;
      float s = texture(u_texture, adjustedTexCoord + vec2(0.0, texelSize.y)).r;
      float e = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, 0.0)).r;
      float w = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, 0.0)).r;
      
      // Check if any neighboring pixels are invalid
      if (n < -9999.0) n = centerHeight;
      if (s < -9999.0) s = centerHeight;
      if (e < -9999.0) e = centerHeight;
      if (w < -9999.0) w = centerHeight;
      
      // Calculate gradients in map coordinates
      // Map/World coordinates: X=east, Y=north, Z=up
      // Texture coordinates: X=east (same), Y increases south (opposite of north)
      
      // Height gradients:
      float dz_dx = (e - w) / (2.0 * pixelSizeMeters);  // Change in height going east
      float dz_dy_texture = (s - n) / (2.0 * pixelSizeMeters);  // Change in height going south (texture Y)
      
      // Convert to world coordinates where Y=north
      // Going north means going opposite to texture Y, so flip sign
      float dz_dy_world = -dz_dy_texture;  // Change in height going north
      
      // Surface normal using gradient: normal = normalize(-dz/dx, -dz/dy, 1)
      // This gives the outward-pointing normal from the surface
      vec3 slopeNormal = normalize(vec3(-dz_dx, -dz_dy_world, 1.0));
      
      // Parameters for sun calculation
      float declination = -23.45 * cos(radians(360.0 * (u_dayOfYear + 10.0) / 365.0)); // Solar declination
      float latRad = radians(latitude);
      float decRad = radians(declination);
      
      // Sample sun positions throughout the day and accumulate sun exposure score
      float totalSunScore = 0.0;
      int samples = 48; // Check every 30 minutes
      
      // Always sample the full day, even in polar regions
      for (int i = 0; i < samples; i++) {
        // Hour angle from -π to π (sunrise to sunset)
        float hourAngle = -radians(180.0) + float(i) * radians(360.0) / float(samples - 1);
        
        // Calculate sun position
        float sunAltitude = asin(sin(latRad) * sin(decRad) + cos(latRad) * cos(decRad) * cos(hourAngle));
        
        // Skip if sun is below horizon
        if (sunAltitude <= 0.0) continue;
        
        // Calculate sun azimuth (angle from north, clockwise)
        // Using standard solar azimuth formula
        float cosAz = (sin(decRad) - sin(sunAltitude) * sin(latRad)) / (cos(sunAltitude) * cos(latRad));
        cosAz = clamp(cosAz, -1.0, 1.0); // Ensure valid input for acos
        float sunAzimuth = acos(cosAz);
        
        // Adjust azimuth based on hour angle (morning vs afternoon)
        if (hourAngle > 0.0) {
          sunAzimuth = radians(360.0) - sunAzimuth; // Afternoon: west of south
        }
        
        // Convert sun position to cartesian vector
        // X = east, Y = north, Z = up
        vec3 sunVector = vec3(
          cos(sunAltitude) * sin(sunAzimuth),   // East component
          cos(sunAltitude) * cos(sunAzimuth),   // North component  
          sin(sunAltitude)                       // Up component
        );
        
        // Calculate sun exposure score based on angle between slope normal and sun direction
        // dot(slopeNormal, sunVector) gives:
        //   1.0 when slope is perpendicular to sun (maximum exposure)
        //   0.0 when slope is parallel to sun (no direct exposure)
        //   negative when slope faces away from sun (no exposure)
        float dotProduct = dot(slopeNormal, sunVector);
        
        // Only count positive contributions (when slope faces the sun)
        if (dotProduct > 0.0) {
          // Aggressive terrain shadowing - check for blocking terrain
          bool inShadow = false;
          
          // Check shadows for any sun above horizon
          if (sunAltitude > radians(5.0)) {
            // Aggressive shadow parameters - use absolute distances, not pixel-relative
            int shadowSteps = 15; // Many steps for thorough checking
            float baseStepSize = 50.0; // Fixed 50m steps regardless of zoom level
            
            // Convert sun direction to texture space
            vec2 sunDir2D = normalize(vec2(sunVector.x, -sunVector.y)); // Convert north to south
            
            for (int i = 1; i <= shadowSteps; i++) {
              // Progressive step size - smaller steps nearby, larger far away
              float stepSize = baseStepSize * (1.0 + float(i) * 0.5);
              float totalDistance = stepSize * float(i);
              
              // Position to check
              vec2 checkPos = adjustedTexCoord + sunDir2D * (totalDistance / pixelSizeMeters) * texelSize.x;
              
              float terrainHeight = -10000.0;
              
              // Try high-resolution first for nearby terrain, but always fall back to low-res if needed
              bool foundHeight = false;
              
              // For nearby terrain, prefer high-res if available
              // Note: padded texture only has 1-pixel border, so valid range is slightly beyond [0,1]
              // Texture coordinates: center tile [0,1] + small border for seamless edges
              float border = 1.0 / 514.0; // 1 pixel border on 512+2=514 texture
              
              if (totalDistance < 2000.0 && 
                  checkPos.x >= -border && checkPos.x <= (1.0 + border) && 
                  checkPos.y >= -border && checkPos.y <= (1.0 + border)) {
                terrainHeight = texture(u_texture, checkPos).r;
                foundHeight = true;
              }
              
              // Fall back to low-res if high-res not available or for distant terrain
              if (!foundHeight) {
                // Transform from high-res tile coordinates to low-res tile coordinates
                // checkPos is in high-res tile space [0,1]
                // We need to map it to the correct position within the low-res tile
                vec2 lowResPos = u_lowResOffset + checkPos / u_lowResScale;
                if (lowResPos.x >= 0.0 && lowResPos.x <= 1.0 && 
                    lowResPos.y >= 0.0 && lowResPos.y <= 1.0) {
                  terrainHeight = texture(u_lowResTexture, lowResPos).r;
                  foundHeight = true;
                }
              }
              
              // If we can't sample from either texture, stop ray casting
              if (!foundHeight) {
                break;
              }
              
              // Skip invalid data
              if (terrainHeight < -9999.0) {
                continue;
              }
              
              // Calculate expected height of sun ray at this distance
              float expectedHeight = centerHeight + totalDistance * tan(sunAltitude);
              
              // Very aggressive shadow check - even small differences count
              if (terrainHeight > expectedHeight + 1.0) {
                inShadow = true;
                break;
              }
              
              // Stop if we've gone very far (low-res allows much longer distances)
              if (totalDistance > 50000.0) { // Maximum 50km shadow range
                break;
              }
            }
          }
          
          // Only add sun contribution if not in shadow
          if (!inShadow) {
            // Weight by time interval (each sample represents part of the day)
            totalSunScore += dotProduct * (24.0 / float(samples));
          }
        }
      }
      
      // Color based on total sun exposure score
      // A perfect south-facing slope in winter might get a score of ~6-8 hours worth of good exposure
      // Normalize to 0-1 range, with 6 being a more realistic maximum for excellent exposure
      float normalizedScore = clamp(totalSunScore / 6.0, 0.0, 1.0);
      
      vec3 noSunColor = vec3(0.1, 0.2, 0.8);     // Deep blue
      vec3 littleSunColor = vec3(0.2, 0.5, 0.9); // Light blue
      vec3 moderateSunColor = vec3(0.5, 0.8, 0.5); // Green
      vec3 goodSunColor = vec3(0.9, 0.9, 0.2);   // Yellow
      vec3 excellentSunColor = vec3(1.0, 0.5, 0.0); // Orange
      vec3 maxSunColor = vec3(1.0, 0.1, 0.0);    // Red
      
      vec3 color;
      // Adjust thresholds to make the map appear warmer
      if (normalizedScore < 0.15) {
        color = mix(noSunColor, littleSunColor, normalizedScore * 6.67);
      } else if (normalizedScore < 0.35) {
        color = mix(littleSunColor, moderateSunColor, (normalizedScore - 0.15) * 5.0);
      } else if (normalizedScore < 0.55) {
        color = mix(moderateSunColor, goodSunColor, (normalizedScore - 0.35) * 5.0);
      } else if (normalizedScore < 0.75) {
        color = mix(goodSunColor, excellentSunColor, (normalizedScore - 0.55) * 5.0);
      } else {
        color = mix(excellentSunColor, maxSunColor, (normalizedScore - 0.75) * 4.0);
      }
      
      return color;
    }
    
    // Calculate aspect angle from gradients
    vec3 calculateAspectColor(vec2 adjustedTexCoord, vec2 texelSize, float centerHeight, float pixelSizeMeters) {
      // Calculate per-pixel latitude
      vec2 textureSize = vec2(textureSize(u_texture, 0));
      vec2 originalTexCoord = (adjustedTexCoord * textureSize - 1.0) / (textureSize - 2.0);
      vec2 pixelLatLng = calculatePixelLatLng(originalTexCoord, u_zoomLevel, u_tileX, u_tileY);
      float latitude = pixelLatLng.x;

      // Calculate gradients for aspect
      float n = texture(u_texture, adjustedTexCoord + vec2(0.0, -texelSize.y)).r;
      float s = texture(u_texture, adjustedTexCoord + vec2(0.0, texelSize.y)).r;
      float e = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, 0.0)).r;
      float w = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, 0.0)).r;
      
      // Check if any neighboring pixels are invalid
      if (n < -9999.0) n = centerHeight;
      if (s < -9999.0) s = centerHeight;
      if (e < -9999.0) e = centerHeight;
      if (w < -9999.0) w = centerHeight;
      
      // Calculate gradients (pointing uphill)
      float dzdx = (e - w) / (2.0 * pixelSizeMeters);  // Positive if east is higher
      float dzdy = (s - n) / (2.0 * pixelSizeMeters);  // Positive if south is higher (Y increases downward)
      
      // Calculate aspect (direction of slope face)
      // The gradient vector (dzdx, dzdy) points uphill
      // The aspect is the direction the slope faces (downhill)
      // So we negate the gradient to get the downhill direction
      // atan(y, x) in GLSL gives angle from positive X axis (east)
      // We want angle from north, so we rotate by 90 degrees
      float aspectRadians = atan(-dzdy, -dzdx) + radians(90.0);
      
      // Convert to degrees and normalize to 0-360 range
      float aspectDegrees = degrees(aspectRadians);
      if (aspectDegrees < 0.0) {
        aspectDegrees += 360.0;
      }
      if (aspectDegrees >= 360.0) {
        aspectDegrees -= 360.0;
      }
      
      // Only show aspect for slopes steeper than ~5 degrees
      float gradientMagnitude = sqrt(dzdx * dzdx + dzdy * dzdy);
      float slope = atan(gradientMagnitude);
      if (degrees(slope) < 5.0) {
        return vec3(-1.0); // Signal to discard in main
      }
      
      // Aspect coloring based on winter sun exposure
      // 0/360 = North, 90 = East, 180 = South, 270 = West
      
      // Define base colors for sun exposure
      vec3 maxSunColor = vec3(1.0, 0.2, 0.0);           // Red-orange (maximum heat)
      vec3 excellentAfternoonColor = vec3(1.0, 0.5, 0.0); // Orange (excellent afternoon sun)
      vec3 goodAfternoonColor = vec3(1.0, 0.8, 0.0);    // Yellow-orange (good afternoon sun)
      vec3 someAfternoonColor = vec3(0.5, 0.8, 0.3);    // Yellow-green (some afternoon sun)
      vec3 minSunColor = vec3(0.2, 0.4, 1.0);           // Blue (minimal sun)
      vec3 limitedSunColor = vec3(0.3, 0.6, 0.9);       // Light blue (limited sun)
      vec3 morningSunColor = vec3(0.6, 0.9, 0.5);       // Light green (morning sun only)
      vec3 goodMorningSunColor = vec3(0.9, 0.9, 0.2);   // Yellow (good morning sun)
      
      // Check hemisphere and assign colors accordingly
      // In northern hemisphere: south-facing gets most sun
      // In southern hemisphere: north-facing gets most sun
      bool isNorthernHemisphere = latitude >= 0.0;
      
      vec3 southColor, southwestColor, westColor, northwestColor;
      vec3 northColor, northeastColor, eastColor, southeastColor;
      
      if (isNorthernHemisphere) {
        // Northern hemisphere - south faces get most winter sun
        southColor = maxSunColor;
        southwestColor = excellentAfternoonColor;
        westColor = goodAfternoonColor;
        northwestColor = someAfternoonColor;
        northColor = minSunColor;
        northeastColor = limitedSunColor;
        eastColor = morningSunColor;
        southeastColor = goodMorningSunColor;
      } else {
        // Southern hemisphere - north faces get most winter sun
        northColor = maxSunColor;
        northwestColor = excellentAfternoonColor;
        westColor = goodAfternoonColor;
        southwestColor = someAfternoonColor;
        southColor = minSunColor;
        southeastColor = limitedSunColor;
        eastColor = morningSunColor;
        northeastColor = goodMorningSunColor;
      }
      
      vec3 color;
      
      // Create smooth transitions between cardinal directions
      if (aspectDegrees >= 337.5 || aspectDegrees < 22.5) {
        // North (337.5° to 22.5°)
        color = northColor;
      } else if (aspectDegrees >= 22.5 && aspectDegrees < 67.5) {
        // Northeast (22.5° to 67.5°)
        float t = (aspectDegrees - 22.5) / 45.0;
        color = mix(northColor, northeastColor, smoothstep(0.0, 0.5, t)) * (1.0 - smoothstep(0.5, 1.0, t)) 
               + mix(northeastColor, eastColor, smoothstep(0.0, 1.0, t)) * smoothstep(0.5, 1.0, t);
      } else if (aspectDegrees >= 67.5 && aspectDegrees < 112.5) {
        // East (67.5° to 112.5°)
        float t = (aspectDegrees - 67.5) / 45.0;
        color = mix(eastColor, southeastColor, t);
      } else if (aspectDegrees >= 112.5 && aspectDegrees < 157.5) {
        // Southeast (112.5° to 157.5°)
        float t = (aspectDegrees - 112.5) / 45.0;
        color = mix(southeastColor, southColor, t);
      } else if (aspectDegrees >= 157.5 && aspectDegrees < 202.5) {
        // South (157.5° to 202.5°)
        color = southColor;
      } else if (aspectDegrees >= 202.5 && aspectDegrees < 247.5) {
        // Southwest (202.5° to 247.5°)
        float t = (aspectDegrees - 202.5) / 45.0;
        color = mix(southColor, southwestColor, smoothstep(0.0, 0.5, t)) * (1.0 - smoothstep(0.5, 1.0, t))
               + mix(southwestColor, westColor, smoothstep(0.0, 1.0, t)) * smoothstep(0.5, 1.0, t);
      } else if (aspectDegrees >= 247.5 && aspectDegrees < 292.5) {
        // West (247.5° to 292.5°)
        float t = (aspectDegrees - 247.5) / 45.0;
        color = mix(westColor, northwestColor, t);
      } else if (aspectDegrees >= 292.5 && aspectDegrees < 337.5) {
        // Northwest (292.5° to 337.5°)
        float t = (aspectDegrees - 292.5) / 45.0;
        color = mix(northwestColor, northColor, t);
      }
      
      return color;
    }
    
    void main() {
      vec2 textureSize = vec2(textureSize(u_texture, 0));
      vec2 texelSize = 1.0 / textureSize;
      
      // Map output coordinates to padded texture coordinates
      // Scale and offset to map to the center portion of the padded texture
      vec2 adjustedTexCoord = v_texCoord * (textureSize - 2.0) / textureSize + 1.0 / textureSize;
      
      // Sample the center pixel - elevation is stored directly in red channel
      vec4 centerSample = texture(u_texture, adjustedTexCoord);
      
      // Check if we have valid data (DEM tiles use -10000 for no data)
      if (centerSample.r < -9999.0) {
        discard;
      }
      
      float centerHeight = centerSample.r;
      
      // Calculate pixel size in meters based on zoom level and latitude
      // Formula for 256x256 tiles: 156543.03392 * cos(latitude) / 2^zoom
      // But DEM tiles are 512x512, so pixels are half the size
      float latRad = radians(u_latitude);
      float pixelSizeMeters = 156543.03392 * cos(latRad) / pow(2.0, u_zoomLevel) / 2.0;
      
      // Choose slope calculation method based on style and zoom level
      float slopeDegrees;
      vec3 slopeColor;
      
      if (u_style == 0) { // Slope style - always use full resolution
        slopeDegrees = calculateStandardSlope(adjustedTexCoord, texelSize, centerHeight, pixelSizeMeters);
        slopeColor = getSlopeColor(slopeDegrees);
      } else if (u_style == 1) { // DownhillDifficulty style - use smoothing only above zoom 13
        if (u_zoomLevel > 13.0) {
          slopeDegrees = calculateSmoothedSlope(adjustedTexCoord, texelSize, centerHeight, pixelSizeMeters);
        } else {
          slopeDegrees = calculateStandardSlope(adjustedTexCoord, texelSize, centerHeight, pixelSizeMeters);
        }
        slopeColor = getSlopeColor(slopeDegrees);
      } else if (u_style == 2) { // Aspect style - calculate aspect angle
        slopeColor = calculateAspectColor(adjustedTexCoord, texelSize, centerHeight, pixelSizeMeters);
        if (slopeColor.x < 0.0) {
          discard; // Too flat to have meaningful aspect
        }
      } else if (u_style == 3) { // Sun exposure style - calculate sun hours
        slopeColor = calculateSunExposure(adjustedTexCoord, texelSize, centerHeight, pixelSizeMeters);
      }
      
      // Add some basic hillshading for depth perception (using standard gradient for consistency)
      float n = texture(u_texture, adjustedTexCoord + vec2(0.0, -texelSize.y)).r;
      float s = texture(u_texture, adjustedTexCoord + vec2(0.0, texelSize.y)).r;
      float e = texture(u_texture, adjustedTexCoord + vec2(texelSize.x, 0.0)).r;
      float w = texture(u_texture, adjustedTexCoord + vec2(-texelSize.x, 0.0)).r;
      
      if (n < -9999.0) n = centerHeight;
      if (s < -9999.0) s = centerHeight;
      if (e < -9999.0) e = centerHeight;
      if (w < -9999.0) w = centerHeight;
      
      float dzdx = (e - w) / 2.0;
      float dzdy = (n - s) / 2.0;
      
      vec3 normal = normalize(vec3(-dzdx, -dzdy, pixelSizeMeters));
      vec3 lightDir = normalize(vec3(0.5, 0.5, 0.8));
      float hillshade = dot(normal, lightDir);
      hillshade = clamp(hillshade, 0.3, 1.0); // Keep some ambient light
      
      // Combine slope color with hillshading
      vec3 finalColor = slopeColor * hillshade;
      
      // Full opacity to ensure visibility
      fragColor = vec4(finalColor, 1.0);
    }
    `;

    // Style-specific color functions
    const colorFunctions: Record<MapStyleOverlay, string> = {
      [MapStyleOverlay.Slope]: `
        // Color gradient for slopes (green to red based on steepness)
        vec3 getSlopeColor(float slope) {
          // Slope is in degrees (0-90)
          float normalizedSlope = clamp(slope / 45.0, 0.0, 1.0); // Normalize to 0-45 degrees for more sensitivity
          
          // More vibrant colors for better visibility
          vec3 green = vec3(0.0, 1.0, 0.0);   // Bright green for flat
          vec3 yellow = vec3(1.0, 1.0, 0.0);  // Bright yellow for moderate
          vec3 orange = vec3(1.0, 0.5, 0.0);  // Orange for steep
          vec3 red = vec3(1.0, 0.0, 0.0);     // Red for very steep
          
          vec3 color;
          if (normalizedSlope < 0.33) {
            // Green to Yellow (0-15 degrees)
            color = mix(green, yellow, normalizedSlope * 3.0);
          } else if (normalizedSlope < 0.67) {
            // Yellow to Orange (15-30 degrees)
            color = mix(yellow, orange, (normalizedSlope - 0.33) * 3.0);
          } else if (normalizedSlope < 1.0) {
            // Orange to Red (30-45 degrees)
            color = mix(orange, red, (normalizedSlope - 0.67) * 3.0);
          } else {
            // Deep red for extreme slopes (45+ degrees)
            color = red;
          }
          
          return color;
        }
      `,
      [MapStyleOverlay.DownhillDifficulty]: this.generateDownhillDifficultyShaderCode(),
      [MapStyleOverlay.Aspect]: `
        // Placeholder for aspect style - actual calculation is in main shader
        vec3 getSlopeColor(float slope) {
          // Not used for aspect style - calculation happens in calculateAspectColor
          return vec3(1.0, 0.0, 1.0);
        }
      `,
      [MapStyleOverlay.SunExposure]: `
        // Placeholder for sun exposure style - actual calculation is in main shader
        vec3 getSlopeColor(float slope) {
          // Not used for sun exposure style - calculation happens in calculateSunExposure
          return vec3(1.0, 0.0, 1.0);
        }
      `
    };

    return baseFragmentShader + colorFunctions[style] + slopeCalculationCode;
  }

  public constructor(demSource: InstanceType<typeof mlcontour.DemSource>) {
    this.demSource = demSource;
    
    // Always use OffscreenCanvas for optimal performance
    this.canvas = new OffscreenCanvas(512, 512);
    this.isSupported = this.initWebGL(this.canvas);

    if (!this.isSupported) {
      console.warn(
        "WebGL is not supported on this device. Slope terrain rendering will not be available."
      );
    }
  }

  public checkSupport(): boolean {
    return this.isSupported;
  }


  private createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private createProgram(gl: WebGL2RenderingContext, style: MapStyleOverlay): WebGLProgram | null {
    // Create shaders
    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, this.getFragmentShaderSource(style));

    if (!vertexShader || !fragmentShader) {
      return null;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(`Program linking error for style ${style}:`, gl.getProgramInfoLog(program));
      return null;
    }

    // Validate the program
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      console.error(`Program validation error for style ${style}:`, gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private initWebGL(canvas: OffscreenCanvas): boolean {
    this.canvas = canvas;
    // Only support WebGL 2
    const gl = canvas.getContext("webgl2");

    if (!gl) {
      console.error("WebGL 2 is required for slope terrain rendering");
      return false;
    }

    // Check for required extensions
    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("OES_texture_float_linear");

    this.gl = gl;

    // Create programs for each style
    for (const style of Object.values(MapStyleOverlay)) {
      const program = this.createProgram(gl, style);
      if (!program) {
        console.error(`Failed to create program for style: ${style}`);
        return false;
      }
      this.programs.set(style, program);
    }

    // Setup buffers
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    const texCoords = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Initialize texture pool
    this.texturePool = new TexturePool(gl);

    return true;
  }

  public processTerrainTile(
    paddedDemTile: { width: number; height: number; data: Float32Array },
    zoomLevel: number,
    tileX: number,
    tileY: number,
    latitude: number,
    longitude: number,
    style: MapStyleOverlay,
    date?: Date,
    lowResDemTile?: { width: number; height: number; data: Float32Array } | null
  ): ImageData | null {
    if (!this.isSupported) {
      return null;
    }

    const gl = this.gl;
    const program = this.programs.get(style);
    const canvas = this.canvas;

    if (!gl || !program || !canvas) {
      return null;
    }

    // Output size excludes the 1-pixel padding border
    const outputWidth = paddedDemTile.width - 2;
    const outputHeight = paddedDemTile.height - 2;
    
    // Assert tiles are expected size - resize canvas to match output size
    console.assert(
      canvas.width === outputWidth && canvas.height === outputHeight,
      `Unexpected tile size: canvas ${canvas.width}x${canvas.height}, expected ${outputWidth}x${outputHeight}`
    );
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    gl.viewport(0, 0, outputWidth, outputHeight);

    // Get texture from pool instead of creating new one
    // Store elevation values directly in the red channel as floats
    const texture = this.texturePool!.getTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32F,
      paddedDemTile.width,
      paddedDemTile.height,
      0,
      gl.RED,
      gl.FLOAT,
      paddedDemTile.data
    );

    // Configure texture parameters for float data
    const hasFloatLinear = gl.getExtension("OES_texture_float_linear");
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      hasFloatLinear ? gl.LINEAR : gl.NEAREST
    );
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MAG_FILTER,
      hasFloatLinear ? gl.LINEAR : gl.NEAREST
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Set up low-resolution texture (if available)
    let lowResTexture: WebGLTexture | null = null;
    if (lowResDemTile) {
      lowResTexture = this.texturePool!.getTexture();
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, lowResTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.R32F,
        lowResDemTile.width,
        lowResDemTile.height,
        0,
        gl.RED,
        gl.FLOAT,
        lowResDemTile.data
      );
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, hasFloatLinear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, hasFloatLinear ? gl.LINEAR : gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      
      // Reset to texture 0
      gl.activeTexture(gl.TEXTURE0);
    }

    // Use program
    gl.useProgram(program);

    // Bind position buffer
    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Bind texture coordinate buffer
    const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const textureLocation = gl.getUniformLocation(program, "u_texture");
    gl.uniform1i(textureLocation, 0);

    // Set low-resolution texture uniform (if available)
    if (lowResDemTile && zoomLevel >= SlopeTerrainRenderer.COARSE_TERRAIN_ZOOM) {
      console.log(`Setting up low-res texture uniforms for zoom ${zoomLevel}`);
      const lowResTextureLocation = gl.getUniformLocation(program, "u_lowResTexture");
      gl.uniform1i(lowResTextureLocation, 1);
      
      // Calculate coordinate transformation parameters
      const lowResZoom = SlopeTerrainRenderer.COARSE_TERRAIN_ZOOM;
      const lowResScale = Math.pow(2, zoomLevel - lowResZoom);
      
      // Calculate coordinate transformation using actual tile coordinates
      // We know: lowResX = floor(x / lowResScale), lowResY = floor(y / lowResScale)
      // So the current high-res tile (x,y) maps to position within the low-res tile
      // Use exact tile coordinates to avoid floating-point precision errors
      
      // The low-res tile that contains our high-res tile
      const lowResX = Math.floor(tileX / lowResScale);
      const lowResY = Math.floor(tileY / lowResScale);
      
      // Position of current high-res tile within the low-res tile (0.0 to 1.0)
      const offsetX = (tileX - lowResX * lowResScale) / lowResScale;
      const offsetY = (tileY - lowResY * lowResScale) / lowResScale;
      
      const lowResScaleLocation = gl.getUniformLocation(program, "u_lowResScale");
      gl.uniform1f(lowResScaleLocation, lowResScale);
      
      const lowResOffsetLocation = gl.getUniformLocation(program, "u_lowResOffset");
      gl.uniform2f(lowResOffsetLocation, offsetX, offsetY);
      
      console.log(`Low-res uniforms: scale=${lowResScale}, offset=(${offsetX}, ${offsetY})`);
    } else {
      // Set default values when low-res texture is not available
      const lowResTextureLocation = gl.getUniformLocation(program, "u_lowResTexture");
      gl.uniform1i(lowResTextureLocation, 0); // Use high-res texture as fallback
      
      const lowResScaleLocation = gl.getUniformLocation(program, "u_lowResScale");
      gl.uniform1f(lowResScaleLocation, 1.0);
      
      const lowResOffsetLocation = gl.getUniformLocation(program, "u_lowResOffset");
      gl.uniform2f(lowResOffsetLocation, 0.0, 0.0);
      
      console.log(`No low-res texture available for zoom ${zoomLevel}`);
    }

    const zoomLocation = gl.getUniformLocation(program, "u_zoomLevel");
    gl.uniform1f(zoomLocation, zoomLevel);

    const latitudeLocation = gl.getUniformLocation(program, "u_latitude");
    gl.uniform1f(latitudeLocation, latitude);

    const longitudeLocation = gl.getUniformLocation(program, "u_longitude");
    gl.uniform1f(longitudeLocation, longitude);

    const tileXLocation = gl.getUniformLocation(program, "u_tileX");
    gl.uniform1f(tileXLocation, tileX);

    const tileYLocation = gl.getUniformLocation(program, "u_tileY");
    gl.uniform1f(tileYLocation, tileY);

    // Determine difficulty convention based on tile location
    const point = turf.point([longitude, latitude]);
    const convention = getRunDifficultyConvention(point);
    let conventionInt = 0; // Default to EUROPE
    switch (convention) {
      case RunDifficultyConvention.EUROPE:
        conventionInt = 0;
        break;
      case RunDifficultyConvention.JAPAN:
        conventionInt = 1;
        break;
      case RunDifficultyConvention.NORTH_AMERICA:
        conventionInt = 2;
        break;
    }
    
    const conventionLocation = gl.getUniformLocation(program, "u_difficultyConvention");
    gl.uniform1i(conventionLocation, conventionInt);

    // Set style uniform (0 = Slope, 1 = DownhillDifficulty, 2 = Aspect, 3 = SunExposure)
    const styleLocation = gl.getUniformLocation(program, "u_style");
    let styleInt = 0;
    switch (style) {
      case MapStyleOverlay.Slope:
        styleInt = 0;
        break;
      case MapStyleOverlay.DownhillDifficulty:
        styleInt = 1;
        break;
      case MapStyleOverlay.Aspect:
        styleInt = 2;
        break;
      case MapStyleOverlay.SunExposure:
        styleInt = 3;
        break;
    }
    gl.uniform1i(styleLocation, styleInt);

    // Calculate day of year for sun exposure calculation
    const selectedDate = date || new Date(new Date().getFullYear(), 0, 15); // Default to Jan 15
    const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((selectedDate.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const dayOfYearLocation = gl.getUniformLocation(program, "u_dayOfYear");
    gl.uniform1f(dayOfYearLocation, dayOfYear);

    // Clear and draw
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Read pixels back
    const pixels = new Uint8Array(outputWidth * outputHeight * 4);
    gl.readPixels(
      0,
      0,
      outputWidth,
      outputHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels
    );

    // Return texture to pool instead of deleting
    this.texturePool!.releaseTexture(texture);
    
    // Clean up low-resolution texture if it was used
    if (lowResTexture) {
      this.texturePool!.releaseTexture(lowResTexture);
    }

    // Create new ImageData with processed pixels
    return new ImageData(
      new Uint8ClampedArray(pixels),
      outputWidth,
      outputHeight
    );
  }

  private async getPaddedDemTile(
    z: number,
    x: number,
    y: number
  ): Promise<{ width: number; height: number; data: Float32Array } | null> {
    // Create a padded tile by fetching center tile + 4 cardinal neighbors to eliminate seams
    const tilePromises: Promise<{ width: number; height: number; data: Float32Array } | null>[] = [];
    
    // Define neighboring tile offsets: [dx, dy] - only cardinal directions
    const neighbors = [
      [0, -1], // north
      [-1, 0], [0, 0], [1, 0], // west, center, east
      [0, 1]   // south
    ];
    
    // Fetch all tiles (center + cardinal neighbors)
    for (const [dx, dy] of neighbors) {
      tilePromises.push(this.demSource.getDemTile(z, x + dx, y + dy));
    }
    
    const tiles = await Promise.all(tilePromises);
    const centerTile = tiles[2]; // Center tile is at index 2 ([0,0])
    
    if (!centerTile) {
      return null; // No center tile data available
    }
    
    const tileSize = centerTile.width;
    const paddedSize = tileSize + 2; // Add 1 pixel border on each side
    const paddedData = new Float32Array(paddedSize * paddedSize);
    
    // Fill with no-data value initially
    paddedData.fill(-10000);
    
    // Copy center tile to padded tile (offset by 1 pixel in each direction)
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const srcIndex = y * tileSize + x;
        const dstIndex = (y + 1) * paddedSize + (x + 1);
        paddedData[dstIndex] = centerTile.data[srcIndex];
      }
    }
    
    // Fill border pixels from neighboring tiles (cardinal directions only)
    // Tile indices: [0]=north, [1]=west, [2]=center, [3]=east, [4]=south
    
    const northTile = tiles[0];
    const westTile = tiles[1];
    const eastTile = tiles[3];
    const southTile = tiles[4];
    
    // Fill top border from north neighbor
    if (northTile) {
      for (let x = 0; x < tileSize; x++) {
        const srcIndex = (tileSize - 1) * tileSize + x; // Bottom edge of north neighbor
        const dstIndex = 0 * paddedSize + (x + 1); // Top border of padded tile
        paddedData[dstIndex] = northTile.data[srcIndex];
      }
    }
    
    // Fill left border from west neighbor
    if (westTile) {
      for (let y = 0; y < tileSize; y++) {
        const srcIndex = y * tileSize + (tileSize - 1); // Right edge of west neighbor
        const dstIndex = (y + 1) * paddedSize + 0; // Left border of padded tile
        paddedData[dstIndex] = westTile.data[srcIndex];
      }
    }
    
    // Fill right border from east neighbor
    if (eastTile) {
      for (let y = 0; y < tileSize; y++) {
        const srcIndex = y * tileSize + 0; // Left edge of east neighbor
        const dstIndex = (y + 1) * paddedSize + (paddedSize - 1); // Right border of padded tile
        paddedData[dstIndex] = eastTile.data[srcIndex];
      }
    }
    
    // Fill bottom border from south neighbor
    if (southTile) {
      for (let x = 0; x < tileSize; x++) {
        const srcIndex = 0 * tileSize + x; // Top edge of south neighbor
        const dstIndex = (paddedSize - 1) * paddedSize + (x + 1); // Bottom border of padded tile
        paddedData[dstIndex] = southTile.data[srcIndex];
      }
    }
    
    // Fill corner pixels by interpolating from adjacent border pixels
    // Top-left corner
    const topLeft = paddedData[0 * paddedSize + 1]; // Top border, first pixel
    const leftTop = paddedData[1 * paddedSize + 0]; // Left border, first pixel
    paddedData[0 * paddedSize + 0] = (topLeft + leftTop) / 2;
    
    // Top-right corner
    const topRight = paddedData[0 * paddedSize + (paddedSize - 2)]; // Top border, last pixel
    const rightTop = paddedData[1 * paddedSize + (paddedSize - 1)]; // Right border, first pixel
    paddedData[0 * paddedSize + (paddedSize - 1)] = (topRight + rightTop) / 2;
    
    // Bottom-left corner
    const bottomLeft = paddedData[(paddedSize - 1) * paddedSize + 1]; // Bottom border, first pixel
    const leftBottom = paddedData[(paddedSize - 2) * paddedSize + 0]; // Left border, last pixel
    paddedData[(paddedSize - 1) * paddedSize + 0] = (bottomLeft + leftBottom) / 2;
    
    // Bottom-right corner
    const bottomRight = paddedData[(paddedSize - 1) * paddedSize + (paddedSize - 2)]; // Bottom border, last pixel
    const rightBottom = paddedData[(paddedSize - 2) * paddedSize + (paddedSize - 1)]; // Right border, last pixel
    paddedData[(paddedSize - 1) * paddedSize + (paddedSize - 1)] = (bottomRight + rightBottom) / 2;
    
    return {
      width: paddedSize,
      height: paddedSize,
      data: paddedData
    };
  }

  public registerSlopeProtocol(): void {
    if (!this.checkSupport()) {
      console.error("Slope terrain rendering requires WebGL 2 support");
      // Could show a user notification here
      return;
    }

    maplibregl.addProtocol("slope-terrain", async (params) => {
      // Extract style, optional date, and DEM URL from the nested protocol format
      // URL format: slope-terrain://style/dem-protocol://z/x/y or slope-terrain://style/dayOfYear/dem-protocol://z/x/y
      const urlMatch = params.url.match(/slope-terrain:\/\/([^\/]+)(?:\/(\d+))?\/(.*)/);
      
      if (!urlMatch) {
        throw new Error(`Invalid slope-terrain URL format: ${params.url}. Expected: slope-terrain://style/dem-url or slope-terrain://style/dayOfYear/dem-url`);
      }

      const styleParam = urlMatch[1];
      const dayOfYearParam = urlMatch[2] ? parseInt(urlMatch[2], 10) : null;
      const demUrl = urlMatch[3];
      
      // Extract z/x/y from the DEM URL
      const demMatch = demUrl.match(/(\d+)\/(\d+)\/(\d+)/);
      if (!demMatch) {
        throw new Error(`Invalid DEM URL format in: ${demUrl}`);
      }

      const z = parseInt(demMatch[1], 10);
      const x = parseInt(demMatch[2], 10);
      const y = parseInt(demMatch[3], 10);
      
      if (isNaN(z) || isNaN(x) || isNaN(y)) {
        throw new Error(`Invalid tile coordinates in URL: ${params.url}`);
      }

      // Validate and convert style parameter
      const style = styleParam as MapStyleOverlay;
      if (!Object.values(MapStyleOverlay).includes(style)) {
        throw new Error(`Invalid style parameter: ${styleParam}. Valid styles: ${Object.values(MapStyleOverlay).join(', ')}`);
      }

      const zoomLevel = z;
      
      // Convert tile Y coordinate to latitude using Web Mercator formula
      const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoomLevel);
      const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      
      // Convert tile X coordinate to longitude
      const longitude = (x / Math.pow(2, zoomLevel)) * 360 - 180;

      // Get the padded DEM tile data to avoid seams
      const demTile = await this.getPaddedDemTile(z, x, y);
      
      // Use fixed coarse terrain zoom for extended shadow casting
      const lowResZoom = SlopeTerrainRenderer.COARSE_TERRAIN_ZOOM;
      let lowResDemTile: { width: number; height: number; data: Float32Array } | null = null;
      
      if (z >= lowResZoom) {
        // Current zoom is higher than coarse zoom - normal case
        const lowResScale = Math.pow(2, z - lowResZoom); // Scale factor between resolutions
        const lowResX = Math.floor(x / lowResScale);
        const lowResY = Math.floor(y / lowResScale);
        console.log(`Loading low-res tile: z${lowResZoom}/${lowResX}/${lowResY} (scale: ${lowResScale}) for high-res z${z}/${x}/${y}`);
        lowResDemTile = await this.getPaddedDemTile(lowResZoom, lowResX, lowResY);
        console.log(`Low-res tile loaded:`, lowResDemTile ? 'SUCCESS' : 'FAILED');
      } else {
        // Current zoom is lower than coarse zoom - use current tile as coarse
        // This happens at low zoom levels where we don't need extended range anyway
        console.log(`Skipping low-res tile for zoom ${z} (< ${lowResZoom})`);
        lowResDemTile = null; // Don't use coarse terrain for low zoom levels
      }

      if (!demTile) {
        // Return transparent tile if no data
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, 512, 512);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve)
          );
          if (blob) {
            return { data: await blob.arrayBuffer() };
          }
        }
        throw new Error("Failed to create empty tile");
      }

      // Convert dayOfYear back to date for sun exposure calculation
      let dateForCalculation: Date | undefined;
      if (style === MapStyleOverlay.SunExposure && dayOfYearParam !== null) {
        const currentYear = new Date().getFullYear();
        dateForCalculation = new Date(currentYear, 0, dayOfYearParam);
      } else if (style === MapStyleOverlay.SunExposure) {
        // Fallback to instance property if no date in URL
        dateForCalculation = this.sunExposureDate;
      }

      // Process the terrain data with our shader
      const processedData = this.processTerrainTile(
        demTile,
        zoomLevel,
        x,
        y,
        latitude,
        longitude,
        style,
        dateForCalculation,
        lowResDemTile
      );

      if (!processedData) {
        throw new Error("WebGL processing failed");
      }

      // Convert ImageData to blob
      const canvas = document.createElement("canvas");
      canvas.width = processedData.width;
      canvas.height = processedData.height;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Failed to get canvas context");
      }

      context.putImageData(processedData, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve)
      );

      if (!blob) {
        throw new Error("Failed to create blob");
      }

      return { data: await blob.arrayBuffer() };
    });
  }

  public cleanup(): void {
    if (this.texturePool) {
      this.texturePool.cleanup();
      this.texturePool = null;
    }
  }
}
