const CleanWebpackPlugin = require('clean-webpack-plugin')
const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: ['babel-polyfill', './src/index.js'],
  plugins: [
    new CleanWebpackPlugin(['dist']),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'powerpack.js'
  },
  node: {
    fs: 'empty'
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ["babel-loader"]
      },
      {
        test: /\.css$/,
        use: [
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: [
          'file-loader'
        ]
      }
    ]
  }
}