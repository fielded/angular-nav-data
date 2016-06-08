(function (angular$1) {
  'use strict';

  angular$1 = 'default' in angular$1 ? angular$1['default'] : angular$1;

  function __commonjs(fn, module) { return module = { exports: {} }, fn(module, module.exports), module.exports; }

  (function (angular) {
    'use strict';

    angular = 'default' in angular ? angular['default'] : angular;

    var babelHelpers = {};

    babelHelpers.classCallCheck = function (instance, Constructor) {
      if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
      }
    };

    babelHelpers.createClass = function () {
      function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
          var descriptor = props[i];
          descriptor.enumerable = descriptor.enumerable || false;
          descriptor.configurable = true;
          if ("value" in descriptor) descriptor.writable = true;
          Object.defineProperty(target, descriptor.key, descriptor);
        }
      }

      return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps);
        return Constructor;
      };
    }();

    babelHelpers;

    var parsePattern = function parsePattern(pattern, separator) {
      var parsePatternField = function parsePatternField(field) {
        var parsed = {
          key: field,
          isOptional: false
        };

        var splitted = field.split('?');
        if (splitted[0] === '') {
          parsed.key = splitted[1];
          parsed.isOptional = true;
        }

        return parsed;
      };

      return pattern.split(separator).map(parsePatternField);
    };

    var SmartIdService = function () {
      function SmartIdService($injector) {
        babelHelpers.classCallCheck(this, SmartIdService);

        try {
          this.separator = $injector.get('ngSmartIdSeparator');
        } catch (e) {
          this.separator = ':';
        }

        try {
          this.patterns = $injector.get('ngSmartIdPatterns');
        } catch (e) {
          this.patterns = {};
        }
      }

      babelHelpers.createClass(SmartIdService, [{
        key: 'parse',
        value: function parse(id, pattern) {
          var idFields = id.split(this.separator);

          var key = void 0;
          var result = idFields.reduce(function (parsed, field) {
            if (!key) {
              key = field;
            } else {
              parsed[key] = field;
              key = undefined;
            }
            return parsed;
          }, {});

          if (pattern) {
            pattern = this.patterns[pattern] || pattern;
            var patternFields = parsePattern(pattern, this.separator);

            patternFields.forEach(function (field) {
              if (!result[field.key] && !field.isOptional) {
                throw new Error('could not parse the id, non optional field ' + field.key + ' missing');
              }
            });
          }

          return result;
        }
      }, {
        key: 'idify',
        value: function idify(object, pattern) {
          var _this = this;

          var isValid = function isValid(value) {
            return typeof value !== 'undefined' && value !== null && value !== '';
          };

          pattern = this.patterns[pattern] || pattern;
          var patternFields = parsePattern(pattern, this.separator);

          return patternFields.reduce(function (id, field) {
            var value = object[field.key];
            if (value && isValid(value)) {
              return id + (id.length ? _this.separator + field.key : field.key) + _this.separator + value;
            } else {
              if (!field.isOptional) {
                throw new Error('could not generate id, missing field ' + field.key);
              }
              return id;
            }
          }, '');
        }
      }]);
      return SmartIdService;
    }();

    angular.module('ngSmartId', []).service('smartId', SmartIdService);

  }(angular));

  var angularPouchdb = __commonjs(function (module, exports) {
  if (typeof module !== 'undefined' && typeof exports !== 'undefined' && module.exports === exports) {
    module.exports = 'pouchdb';
  }

  (function(window, angular, undefined) {
  'use strict';

  angular.module('pouchdb', [])
    .constant('POUCHDB_METHODS', {
      destroy: 'qify',
      put: 'qify',
      post: 'qify',
      get: 'qify',
      remove: 'qify',
      bulkDocs: 'qify',
      bulkGet: 'qify',
      allDocs: 'qify',
      putAttachment: 'qify',
      getAttachment: 'qify',
      removeAttachment: 'qify',
      query: 'qify',
      viewCleanup: 'qify',
      info: 'qify',
      compact: 'qify',
      revsDiff: 'qify',
      changes: 'eventEmitter',
      sync: 'eventEmitter',
      replicate: {
        to: 'eventEmitter',
        from: 'eventEmitter'
      }
    })
    .service('pouchDBDecorators', ["$q", function($q) {
      this.qify = function(fn) {
        return function() {
          return $q.when(fn.apply(this, arguments));
        };
      };

      this.eventEmitter = function(fn) {
        return function() {
          var deferred = $q.defer();
          var emitter = fn.apply(this, arguments)
            .on('change', function(change) {
              return deferred.notify({
                change: change
              });
            })
            .on('paused', function(paused) {
              return deferred.notify({
                paused: paused
              });
            })
            .on('active', function(active) {
              return deferred.notify({
                active: active
              });
            })
            .on('denied', function(denied) {
              return deferred.notify({
                denied: denied
              });
            })
            .on('complete', function(response) {
              return deferred.resolve(response);
            })
            .on('error', function(error) {
              return deferred.reject(error);
            });
          emitter.$promise = deferred.promise;
          return emitter;
        };
      };
    }])
    .provider('pouchDB', ["POUCHDB_METHODS", function(POUCHDB_METHODS) {
      var self = this;
      self.methods = POUCHDB_METHODS;
      self.$get = ["$window", "pouchDBDecorators", function($window, pouchDBDecorators) {
        function wrapMethods(db, methods, parent) {
          for (var method in methods) {
            var wrapFunction = methods[method];

            if (!angular.isString(wrapFunction)) {
              wrapMethods(db, wrapFunction, method);
              continue;
            }

            wrapFunction = pouchDBDecorators[wrapFunction];

            if (!parent) {
              db[method] = wrapFunction(db[method]);
              continue;
            }

            db[parent][method] = wrapFunction(db[parent][method]);
          }
          return db;
        }

        return function pouchDB(name, options) {
          var db = new $window.PouchDB(name, options);
          return wrapMethods(db, self.methods);
        };
      }];
    }]);
  })(window, window.angular);
  });

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  var registerCallback = function registerCallback(replicationFrom, callback) {
    replicationFrom.then(callback);
  };

  var LocationsService = function () {
    function LocationsService($injector, pouchDB, angularNavDataUtilsService) {
      classCallCheck(this, LocationsService);

      var dataModuleRemoteDB = void 0;

      try {
        dataModuleRemoteDB = $injector.get('dataModuleRemoteDB');
      } catch (e) {
        throw new Error('dataModuleRemoteDB should be provided in the data module configuration');
      }

      this.pouchDB = pouchDB;
      this.angularNavDataUtilsService = angularNavDataUtilsService;

      this.remoteDB = this.pouchDB(dataModuleRemoteDB);
      this.replicationFrom;
      this.localDB;
      this.registeredOnReplicationCompleteCallbackIds = [];
      this.callbacksPendingRegistration = [];
    }

    createClass(LocationsService, [{
      key: 'startReplication',
      value: function startReplication(zone, state) {
        var options = {
          filter: 'locationsByState/locationsByState',
          query_params: {
            zone: zone,
            state: state
          }
        };

        this.localDB = this.pouchDB('navIntLocationsDB');
        this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);
        this.callbacksPendingRegistration.forEach(registerCallback.bind(null, this.replicationFrom));
      }
    }, {
      key: 'callOnReplicationComplete',
      value: function callOnReplicationComplete(callbackId, callback) {
        if (this.registeredOnReplicationCompleteCallbackIds.indexOf(callbackId) === -1) {
          this.registeredOnReplicationCompleteCallbackIds.push(callbackId);
          if (this.replicationFrom) {
            registerCallback(this.replicationFrom, callback);
          } else {
            // in case the registration happens before starting the replication
            this.callbacksPendingRegistration.push(callback);
          }
        }
      }
    }, {
      key: 'allDocs',
      value: function allDocs(options) {
        var db = this.localDB || this.remoteDB;
        return this.angularNavDataUtilsService.allDocs(db, options);
      }
    }]);
    return LocationsService;
  }();

  var LgasService = function () {
    function LgasService($q, smartId, locationsService) {
      classCallCheck(this, LgasService);

      this.cachedLgasByState = {};
      this.cachedLgaIdsByState = {};
      this.defaultZone;
      this.defaultState;

      this.$q = $q;
      this.smartId = smartId;
      this.locationsService = locationsService;

      // For the state dashboard:
      // locations are replicated and the zone and state are set by default
      // with `setState`
      this.locationsService.callOnReplicationComplete('lgas-service', this.byState.bind(this));
      this.byState();
    }

    createClass(LgasService, [{
      key: 'queryAndUpdateCache',
      value: function queryAndUpdateCache(zone, state) {
        var _this = this;

        var onlyId = function onlyId(lga) {
          return lga.id;
        };

        var addId = function addId(lga) {
          lga.id = _this.smartId.parse(lga._id).lga;
          return lga;
        };

        var query = function query(zone, state) {
          var options = {
            'include_docs': true,
            ascending: true,
            startkey: 'zone:' + zone + ':state:' + state + ':',
            endkey: 'zone:' + zone + ':state:' + state + ':￿'
          };

          return _this.locationsService.allDocs(options);
        };

        var updateCache = function updateCache(state, docs) {
          _this.cachedLgasByState[state] = docs.map(addId);
          _this.cachedLgaIdsByState[state] = _this.cachedLgasByState[state].map(onlyId);
        };

        return query(zone, state).then(updateCache.bind(null, state));
      }
    }, {
      key: 'byState',
      value: function byState(zone, state) {
        zone = zone || this.defaultZone;
        state = state || this.defaultState;
        if (!this.cachedLgasByState[state]) {
          return this.queryAndUpdateCache(zone, state).then(function () {
            return this.cachedLgasByState[state];
          }.bind(this));
        }
        return this.$q.when(this.cachedLgasByState[state]);
      }
    }, {
      key: 'idsByState',
      value: function idsByState(zone, state) {
        zone = zone || this.defaultZone;
        state = state || this.defaultState;
        if (!this.cachedLgasByState[state]) {
          return this.queryAndUpdateCache(zone, state).then(function () {
            return this.cachedLgaIdsByState[state];
          }.bind(this));
        }
        return this.$q.when(this.cachedLgaIdsByState[state]);
      }
    }, {
      key: 'setState',
      value: function setState(zone, state) {
        this.defaultZone = zone;
        this.defaultState = state;
      }
    }]);
    return LgasService;
  }();

  var StatesService = function () {
    function StatesService($q, smartId, locationsService) {
      classCallCheck(this, StatesService);

      this.cachedStatesByZone = {};
      this.cachedStateIdsByZone = {};
      this.defaultZone;

      this.$q = $q;
      this.smartId = smartId;
      this.locationsService = locationsService;

      // For the state dashboard:
      // locations are replicated and the zone and state are set by default
      this.locationsService.callOnReplicationComplete('states-service', this.byZone.bind(this));
      this.byZone();
    }

    createClass(StatesService, [{
      key: 'queryAndUpdateCache',
      value: function queryAndUpdateCache(zone) {
        var _this = this;

        var onlyId = function onlyId(state) {
          return state.id;
        };

        var addId = function addId(state) {
          state.id = _this.smartId.parse(state._id).state;
          return state;
        };

        var filterStates = function filterStates(docs) {
          return docs.filter(function (doc) {
            return doc.level === 'state';
          });
        };

        var query = function query(zone) {
          var options = {
            'include_docs': true,
            ascending: true,
            startkey: 'zone:' + zone + ':',
            endkey: 'zone:' + zone + ':￿'
          };

          return _this.locationsService.allDocs(options).then(filterStates);
        };

        var updateCache = function updateCache(zone, docs) {
          _this.cachedStatesByZone[zone] = docs.map(addId);
          _this.cachedStateIdsByZone[zone] = _this.cachedStatesByZone[zone].map(onlyId);
        };

        return query(zone).then(updateCache.bind(null, zone));
      }
    }, {
      key: 'byZone',
      value: function byZone(zone) {
        zone = zone || this.defaultZone;
        if (!this.cachedStatesByZone[zone]) {
          return this.queryAndUpdateCache(zone).then(function () {
            return this.cachedStatesByZone[zone];
          }.bind(this));
        }
        return this.$q.when(this.cachedStatesByZone[zone]);
      }
    }, {
      key: 'idsByZone',
      value: function idsByZone(zone) {
        zone = zone || this.defaultZone;
        if (!this.cachedStatesByZone[zone]) {
          return this.queryAndUpdateCache(zone).then(function () {
            return this.cachedStateIdsByZone[zone];
          }.bind(this));
        }
        return this.$q.when(this.cachedStateIdsByZone[zone]);
      }
    }, {
      key: 'setZone',
      value: function setZone(zone) {
        this.defaultZone = zone;
      }
    }]);
    return StatesService;
  }();

  var pluckDocs = function pluckDocs(item) {
    return item.doc;
  };

  var parseAllDocsResponse = function parseAllDocsResponse(response) {
    return response.rows.map(pluckDocs);
  };

  var UtilsService = function () {
    function UtilsService() {
      classCallCheck(this, UtilsService);
    }

    createClass(UtilsService, [{
      key: "allDocs",
      value: function allDocs(db, options) {
        return db.allDocs(options).then(parseAllDocsResponse);
      }
    }]);
    return UtilsService;
  }();

  var moduleName$1 = 'angularNavData.utils';

  angular$1.module(moduleName$1, []).service('angularNavDataUtilsService', UtilsService);

  var moduleName = 'angularNavData.locations';

  angular$1.module(moduleName, [moduleName$1, 'ngSmartId', 'pouchdb']).service('locationsService', LocationsService).service('lgasService', LgasService).service('statesService', StatesService);

  var registerCallback$1 = function registerCallback(replicationFrom, callback) {
    replicationFrom.then(callback);
  };

  var ProductsService = function () {
    function ProductsService($injector, pouchDB, angularNavDataUtilsService) {
      classCallCheck(this, ProductsService);

      var dataModuleRemoteDB = void 0;

      try {
        dataModuleRemoteDB = $injector.get('dataModuleRemoteDB');
      } catch (e) {
        throw new Error('dataModuleRemoteDB should be provided in the data module configuration');
      }

      this.pouchDB = pouchDB;
      this.angularNavDataUtilsService = angularNavDataUtilsService;

      this.remoteDB = this.pouchDB(dataModuleRemoteDB);
      this.replicationFrom;
      this.localDB;
      this.registeredOnReplicationCompleteCallbackIds = [];
      this.callbacksPendingRegistration = [];
    }

    createClass(ProductsService, [{
      key: 'startReplication',
      value: function startReplication(zone, state) {
        var options = {
          filter: 'products/products'
        };

        this.localDB = this.pouchDB('navIntProductsDB');
        this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);
        this.callbacksPendingRegistration.forEach(registerCallback$1.bind(null, this.replicationFrom));
      }
    }, {
      key: 'callOnReplicationComplete',
      value: function callOnReplicationComplete(callbackId, callback) {
        if (this.registeredOnReplicationCompleteCallbackIds.indexOf(callbackId) === -1) {
          this.registeredOnReplicationCompleteCallbackIds.push(callbackId);
          if (this.replicationFrom) {
            registerCallback$1(this.replicationFrom, callback);
          } else {
            // in case the registration happens before starting the replication
            this.callbacksPendingRegistration.push(callback);
          }
        }
      }
    }, {
      key: 'allDocs',
      value: function allDocs(options) {
        var db = this.localDB || this.remoteDB;
        return this.angularNavDataUtilsService.allDocs(db, options);
      }
    }]);
    return ProductsService;
  }();

  var ProductListService = function () {
    function ProductListService($q, smartId, productsService) {
      classCallCheck(this, ProductListService);

      this.cachedProducts = [];
      this.cachedDryProducts = [];
      this.cachedFrozenProducts = [];
      this.relevant;

      this.$q = $q;
      this.smartId = smartId;
      this.productsService = productsService;

      // For the state dashboard:
      // products are replicated locally
      this.productsService.callOnReplicationComplete('products-list-service', this.all);
      this.all();
    }

    createClass(ProductListService, [{
      key: 'queryAndUpdateCache',
      value: function queryAndUpdateCache() {
        var _this = this;

        var addId = function addId(product) {
          product.id = _this.smartId.parse(product._id).product;
          return product;
        };

        var generateDocId = function generateDocId(productId) {
          return _this.smartId.idify({ product: productId }, 'product');
        };

        var query = function query() {
          var options = {
            'include_docs': true,
            ascending: true
          };

          if (_this.relevant) {
            options.keys = _this.relevant.map(generateDocId);
          }

          return _this.productsService.allDocs(options);
        };

        var isDry = function isDry(product) {
          return product.storageType === 'dry';
        };

        var isFrozen = function isFrozen(product) {
          return product.storageType === 'frozen';
        };

        var updateCache = function updateCache(docs) {
          _this.cachedProducts = docs.map(addId);
          _this.cachedDryProducts = _this.cachedProducts.filter(isDry);
          _this.cachedFrozenProducts = _this.cachedProducts.filter(isFrozen);
        };

        return query().then(updateCache);
      }
    }, {
      key: 'all',
      value: function all() {
        if (!this.cachedProducts.length > 0) {
          return this.queryAndUpdateCache().then(function () {
            return this.cachedProducts;
          });
        }
        return this.$q.when(this.cachedProducts);
      }
    }, {
      key: 'dry',
      value: function dry() {
        if (!this.cachedDryProducts.length > 0) {
          return this.queryAndUpdateCache().then(function () {
            return this.cachedDryProducts;
          });
        }
        return this.$q.when(this.cachedDryProducts);
      }
    }, {
      key: 'frozen',
      value: function frozen() {
        if (!this.cachedFrozenProducts.length > 0) {
          return this.queryAndUpdateCache().then(function () {
            return this.cachedFrozenProducts;
          });
        }
        return this.$q.when(this.cachedFrozenProducts);
      }
    }, {
      key: 'setRelevant',
      value: function setRelevant(relevant) {
        this.relevant = relevant;
      }
    }]);
    return ProductListService;
  }();

  var moduleName$2 = 'angularNavData.products';

  angular$1.module(moduleName$2, [moduleName$1, 'ngSmartId', 'pouchdb']).service('productsService', ProductsService).service('productsListService', ProductListService);

  angular$1.module('angularNavData', [moduleName, moduleName$2]);

}(angular));