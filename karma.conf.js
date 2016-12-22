module.exports = function (config) {
  config.set({
    files: [
      'node_modules/angular/angular.js',
      'node_modules/pouchdb/dist/pouchdb.js',
      'node_modules/angular-pouchdb/dist/angular-pouchdb.js',
      'node_modules/ng-smart-id/dist/bundle.js',
      'dist/bundle.js',
      'node_modules/angular-mocks/angular-mocks.js',
      'test/*.spec.js'
    ],

    frameworks: ['jasmine'],

    plugins: [
      'karma-jasmine',
      'karma-env-preprocessor',
      'karma-phantomjs-launcher'
    ],

    reporters: ['progress'],

    logLevel: 'WARN',

    singleRun: true,

    autoWatch: false,

    browsers: ['PhantomJS'],

    preprocessors: {
      '**/*.js': ['env']
    },

    envPreprocessor: [
      'COUCHDB_URL'
    ]
  })
}
