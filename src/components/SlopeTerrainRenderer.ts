import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";

export class SlopeTerrainRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  private isSupported: boolean = false;
  private demSource: InstanceType<typeof mlcontour.DemSource>;

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
    // Try to initialize WebGL on construction
    this.canvas = document.createElement("canvas");
    this.isSupported = this.initWebGL(this.canvas);
    this.demSource = demSource;

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

  private initWebGL(canvas: HTMLCanvasElement): boolean {
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
    
    // Resize canvas to match output size
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    gl.viewport(0, 0, outputWidth, outputHeight);

    // Create texture from elevation data
    // Store elevation values directly in the red channel as floats
    const texture = gl.createTexture();
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

    // Clean up
    gl.deleteTexture(texture);

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
    // Create a padded tile by fetching center tile + 8 neighbors to eliminate seams
    const tilePromises: Promise<{ width: number; height: number; data: Float32Array } | null>[] = [];
    
    // Define neighboring tile offsets: [dx, dy]
    const neighbors = [
      [-1, -1], [0, -1], [1, -1], // top row
      [-1,  0], [0,  0], [1,  0], // middle row (center is [0,0])
      [-1,  1], [0,  1], [1,  1]  // bottom row
    ];
    
    // Fetch all tiles (center + neighbors)
    for (const [dx, dy] of neighbors) {
      tilePromises.push(this.demSource.getDemTile(z, x + dx, y + dy));
    }
    
    const tiles = await Promise.all(tilePromises);
    const centerTile = tiles[4]; // Center tile is at index 4 ([0,0])
    
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
    
    // Fill border pixels from neighboring tiles
    const neighborTileMap = [
      [0, 1, 2],  // top row of neighbor tiles
      [3, 4, 5],  // middle row 
      [6, 7, 8]   // bottom row
    ];
    
    // Process each neighbor tile to fill border pixels
    for (let ny = 0; ny < 3; ny++) {
      for (let nx = 0; nx < 3; nx++) {
        const neighborIndex = neighborTileMap[ny][nx];
        const neighborTile = tiles[neighborIndex];
        
        if (!neighborTile || neighborIndex === 4) continue; // Skip center tile and missing neighbors
        
        // Determine which border pixels to fill from this neighbor
        if (nx === 0 && ny === 1) { // Left neighbor
          for (let y = 0; y < tileSize; y++) {
            const srcIndex = y * tileSize + (tileSize - 1); // Right edge of left neighbor
            const dstIndex = (y + 1) * paddedSize + 0; // Left border of padded tile
            paddedData[dstIndex] = neighborTile.data[srcIndex];
          }
        } else if (nx === 2 && ny === 1) { // Right neighbor
          for (let y = 0; y < tileSize; y++) {
            const srcIndex = y * tileSize + 0; // Left edge of right neighbor
            const dstIndex = (y + 1) * paddedSize + (paddedSize - 1); // Right border of padded tile
            paddedData[dstIndex] = neighborTile.data[srcIndex];
          }
        } else if (nx === 1 && ny === 0) { // Top neighbor
          for (let x = 0; x < tileSize; x++) {
            const srcIndex = (tileSize - 1) * tileSize + x; // Bottom edge of top neighbor
            const dstIndex = 0 * paddedSize + (x + 1); // Top border of padded tile
            paddedData[dstIndex] = neighborTile.data[srcIndex];
          }
        } else if (nx === 1 && ny === 2) { // Bottom neighbor
          for (let x = 0; x < tileSize; x++) {
            const srcIndex = 0 * tileSize + x; // Top edge of bottom neighbor
            const dstIndex = (paddedSize - 1) * paddedSize + (x + 1); // Bottom border of padded tile
            paddedData[dstIndex] = neighborTile.data[srcIndex];
          }
        } else if (nx === 0 && ny === 0) { // Top-left corner
          const srcIndex = (tileSize - 1) * tileSize + (tileSize - 1); // Bottom-right of top-left neighbor
          const dstIndex = 0 * paddedSize + 0; // Top-left corner of padded tile
          paddedData[dstIndex] = neighborTile.data[srcIndex];
        } else if (nx === 2 && ny === 0) { // Top-right corner
          const srcIndex = (tileSize - 1) * tileSize + 0; // Bottom-left of top-right neighbor
          const dstIndex = 0 * paddedSize + (paddedSize - 1); // Top-right corner of padded tile
          paddedData[dstIndex] = neighborTile.data[srcIndex];
        } else if (nx === 0 && ny === 2) { // Bottom-left corner
          const srcIndex = 0 * tileSize + (tileSize - 1); // Top-right of bottom-left neighbor
          const dstIndex = (paddedSize - 1) * paddedSize + 0; // Bottom-left corner of padded tile
          paddedData[dstIndex] = neighborTile.data[srcIndex];
        } else if (nx === 2 && ny === 2) { // Bottom-right corner
          const srcIndex = 0 * tileSize + 0; // Top-left of bottom-right neighbor
          const dstIndex = (paddedSize - 1) * paddedSize + (paddedSize - 1); // Bottom-right corner of padded tile
          paddedData[dstIndex] = neighborTile.data[srcIndex];
        }
      }
    }
    
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
}
