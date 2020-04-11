const path = require('path');
const SRC_DIR = path.join(__dirname, '/client');
const DIST_DIR = path.join(__dirname, '/public/dist');

// Decide whether to use cssnano to minify CSS
const getPlugins = (argv) => {
  const plugins = [
    require('autoprefixer')
  ];
  if (argv.mode === 'production') {
    plugins.push(require('cssnano'));
  }
  return plugins;
}

module.exports = (env, argv) => ({
  entry: `${SRC_DIR}/index.jsx`,
  devtool: 'source-map',
  mode: 'development',
  cache: true,
  output: {
    filename: 'bundle.js',
    path: DIST_DIR,
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
          loader: 'babel-loader'
        },
      },
      {
        test: /\.css$/,
        use: [ { loader: 'style-loader' }, { loader: 'css-loader' }, {
          loader: 'postcss-loader',
          options: {
            plugins: getPlugins(argv)
          },
        }],
        include: [
          SRC_DIR,
          path.resolve(__dirname, "node_modules/leaflet")
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
});
