const path = require('path')
const TerserJSPlugin = require('terser-webpack-plugin')

module.exports = {
  entry: path.resolve(__dirname, 'src/assets/scripts/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist/assets'),
  },
  optimization: {
    minimizer: [new TerserJSPlugin({})],
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  externals: {
    // define newrelic as an external library
    // http://webpack.github.io/docs/configuration.html#externals
    newrelic: 'newrelic'
  }
}
