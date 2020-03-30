const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const BundleAnalyzerPlugin = require("webpack-bundle-analyzer")
  .BundleAnalyzerPlugin;
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  plugins: [new BundleAnalyzerPlugin({ analyzerMode: "disabled" })]
});
