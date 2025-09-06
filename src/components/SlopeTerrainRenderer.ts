import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";

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

export class SlopeTerrainRenderer {
  private canvas: OffscreenCanvas | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private isSupported: boolean = false;
  private demSource: InstanceType<typeof mlcontour.DemSource>;
  private texturePool: TexturePool | null = null;

  private vertexShaderSource = `#version 300 es
    in vec2 a_position;
    in vec2 a_texCoord;
    out vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  private fragmentShaderSource = `#version 300 es
    precision highp float;
    
    out vec4 fragColor;
    
    uniform sampler2D u_texture;
    uniform float u_zoomLevel;
    uniform float u_latitude;
    in vec2 v_texCoord;
    
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
      if (normalizedSlope < 0.25) {
        // Green to Yellow (0-11.25 degrees)
        color = mix(green, yellow, normalizedSlope * 4.0);
      } else if (normalizedSlope < 0.5) {
        // Yellow to Orange (11.25-22.5 degrees)
        color = mix(yellow, orange, (normalizedSlope - 0.25) * 4.0);
      } else if (normalizedSlope < 0.75) {
        // Orange to Red (22.5-33.75 degrees)
        color = mix(orange, red, (normalizedSlope - 0.5) * 4.0);
      } else {
        // Deep red for extreme slopes (33.75+ degrees)
        color = red;
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
      
      // Calculate pixel size in meters based on zoom level and latitude
      // Formula: pixelSizeMeters = 156543.03392 * cos(latitude) / 2^zoom
      float latRad = radians(u_latitude);
      float pixelSizeMeters = 156543.03392 * cos(latRad) / pow(2.0, u_zoomLevel);
      
      // Calculate the magnitude of the gradient vector
      float gradientMagnitude = sqrt(dzdx * dzdx + dzdy * dzdy);
      
      // Calculate slope in radians, then convert to degrees
      // The slope is the arctangent of the elevation change over horizontal distance
      float slope = atan(gradientMagnitude / pixelSizeMeters);
      float slopeDegrees = degrees(slope);
      
      // Get color based on slope
      vec3 slopeColor = getSlopeColor(slopeDegrees);
      
      // Add some basic hillshading for depth perception
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

    // Create shaders
    const vertexShader = this.createShader(
      gl,
      gl.VERTEX_SHADER,
      this.vertexShaderSource
    );
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      this.fragmentShaderSource
    );

    if (!vertexShader || !fragmentShader) {
      return false;
    }

    // Create program
    this.program = gl.createProgram();
    if (!this.program) return false;

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(
        "Program linking error:",
        gl.getProgramInfoLog(this.program)
      );
      return false;
    }

    // Validate the program
    gl.validateProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.VALIDATE_STATUS)) {
      console.error(
        "Program validation error:",
        gl.getProgramInfoLog(this.program)
      );
      return false;
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
    latitude: number = 50.0
  ): ImageData | null {
    if (!this.isSupported) {
      return null;
    }

    const gl = this.gl;
    const program = this.program;
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

    const zoomLocation = gl.getUniformLocation(program, "u_zoomLevel");
    gl.uniform1f(zoomLocation, zoomLevel);

    const latitudeLocation = gl.getUniformLocation(program, "u_latitude");
    gl.uniform1f(latitudeLocation, latitude);

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
      // Extract zoom level and coordinates from URL
      // URL format: slope-terrain://mlcontour://...
      const urlMatch = params.url.match(/\/(\d+)\/(\d+)\/(\d+)/);
      let zoomLevel = 10; // Default zoom
      let latitude = 50.0; // Default latitude (Whistler area)
      let x = 0,
        y = 0,
        z = 0;

      if (urlMatch) {
        z = parseInt(urlMatch[1], 10);
        x = parseInt(urlMatch[2], 10);
        y = parseInt(urlMatch[3], 10);
        zoomLevel = z;
        // Convert tile Y coordinate to latitude using Web Mercator formula
        const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, zoomLevel);
        latitude =
          (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
      }

      // Get the padded DEM tile data to avoid seams
      const demTile = await this.getPaddedDemTile(z, x, y);

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

      // Process the terrain data with our shader
      const processedData = this.processTerrainTile(
        demTile,
        zoomLevel,
        latitude
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
