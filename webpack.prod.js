const merge = require('webpack-merge')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const common = require('./webpack.common.js')
const webpack = require('webpack')

module.exports = merge(common, {
  // devtool: 'source-map',
  plugins: [
    new UglifyJSPlugin({
      sourceMap: false,
      uglifyOptions: { output: { comments: false } }
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    })
  ],
  mode: 'production'
});