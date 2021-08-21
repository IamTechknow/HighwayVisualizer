const path = require('path');
const webpack = require('webpack');

const SRC_DIR = path.join(__dirname, '/client');

module.exports = {
  entry: `${SRC_DIR}/index.tsx`,
  mode: 'development',
  devtool: 'source-map',
  devServer: {
    historyApiFallback: true,
    hot: true,
    open: true,
    static: {
      directory: path.join(__dirname, "/public"),
    },
  },
  output: {
    filename: 'bundle.js',
    module: true,
    path: path.join(__dirname, '/public/dist'),
    publicPath: '/dist/',
  },
  experiments: {
    outputModule: true,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)?/,
        include: SRC_DIR,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('autoprefixer')],
              },
            },
          },
        ],
        include: [
          SRC_DIR,
          path.resolve(__dirname, 'node_modules/leaflet'),
        ],
      },
      {
        test: /\.(png)$/,
        loader: 'file-loader',
        options: {
          outputPath: '..', // Put output files next to index.html
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __API__: JSON.stringify('http://localhost:3000'),
    }),
  ],
};
