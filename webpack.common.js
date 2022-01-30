const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");
const webpack = require("webpack");

module.exports = {
  entry: "./src/index.tsx",
  output: {
    filename: "[name].bundle.js",
    chunkFilename: "[name].chunk.js",
    path: __dirname + "/dist",
    clean: true,
  },

  resolve: {
    // Add '.ts' and '.tsx' as resolvable extensions.
    extensions: [".ts", ".tsx", ".js", ".json", ".css"],
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
      // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
      { test: /\.tsx?$/, loader: "ts-loader" },

      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { enforce: "pre", test: /\.js$/, loader: "source-map-loader" },

      {
        test: path.resolve(__dirname, "src/assets/robots.txt"),
        type: "asset/resource",
        generator: {
          filename: "robots.txt",
        },
      },

      {
        test: path.resolve(__dirname, "taginfo.json"),
        type: "asset/resource",
        generator: {
          filename: "taginfo.json",
        },
      },
    ],
  },

  // When importing a module whose path matches one of the following, just
  // assume a corresponding global variable exists and use that instead.
  // This is important because it allows us to avoid bundling all of our
  // dependencies, which allows browsers to cache those libraries between builds.
  externals: {
    "mapbox-gl": "mapboxgl",
  },

  plugins: [
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /de/),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "src/assets/index.html",
    }),
  ],
};
