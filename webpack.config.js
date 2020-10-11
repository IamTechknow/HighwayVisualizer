const path = require('path');
const webpack = require('webpack');

const SRC_DIR = path.join(__dirname, '/client');

// Decide whether to use cssnano to minify CSS
const getPlugins = (argv) => {
  const plugins = [
    require('autoprefixer')
  ];
  if (argv.mode === 'production') {
    plugins.push(require('cssnano'));
  }
  return plugins;
};

// Allow absolute URL to be substituted through baseURI flag
const getBaseURI = (argv) => JSON.stringify(argv.baseURI ?? 'http://localhost');

module.exports = (env, argv) => ({
  entry: `${SRC_DIR}/index.jsx`,
  devtool: argv.mode === 'development' ? 'source-map' : false,
  cache: true,
  output: {
    filename: 'bundle.js',
    path: path.join(__dirname, '/public/dist'),
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)?/,
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
                plugins: getPlugins(argv),
              },
            },
          }
        ],
        include: [
          SRC_DIR,
          path.resolve(__dirname, "node_modules/leaflet"),
        ],
      },
      {
        test: /\.(png)$/,
        loader: 'file-loader',
        options: {
          outputPath: '..' // Put output files next to index.html
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      __API__: getBaseURI(argv)
    })
  ],
});
