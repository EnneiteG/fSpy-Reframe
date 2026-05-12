const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const commonConfig = {
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json']
  }
}

module.exports = [
  {
    target: 'electron-main',
    entry: { main: './src/main/index.ts' },
    node: {
      __dirname: false
    },
    ...commonConfig
  },
  {
    target: 'electron-preload',
    entry: { preload: './src/main/preload.ts' },
    node: {
      __dirname: false
    },
    ...commonConfig
  },
  {
    target: 'web',
    entry: { gui: './src/gui/index.tsx' },
    devServer: {
      static: {
        directory: path.resolve(__dirname, 'build')
      },
      port: 8080
    },
    plugins: [new HtmlWebpackPlugin({
      template: 'src/gui/index.html'
    })],
    ...commonConfig
  }
]
