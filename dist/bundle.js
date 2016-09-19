(function (angular$1) {
	'use strict';

	angular$1 = 'default' in angular$1 ? angular$1['default'] : angular$1;

	var replicationConfig = { "timeout": 180000 };

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

	var LocationsService = function () {
	  function LocationsService($injector, pouchDB, angularNavDataUtilsService) {
	    classCallCheck(this, LocationsService);

	    var dataModuleRemoteDB = void 0;

	    var pouchDBOptions = {
	      ajax: {
	        timeout: replicationConfig.timeout
	      },
	      skip_setup: true
	    };

	    try {
	      dataModuleRemoteDB = $injector.get('dataModuleRemoteDB');
	    } catch (e) {
	      throw new Error('dataModuleRemoteDB should be provided in the data module configuration');
	    }

	    this.pouchDB = pouchDB;
	    this.angularNavDataUtilsService = angularNavDataUtilsService;

	    this.remoteDB = this.pouchDB(dataModuleRemoteDB, pouchDBOptions);
	    this.replicationFrom;
	    this.localDB;
	    this.onReplicationCompleteCallbacks = {};
	  }

	  createClass(LocationsService, [{
	    key: 'startReplication',
	    value: function startReplication(zone, state) {
	      var _this = this;

	      var onReplicationComplete = function onReplicationComplete() {
	        Object.keys(_this.onReplicationCompleteCallbacks).forEach(function (id) {
	          return _this.onReplicationCompleteCallbacks[id]();
	        });
	      };

	      var onReplicationPaused = function onReplicationPaused(err) {
	        if (!err) {
	          onReplicationComplete();
	          _this.stopReplication();
	        }
	      };

	      var options = {
	        filter: 'locations/by-level',
	        query_params: {
	          zone: zone
	        },
	        live: true,
	        retry: true
	      };

	      if (state) {
	        options.query_params.state = state;
	      }

	      this.localDB = this.pouchDB('navIntLocationsDB');
	      this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);

	      this.replicationFrom.on('paused', onReplicationPaused);

	      return this.replicationFrom;
	    }
	  }, {
	    key: 'stopReplication',
	    value: function stopReplication() {
	      if (this.replicationFrom && this.replicationFrom.cancel) {
	        this.replicationFrom.cancel();
	      }
	    }
	  }, {
	    key: 'callOnReplicationComplete',
	    value: function callOnReplicationComplete(id, callback) {
	      if (this.onReplicationCompleteCallbacks[id]) {
	        return;
	      }
	      this.onReplicationCompleteCallbacks[id] = callback;
	    }
	  }, {
	    key: 'allDocs',
	    value: function allDocs(options) {
	      var db = this.localDB || this.remoteDB;
	      return this.angularNavDataUtilsService.allDocs(db, options);
	    }
	  }, {
	    key: 'query',
	    value: function query(view, options) {
	      var db = this.localDB || this.remoteDB;
	      return this.angularNavDataUtilsService.query(db, view, options);
	    }
	  }, {
	    key: 'get',
	    value: function get(id) {
	      var db = this.localDB || this.remoteDB;
	      return db.get(id);
	    }
	  }]);
	  return LocationsService;
	}();

	LocationsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService'];

	var LgasService = function () {
	  function LgasService($q, smartId, locationsService, statesService, productListService, angularNavDataUtilsService) {
	    classCallCheck(this, LgasService);

	    this.cachedLgasByState = {};
	    this.defaultZone;
	    this.defaultState;
	    this.registeredOnCacheUpdatedCallbacks = {};

	    this.$q = $q;
	    this.smartId = smartId;
	    this.locationsService = locationsService;
	    this.statesService = statesService;
	    this.productListService = productListService;
	    this.utils = angularNavDataUtilsService;

	    // For the state dashboard:
	    // locations are replicated and the zone and state are set by default
	    // with `setState`
	    var onReplicationComplete = this.bustCache.bind(this);
	    this.locationsService.callOnReplicationComplete('lgas-service', onReplicationComplete);
	  }

	  createClass(LgasService, [{
	    key: 'registerOnCacheUpdatedCallback',
	    value: function registerOnCacheUpdatedCallback(id, callback) {
	      if (!this.registeredOnCacheUpdatedCallbacks[id]) {
	        this.registeredOnCacheUpdatedCallbacks[id] = callback;
	      }
	    }
	  }, {
	    key: 'unregisterOnCacheUpdatedCallback',
	    value: function unregisterOnCacheUpdatedCallback(id) {
	      delete this.registeredOnCacheUpdatedCallbacks[id];
	    }
	  }, {
	    key: 'bustCache',
	    value: function bustCache() {
	      this.byState({ bustCache: true });
	      this.setDefaultStateRelevantProducts();
	    }
	  }, {
	    key: 'setDefaultStateRelevantProducts',
	    value: function setDefaultStateRelevantProducts() {
	      var _this = this;

	      var setRelevantProducts = function setRelevantProducts(stateConfig) {
	        _this.productListService.setRelevant(stateConfig.products);
	      };

	      var configId = 'configuration:' + this.smartId.idify({ zone: this.defaultZone, state: this.defaultState }, 'zone:state');
	      this.locationsService.get(configId).then(setRelevantProducts);
	    }
	  }, {
	    key: 'queryAndUpdateCache',
	    value: function queryAndUpdateCache(options) {
	      var _this2 = this;

	      var addId = function addId(lga) {
	        lga.id = _this2.smartId.parse(lga._id).lga;
	        return lga;
	      };

	      var query = function query(options) {
	        var queryOptions = {
	          'include_docs': true,
	          ascending: true
	        };

	        // For state dashboard (querying local PouchDB) prefer the more
	        // performant `allDocs` instead of a view
	        if (options.zone && options.state) {
	          queryOptions.startkey = 'zone:' + options.zone + ':state:' + options.state + ':';
	          queryOptions.endkey = 'zone:' + options.zone + ':state:' + options.state + ':￿';

	          return _this2.locationsService.allDocs(queryOptions);
	        }

	        // For national dashboard
	        queryOptions.key = 'lga';
	        return _this2.locationsService.query('locations/by-level', queryOptions);
	      };

	      var updateCache = function updateCache(state, docs) {
	        var withIds = docs.map(addId);
	        if (state) {
	          _this2.cachedLgasByState[state] = withIds;
	        } else {
	          _this2.cachedLgasByState = _this2.utils.groupByLevel(withIds, 'state');
	        }
	        // This makes the assumption that the cache only contains an empty list
	        // of lgas when the replication is not yet done
	        if (!_this2.utils.isIndexedCacheEmpty(_this2.cachedLgasByState, state)) {
	          _this2.utils.callEach(_this2.registeredOnCacheUpdatedCallbacks);
	        }
	      };

	      return query(options).then(updateCache.bind(null, options.state));
	    }
	  }, {
	    key: 'byState',
	    value: function byState() {
	      var _this3 = this;

	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      var onlyId = function onlyId(doc) {
	        return doc.id;
	      };

	      var prepareRes = function prepareRes() {
	        var res = angular.copy(_this3.cachedLgasByState);

	        if (options.onlyIds) {
	          Object.keys(res).forEach(function (key) {
	            res[key] = res[key].map(onlyId);
	          });
	        }

	        if (options.zone && options.state) {
	          res = res[options.state];
	        }

	        if (options.asArray) {
	          res = _this3.utils.toArray(res);
	        }

	        return res;
	      };

	      options.zone = options.zone || this.defaultZone;
	      options.state = options.state || this.defaultState;

	      if (!options.bustCache && !this.utils.isIndexedCacheEmpty(this.cachedLgasByState, options.state)) {
	        return this.$q.when(prepareRes());
	      }

	      return this.queryAndUpdateCache(options).then(prepareRes);
	    }
	  }, {
	    key: 'idsByState',
	    value: function idsByState() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.onlyIds = true;
	      return this.byState(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.asArray = true;
	      return this.byState(options);
	    }
	  }, {
	    key: 'setState',
	    value: function setState(zone, state) {
	      this.defaultZone = zone;
	      this.defaultState = state;
	      this.statesService.setZone(this.defaultZone);
	      this.bustCache();
	    }
	  }, {
	    key: 'get',
	    value: function get(lgaId) {
	      var findLga = function findLga(lgas) {
	        var _iteratorNormalCompletion = true;
	        var _didIteratorError = false;
	        var _iteratorError = undefined;

	        try {
	          for (var _iterator = lgas[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	            var lga = _step.value;

	            if (lga._id === lgaId) {
	              return lga;
	            }
	          }
	        } catch (err) {
	          _didIteratorError = true;
	          _iteratorError = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion && _iterator.return) {
	              _iterator.return();
	            }
	          } finally {
	            if (_didIteratorError) {
	              throw _iteratorError;
	            }
	          }
	        }
	      };

	      var state = this.smartId.parse(lgaId).state;
	      var zone = this.smartId.parse(lgaId).zone;
	      return this.byState({ zone: zone, state: state }).then(findLga);
	    }
	  }]);
	  return LgasService;
	}();

	LgasService.$inject = ['$q', 'smartId', 'locationsService', 'statesService', 'productListService', 'angularNavDataUtilsService'];

	var StatesService = function () {
	  function StatesService($q, smartId, locationsService, angularNavDataUtilsService) {
	    classCallCheck(this, StatesService);

	    this.cachedStatesByZone = {};
	    this.defaultZone;
	    this.registeredOnCacheUpdatedCallbacks = {};

	    this.$q = $q;
	    this.smartId = smartId;
	    this.locationsService = locationsService;
	    this.utils = angularNavDataUtilsService;

	    // For the state dashboard:
	    // locations are replicated and the zone and state are set by default
	    var onReplicationComplete = this.byZone.bind(this, { bustCache: true });
	    this.locationsService.callOnReplicationComplete('states-service', onReplicationComplete);
	  }

	  createClass(StatesService, [{
	    key: 'registerOnCacheUpdatedCallback',
	    value: function registerOnCacheUpdatedCallback(id, callback) {
	      if (!this.registeredOnCacheUpdatedCallbacks[id]) {
	        this.registeredOnCacheUpdatedCallbacks[id] = callback;
	      }
	    }
	  }, {
	    key: 'unregisterOnCacheUpdatedCallback',
	    value: function unregisterOnCacheUpdatedCallback(id) {
	      delete this.registeredOnCacheUpdatedCallbacks[id];
	    }
	  }, {
	    key: 'queryAndUpdateCache',
	    value: function queryAndUpdateCache(options) {
	      var _this = this;

	      var addId = function addId(state) {
	        state.id = _this.smartId.parse(state._id).state;
	        return state;
	      };

	      var query = function query(options) {
	        var queryOptions = {
	          'include_docs': true,
	          ascending: true
	        };

	        // For state dashboard (querying local PouchDB) prefer the more
	        // performant `allDocs` instead of a view
	        if (options.zone) {
	          queryOptions.startkey = 'zone:' + options.zone + ':';
	          queryOptions.endkey = 'zone:' + options.zone + ':￿';

	          return _this.locationsService.allDocs(queryOptions);
	        }

	        // For national dashboard
	        queryOptions.key = 'state';
	        return _this.locationsService.query('locations/by-level', queryOptions);
	      };

	      var updateCache = function updateCache(zone, docs) {
	        var withIds = docs.map(addId);
	        if (zone) {
	          _this.cachedStatesByZone[zone] = withIds;
	        } else {
	          _this.cachedStatesByZone = _this.utils.groupByLevel(withIds, 'zone');
	        }
	        // This makes the assumption that the cache only contains an empty list
	        // of states when the replication is not yet done
	        if (!_this.utils.isIndexedCacheEmpty(_this.cachedStatesByZone, zone)) {
	          _this.utils.callEach(_this.registeredOnCacheUpdatedCallbacks);
	        }
	      };

	      return query(options).then(updateCache.bind(null, options.zone));
	    }
	  }, {
	    key: 'byZone',
	    value: function byZone() {
	      var _this2 = this;

	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      var onlyId = function onlyId(doc) {
	        return doc.id;
	      };

	      var prepareRes = function prepareRes() {
	        var res = angular.copy(_this2.cachedStatesByZone);

	        if (options.onlyIds) {
	          Object.keys(res).forEach(function (key) {
	            res[key] = res[key].map(onlyId);
	          });
	        }

	        if (options.zone) {
	          res = res[options.zone];
	        }

	        if (options.asArray) {
	          res = _this2.utils.toArray(res);
	        }

	        return res;
	      };

	      options.zone = options.zone || this.defaultZone;

	      if (!options.bustCache && !this.utils.isIndexedCacheEmpty(this.cachedStatesByZone, options.zone)) {
	        return this.$q.when(prepareRes());
	      }

	      return this.queryAndUpdateCache(options).then(prepareRes);
	    }
	  }, {
	    key: 'idsByZone',
	    value: function idsByZone() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.onlyIds = true;
	      return this.byZone(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.asArray = true;
	      return this.byZone(options);
	    }
	  }, {
	    key: 'setZone',
	    value: function setZone(zone) {
	      this.defaultZone = zone;
	      this.byZone({ bustCache: true });
	    }
	  }, {
	    key: 'get',
	    value: function get(stateId) {
	      // Why is this not working?
	      // const findState = (states) => states.find(state => (state._id === stateId))

	      var findState = function findState(states) {
	        var _iteratorNormalCompletion = true;
	        var _didIteratorError = false;
	        var _iteratorError = undefined;

	        try {
	          for (var _iterator = states[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	            var state = _step.value;

	            if (state._id === stateId) {
	              return state;
	            }
	          }
	        } catch (err) {
	          _didIteratorError = true;
	          _iteratorError = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion && _iterator.return) {
	              _iterator.return();
	            }
	          } finally {
	            if (_didIteratorError) {
	              throw _iteratorError;
	            }
	          }
	        }
	      };

	      var zone = this.smartId.parse(stateId).zone;
	      return this.byZone({ zone: zone }).then(findState);
	    }
	  }]);
	  return StatesService;
	}();

	StatesService.$inject = ['$q', 'smartId', 'locationsService', 'angularNavDataUtilsService'];

	var ZonesService = function () {
	  function ZonesService($q, smartId, locationsService) {
	    classCallCheck(this, ZonesService);

	    this.cachedZones = [];
	    this.$q = $q;
	    this.smartId = smartId;
	    this.locationsService = locationsService;
	  }

	  createClass(ZonesService, [{
	    key: 'queryAndUpdateCache',
	    value: function queryAndUpdateCache(options) {
	      var _this = this;

	      var addId = function addId(zone) {
	        zone.id = _this.smartId.parse(zone._id).zone;
	        return zone;
	      };

	      var query = function query(options) {
	        var queryOptions = {
	          'include_docs': true,
	          ascending: true,
	          key: 'zone'
	        };

	        return _this.locationsService.query('locations/by-level', queryOptions);
	      };

	      var updateCache = function updateCache(docs) {
	        var withIds = docs.map(addId);
	        _this.cachedZones = withIds;
	      };

	      return query(options).then(updateCache);
	    }
	  }, {
	    key: 'all',
	    value: function all() {
	      var _this2 = this;

	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      var onlyId = function onlyId(doc) {
	        return doc.id;
	      };

	      var prepareRes = function prepareRes() {
	        var res = angular.copy(_this2.cachedZones);

	        if (options.onlyIds) {
	          Object.keys(res).forEach(function (key) {
	            res[key] = res[key].map(onlyId);
	          });
	        }

	        return res;
	      };

	      if (!options.bustCache && this.cachedZones.length) {
	        return this.$q.when(prepareRes());
	      }

	      return this.queryAndUpdateCache(options).then(prepareRes);
	    }
	  }, {
	    key: 'ids',
	    value: function ids() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.onlyIds = true;
	      return this.all(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      return this.all(options);
	    }
	  }, {
	    key: 'get',
	    value: function get(zoneId) {
	      var findZone = function findZone(zones) {
	        var _iteratorNormalCompletion = true;
	        var _didIteratorError = false;
	        var _iteratorError = undefined;

	        try {
	          for (var _iterator = zones[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	            var zone = _step.value;

	            if (zone._id === zoneId) {
	              return zone;
	            }
	          }
	        } catch (err) {
	          _didIteratorError = true;
	          _iteratorError = err;
	        } finally {
	          try {
	            if (!_iteratorNormalCompletion && _iterator.return) {
	              _iterator.return();
	            }
	          } finally {
	            if (_didIteratorError) {
	              throw _iteratorError;
	            }
	          }
	        }
	      };

	      return this.all().then(findZone);
	    }
	  }]);
	  return ZonesService;
	}();

	ZonesService.$inject = ['$q', 'smartId', 'locationsService'];

	var pluckDocs = function pluckDocs(item) {
	  return item.doc;
	};

	var isDefined = function isDefined(doc) {
	  return typeof doc !== 'undefined';
	};

	var parseResponse = function parseResponse(response) {
	  return response.rows.map(pluckDocs).filter(isDefined);
	};

	var UtilsService = function () {
	  function UtilsService(smartId) {
	    classCallCheck(this, UtilsService);

	    this.smartId = smartId;
	  }

	  createClass(UtilsService, [{
	    key: 'allDocs',
	    value: function allDocs(db, options) {
	      return db.allDocs(options).then(parseResponse);
	    }
	  }, {
	    key: 'query',
	    value: function query(db, view, options) {
	      return db.query(view, options).then(parseResponse);
	    }
	  }, {
	    key: 'callEach',
	    value: function callEach(callbacks) {
	      var call = function call(id) {
	        return callbacks[id]();
	      };
	      Object.keys(callbacks).forEach(call);
	    }
	  }, {
	    key: 'isEmptyObject',
	    value: function isEmptyObject(obj) {
	      return !Object.keys(obj).length;
	    }
	  }, {
	    key: 'isIndexedCacheEmpty',
	    value: function isIndexedCacheEmpty(cache, field) {
	      var isCompletelyEmpty = this.isEmptyObject(cache);

	      if (!isCompletelyEmpty && field) {
	        return !cache[field] || !cache[field].length;
	      }
	      return isCompletelyEmpty;
	    }
	  }, {
	    key: 'toArray',
	    value: function toArray(obj) {
	      return Object.keys(obj).reduce(function (array, key) {
	        return array.concat(obj[key]);
	      }, []);
	    }
	  }, {
	    key: 'groupByLevel',
	    value: function groupByLevel(locations, level) {
	      var _this = this;

	      return locations.reduce(function (index, location) {
	        var area = _this.smartId.parse(location._id)[level];
	        index[area] = index[area] || [];
	        index[area].push(location);
	        return index;
	      }, {});
	    }
	  }]);
	  return UtilsService;
	}();

	UtilsService.$inject = ['smartId'];

	var moduleName$1 = 'angularNavData.utils';

	angular$1.module(moduleName$1, ['ngSmartId']).service('angularNavDataUtilsService', UtilsService);

	var moduleName = 'angularNavData.locations';

	angular$1.module(moduleName, [moduleName$1, 'ngSmartId', 'pouchdb']).service('locationsService', LocationsService).service('lgasService', LgasService).service('statesService', StatesService).service('zonesService', ZonesService);

	var ProductsService = function () {
	  function ProductsService($injector, pouchDB, angularNavDataUtilsService) {
	    classCallCheck(this, ProductsService);

	    var dataModuleRemoteDB = void 0;

	    var pouchDBOptions = {
	      ajax: {
	        timeout: replicationConfig.timeout
	      },
	      skip_setup: true
	    };

	    try {
	      dataModuleRemoteDB = $injector.get('dataModuleRemoteDB');
	    } catch (e) {
	      throw new Error('dataModuleRemoteDB should be provided in the data module configuration');
	    }

	    this.pouchDB = pouchDB;
	    this.angularNavDataUtilsService = angularNavDataUtilsService;

	    this.remoteDB = this.pouchDB(dataModuleRemoteDB, pouchDBOptions);
	    this.replicationFrom;
	    this.localDB;
	    this.onReplicationCompleteCallbacks = {};
	  }

	  createClass(ProductsService, [{
	    key: 'startReplication',
	    value: function startReplication(zone, state) {
	      var _this = this;

	      var onReplicationComplete = function onReplicationComplete() {
	        Object.keys(_this.onReplicationCompleteCallbacks).forEach(function (id) {
	          return _this.onReplicationCompleteCallbacks[id]();
	        });
	      };

	      var onReplicationPaused = function onReplicationPaused(err) {
	        if (!err) {
	          onReplicationComplete();
	          _this.stopReplication();
	        }
	      };

	      var options = {
	        filter: 'products/all',
	        live: true,
	        retry: true
	      };

	      this.localDB = this.pouchDB('navIntProductsDB');
	      this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);

	      this.replicationFrom.on('paused', onReplicationPaused);

	      return this.replicationFrom;
	    }
	  }, {
	    key: 'stopReplication',
	    value: function stopReplication() {
	      if (this.replicationFrom && this.replicationFrom.cancel) {
	        this.replicationFrom.cancel();
	      }
	    }
	  }, {
	    key: 'callOnReplicationComplete',
	    value: function callOnReplicationComplete(id, callback) {
	      if (this.onReplicationCompleteCallbacks[id]) {
	        return;
	      }
	      this.onReplicationCompleteCallbacks[id] = callback;
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

	ProductsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService'];

	var ProductListService = function () {
	  function ProductListService($q, productsService, angularNavDataUtilsService) {
	    classCallCheck(this, ProductListService);

	    this.cachedProducts = [];
	    this.relevantIds = [];
	    this.registeredOnCacheUpdatedCallbacks = {};

	    this.$q = $q;
	    this.productsService = productsService;
	    this.utils = angularNavDataUtilsService;

	    // For state dashboard: products replicated locally and only a set of products is relevant
	    var onReplicationComplete = this.relevant.bind(this, { bustCache: true });
	    this.productsService.callOnReplicationComplete('products-list-service', onReplicationComplete);
	  }

	  createClass(ProductListService, [{
	    key: 'registerOnCacheUpdatedCallback',
	    value: function registerOnCacheUpdatedCallback(id, callback) {
	      if (!this.registeredOnCacheUpdatedCallbacks[id]) {
	        this.registeredOnCacheUpdatedCallbacks[id] = callback;
	      }
	    }
	  }, {
	    key: 'unregisterOnCacheUpdatedCallback',
	    value: function unregisterOnCacheUpdatedCallback(id) {
	      delete this.registeredOnCacheUpdatedCallbacks[id];
	    }
	  }, {
	    key: 'queryAndUpdateCache',
	    value: function queryAndUpdateCache() {
	      var _this = this;

	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      var query = function query(options) {
	        var queryOptions = {
	          'include_docs': true
	        };

	        if (options.onlyRelevant) {
	          if (!_this.relevantIds.length) {
	            // no product is relevant
	            return _this.$q.when([]);
	          }
	          queryOptions.keys = _this.relevantIds;
	        } else {
	          queryOptions.ascending = true;
	          queryOptions.startkey = 'product:';
	          queryOptions.endkey = 'product:' + '￿';
	        }

	        return _this.productsService.allDocs(queryOptions);
	      };

	      var updateCache = function updateCache(docs) {
	        _this.cachedProducts = docs;
	        // This makes the assumption that the cache only contains an empty list
	        // of products when the replication is not yet done
	        if (_this.cachedProducts.length) {
	          _this.utils.callEach(_this.registeredOnCacheUpdatedCallbacks);
	        }
	      };

	      return query(options).then(updateCache);
	    }
	  }, {
	    key: 'relevant',
	    value: function relevant() {
	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      options.onlyRelevant = true;
	      return this.all(options);
	    }
	  }, {
	    key: 'all',
	    value: function all() {
	      var _this2 = this;

	      var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	      var byType = function byType(type, product) {
	        return product.storageType === type;
	      };

	      var prepareRes = function prepareRes() {
	        if (options.byType) {
	          return {
	            dry: _this2.cachedProducts.filter(byType.bind(null, 'dry')),
	            frozen: _this2.cachedProducts.filter(byType.bind(null, 'frozen'))
	          };
	        }
	        return _this2.cachedProducts;
	      };

	      if (this.cachedProducts.length && !options.bustCache) {
	        return this.$q.when(prepareRes());
	      }

	      return this.queryAndUpdateCache(options).then(prepareRes);
	    }
	  }, {
	    key: 'setRelevant',
	    value: function setRelevant(relevantIds) {
	      this.relevantIds = relevantIds;
	      this.relevant({ bustCache: true });
	    }
	  }]);
	  return ProductListService;
	}();

	ProductListService.$inject = ['$q', 'productsService', 'angularNavDataUtilsService'];

	var moduleName$2 = 'angularNavData.products';

	angular$1.module(moduleName$2, [moduleName$1, 'pouchdb']).service('productsService', ProductsService).service('productListService', ProductListService);

	angular$1.module('angularNavData', [moduleName, moduleName$2]);

}(angular));