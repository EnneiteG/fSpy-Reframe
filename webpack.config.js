const path = require('path')

const commonConfig = {
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        enforce: 'pre',
        use: [
          {
            loader: 'tslint-loader',
            options: {
              typeCheck: false,
              emitErrors: true,
              configFile: 'tslint.json'
            }
          }
        ]
      },
      {
        test: /\.tsx?$/,
        use: ['babel-loader', 'ts-loader']
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.json']
  },
  node: {
    __dirname: false
  }
}

const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = [
  Object.assign(
    {
      target: 'electron-main',
      entry: { main: './src/main/index.ts' }
    },
    commonConfig),
  Object.assign(
    {
      target: 'electron-renderer',
      entry: { gui: './src/gui/index.tsx' },
      devServer: {
        static: {
          directory: path.resolve(__dirname, 'build')
        },
        port: 8080
      },
      plugins: [new HtmlWebpackPlugin({
        template: 'src/gui/index.html'
      })]
    },
    commonConfig)
]
