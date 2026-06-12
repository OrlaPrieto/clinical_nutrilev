const nodeExternals = require('webpack-node-externals');

module.exports = function (options, webpack) {
  return {
    ...options,
    externals: [
      nodeExternals({
        // Look at both local and root node_modules to prevent bundling hoisted packages
        additionalModuleDirs: ['../../node_modules'],
      }),
    ],
  };
};
