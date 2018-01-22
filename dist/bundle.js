(function (angular$1) {
	'use strict';

	angular$1 = 'default' in angular$1 ? angular$1['default'] : angular$1;

	var replicationConfig = { "timeout": 180000 };

	var asyncGenerator = function () {
	  function AwaitValue(value) {
	    this.value = value;
	  }

	  function AsyncGenerator(gen) {
	    var front, back;

	    function send(key, arg) {
	      return new Promise(function (resolve, reject) {
	        var request = {
	          key: key,
	          arg: arg,
	          resolve: resolve,
	          reject: reject,
	          next: null
	        };

	        if (back) {
	          back = back.next = request;
	        } else {
	          front = back = request;
	          resume(key, arg);
	        }
	      });
	    }

	    function resume(key, arg) {
	      try {
	        var result = gen[key](arg);
	        var value = result.value;

	        if (value instanceof AwaitValue) {
	          Promise.resolve(value.value).then(function (arg) {
	            resume("next", arg);
	          }, function (arg) {
	            resume("throw", arg);
	          });
	        } else {
	          settle(result.done ? "return" : "normal", result.value);
	        }
	      } catch (err) {
	        settle("throw", err);
	      }
	    }

	    function settle(type, value) {
	      switch (type) {
	        case "return":
	          front.resolve({
	            value: value,
	            done: true
	          });
	          break;

	        case "throw":
	          front.reject(value);
	          break;

	        default:
	          front.resolve({
	            value: value,
	            done: false
	          });
	          break;
	      }

	      front = front.next;

	      if (front) {
	        resume(front.key, front.arg);
	      } else {
	        back = null;
	      }
	    }

	    this._invoke = send;

	    if (typeof gen.return !== "function") {
	      this.return = undefined;
	    }
	  }

	  if (typeof Symbol === "function" && Symbol.asyncIterator) {
	    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
	      return this;
	    };
	  }

	  AsyncGenerator.prototype.next = function (arg) {
	    return this._invoke("next", arg);
	  };

	  AsyncGenerator.prototype.throw = function (arg) {
	    return this._invoke("throw", arg);
	  };

	  AsyncGenerator.prototype.return = function (arg) {
	    return this._invoke("return", arg);
	  };

	  return {
	    wrap: function (fn) {
	      return function () {
	        return new AsyncGenerator(fn.apply(this, arguments));
	      };
	    },
	    await: function (value) {
	      return new AwaitValue(value);
	    }
	  };
	}();

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
	    this.onChangeCompleteCallbacks = {};
	    this.onReplicationCompleteCallbacks = {};
	  }

	  createClass(LocationsService, [{
	    key: 'startReplication',
	    value: function startReplication(zone, state) {
	      var _this = this;

	      var onComplete = function onComplete(handler, res) {
	        Object.keys(_this[handler]).forEach(function (id) {
	          return _this[handler][id](res);
	        });
	      };

	      var onChangeComplete = function onChangeComplete(res) {
	        return onComplete('onChangeCompleteCallbacks', res);
	      };
	      var onReplicationComplete = function onReplicationComplete() {
	        return onComplete('onReplicationCompleteCallbacks');
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

	      if (!this.localDB) {
	        this.localDB = this.pouchDB('navIntLocationsDB');
	      }

	      if (!this.replicationFrom || this.replicationFrom.state === 'cancelled') {
	        this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);

	        this.replicationFrom.on('paused', onReplicationPaused);
	      }

	      var changeOpts = {
	        conflicts: true,
	        include_docs: true
	      };

	      var handleConflicts = function handleConflicts(change) {
	        _this.angularNavDataUtilsService.checkAndResolveConflicts(change, _this.localDB).then(onChangeComplete).catch(onChangeComplete);
	      };

	      this.localDB.changes(changeOpts).$promise.then(null, null, handleConflicts);
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
	    key: 'unregisterOnReplicationComplete',
	    value: function unregisterOnReplicationComplete(id) {
	      delete this.onReplicationCompleteCallbacks[id];
	    }
	  }, {
	    key: 'callOnChangeComplete',
	    value: function callOnChangeComplete(id, callback) {
	      if (this.onChangeCompleteCallbacks[id]) {
	        return;
	      }
	      this.onChangeCompleteCallbacks[id] = callback;
	    }
	  }, {
	    key: 'unregisterOnChangeComplete',
	    value: function unregisterOnChangeComplete(id) {
	      delete this.onReplicationCompleteCallbacks[id];
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
	          queryOptions.endkey = 'zone:' + options.zone + ':state:' + options.state + ':\uFFFF';

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

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      options.onlyIds = true;
	      return this.byState(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
	          queryOptions.endkey = 'zone:' + options.zone + ':\uFFFF';

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

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      options.onlyIds = true;
	      return this.byZone(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      options.onlyIds = true;
	      return this.all(options);
	    }
	  }, {
	    key: 'list',
	    value: function list() {
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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

	var serialiseDocWithConflictsByProp = function serialiseDocWithConflictsByProp(doc, conflicts, prop) {
	  return [doc].concat(conflicts).reduce(function (arr, obj) {
	    if (obj.ok) {
	      arr.push(obj.ok);
	    } else {
	      arr.push(obj);
	    }
	    return arr;
	  }, []).sort(function (a, b) {
	    if (a[prop] && !b[prop]) {
	      return -1;
	    }
	    if (!a[prop] && b[prop]) {
	      return 1;
	    }
	    var aSecs = new Date(a.updatedAt).getTime();
	    var bSecs = new Date(b.updatedAt).getTime();
	    return bSecs - aSecs; // highest first
	  });
	};

	var UtilsService = function () {
	  function UtilsService($q, smartId) {
	    classCallCheck(this, UtilsService);

	    this.$q = $q;
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
	  }, {
	    key: 'checkAndResolveConflicts',
	    value: function checkAndResolveConflicts(_ref, pouchdb) {
	      var changedDoc = _ref.change.doc;

	      if (!changedDoc._conflicts) {
	        return this.$q.resolve();
	      }

	      return pouchdb.get(changedDoc._id, { 'open_revs': changedDoc._conflicts }).then(function (conflictingRevObjs) {
	        var serializedRevisions = serialiseDocWithConflictsByProp(changedDoc, conflictingRevObjs, 'updatedAt');

	        var winningRevision = angular.extend({}, serializedRevisions[0], {
	          _rev: changedDoc._rev,
	          _conflicts: []
	        });

	        var loosingRevisions = serializedRevisions.map(function (doc) {
	          doc._deleted = true;
	          return doc;
	        });

	        return pouchdb.put(winningRevision).then(function () {
	          return pouchdb.bulkDocs(loosingRevisions);
	        });
	      });
	    }
	  }]);
	  return UtilsService;
	}();

	UtilsService.$inject = ['$q', 'smartId'];

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
	    this.onChangeCompleteCallbacks = {};
	    this.onReplicationCompleteCallbacks = {};
	  }

	  createClass(ProductsService, [{
	    key: 'startReplication',
	    value: function startReplication() {
	      var _this = this;

	      var onComplete = function onComplete(handler, res) {
	        Object.keys(_this[handler]).forEach(function (id) {
	          return _this[handler][id](res);
	        });
	      };

	      var onChangeComplete = function onChangeComplete(res) {
	        return onComplete('onChangeCompleteCallbacks', res);
	      };
	      var onReplicationComplete = function onReplicationComplete() {
	        return onComplete('onReplicationCompleteCallbacks');
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

	      if (!this.localDB) {
	        this.localDB = this.pouchDB('navIntProductsDB');
	      }

	      if (!this.replicationFrom || this.replicationFrom.state === 'cancelled') {
	        this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options);

	        this.replicationFrom.on('paused', onReplicationPaused);
	      }

	      var changeOpts = {
	        conflicts: true,
	        include_docs: true
	      };

	      var handleConflicts = function handleConflicts(change) {
	        _this.angularNavDataUtilsService.checkAndResolveConflicts(change, _this.localDB).then(onChangeComplete).catch(onChangeComplete);
	      };

	      this.localDB.changes(changeOpts).$promise.then(null, null, handleConflicts);
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
	    key: 'unregisterOnReplicationComplete',
	    value: function unregisterOnReplicationComplete(id) {
	      delete this.onReplicationCompleteCallbacks[id];
	    }
	  }, {
	    key: 'callOnChangeComplete',
	    value: function callOnChangeComplete(id, callback) {
	      if (this.onChangeCompleteCallbacks[id]) {
	        return;
	      }
	      this.onChangeCompleteCallbacks[id] = callback;
	    }
	  }, {
	    key: 'unregisterOnChangeComplete',
	    value: function unregisterOnChangeComplete(id) {
	      delete this.onReplicationCompleteCallbacks[id];
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

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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
	          queryOptions.endkey = 'product:' + '\uFFFF';
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
	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	      options.onlyRelevant = true;
	      return this.all(options);
	    }
	  }, {
	    key: 'all',
	    value: function all() {
	      var _this2 = this;

	      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

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

	/**
	 * @category Common Helpers
	 * @summary Is the given argument an instance of Date?
	 *
	 * @description
	 * Is the given argument an instance of Date?
	 *
	 * @param {*} argument - the argument to check
	 * @returns {Boolean} the given argument is an instance of Date
	 *
	 * @example
	 * // Is 'mayonnaise' a Date?
	 * var result = isDate('mayonnaise')
	 * //=> false
	 */
	function isDate$1 (argument) {
	  return argument instanceof Date
	}

	var __moduleExports$4 = isDate$1

	var isDate = __moduleExports$4

	var MILLISECONDS_IN_HOUR = 3600000
	var MILLISECONDS_IN_MINUTE = 60000
	var DEFAULT_ADDITIONAL_DIGITS = 2

	var parseTokenDateTimeDelimeter = /[T ]/
	var parseTokenPlainTime = /:/

	// year tokens
	var parseTokenYY = /^(\d{2})$/
	var parseTokensYYY = [
	  /^([+-]\d{2})$/, // 0 additional digits
	  /^([+-]\d{3})$/, // 1 additional digit
	  /^([+-]\d{4})$/ // 2 additional digits
	]

	var parseTokenYYYY = /^(\d{4})/
	var parseTokensYYYYY = [
	  /^([+-]\d{4})/, // 0 additional digits
	  /^([+-]\d{5})/, // 1 additional digit
	  /^([+-]\d{6})/ // 2 additional digits
	]

	// date tokens
	var parseTokenMM = /^-(\d{2})$/
	var parseTokenDDD = /^-?(\d{3})$/
	var parseTokenMMDD = /^-?(\d{2})-?(\d{2})$/
	var parseTokenWww = /^-?W(\d{2})$/
	var parseTokenWwwD = /^-?W(\d{2})-?(\d{1})$/

	// time tokens
	var parseTokenHH = /^(\d{2}([.,]\d*)?)$/
	var parseTokenHHMM = /^(\d{2}):?(\d{2}([.,]\d*)?)$/
	var parseTokenHHMMSS = /^(\d{2}):?(\d{2}):?(\d{2}([.,]\d*)?)$/

	// timezone tokens
	var parseTokenTimezone = /([Z+-].*)$/
	var parseTokenTimezoneZ = /^(Z)$/
	var parseTokenTimezoneHH = /^([+-])(\d{2})$/
	var parseTokenTimezoneHHMM = /^([+-])(\d{2}):?(\d{2})$/

	/**
	 * @category Common Helpers
	 * @summary Convert the given argument to an instance of Date.
	 *
	 * @description
	 * Convert the given argument to an instance of Date.
	 *
	 * If the argument is an instance of Date, the function returns its clone.
	 *
	 * If the argument is a number, it is treated as a timestamp.
	 *
	 * If an argument is a string, the function tries to parse it.
	 * Function accepts complete ISO 8601 formats as well as partial implementations.
	 * ISO 8601: http://en.wikipedia.org/wiki/ISO_8601
	 *
	 * If all above fails, the function passes the given argument to Date constructor.
	 *
	 * @param {Date|String|Number} argument - the value to convert
	 * @param {Object} [options] - the object with options
	 * @param {0 | 1 | 2} [options.additionalDigits=2] - the additional number of digits in the extended year format
	 * @returns {Date} the parsed date in the local time zone
	 *
	 * @example
	 * // Convert string '2014-02-11T11:30:30' to date:
	 * var result = parse('2014-02-11T11:30:30')
	 * //=> Tue Feb 11 2014 11:30:30
	 *
	 * @example
	 * // Parse string '+02014101',
	 * // if the additional number of digits in the extended year format is 1:
	 * var result = parse('+02014101', {additionalDigits: 1})
	 * //=> Fri Apr 11 2014 00:00:00
	 */
	function parse$1 (argument, dirtyOptions) {
	  if (isDate(argument)) {
	    // Prevent the date to lose the milliseconds when passed to new Date() in IE10
	    return new Date(argument.getTime())
	  } else if (typeof argument !== 'string') {
	    return new Date(argument)
	  }

	  var options = dirtyOptions || {}
	  var additionalDigits = options.additionalDigits
	  if (additionalDigits == null) {
	    additionalDigits = DEFAULT_ADDITIONAL_DIGITS
	  } else {
	    additionalDigits = Number(additionalDigits)
	  }

	  var dateStrings = splitDateString(argument)

	  var parseYearResult = parseYear(dateStrings.date, additionalDigits)
	  var year = parseYearResult.year
	  var restDateString = parseYearResult.restDateString

	  var date = parseDate(restDateString, year)

	  if (date) {
	    var timestamp = date.getTime()
	    var time = 0
	    var offset

	    if (dateStrings.time) {
	      time = parseTime(dateStrings.time)
	    }

	    if (dateStrings.timezone) {
	      offset = parseTimezone(dateStrings.timezone)
	    } else {
	      // get offset accurate to hour in timezones that change offset
	      offset = new Date(timestamp + time).getTimezoneOffset()
	      offset = new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE).getTimezoneOffset()
	    }

	    return new Date(timestamp + time + offset * MILLISECONDS_IN_MINUTE)
	  } else {
	    return new Date(argument)
	  }
	}

	function splitDateString (dateString) {
	  var dateStrings = {}
	  var array = dateString.split(parseTokenDateTimeDelimeter)
	  var timeString

	  if (parseTokenPlainTime.test(array[0])) {
	    dateStrings.date = null
	    timeString = array[0]
	  } else {
	    dateStrings.date = array[0]
	    timeString = array[1]
	  }

	  if (timeString) {
	    var token = parseTokenTimezone.exec(timeString)
	    if (token) {
	      dateStrings.time = timeString.replace(token[1], '')
	      dateStrings.timezone = token[1]
	    } else {
	      dateStrings.time = timeString
	    }
	  }

	  return dateStrings
	}

	function parseYear (dateString, additionalDigits) {
	  var parseTokenYYY = parseTokensYYY[additionalDigits]
	  var parseTokenYYYYY = parseTokensYYYYY[additionalDigits]

	  var token

	  // YYYY or ±YYYYY
	  token = parseTokenYYYY.exec(dateString) || parseTokenYYYYY.exec(dateString)
	  if (token) {
	    var yearString = token[1]
	    return {
	      year: parseInt(yearString, 10),
	      restDateString: dateString.slice(yearString.length)
	    }
	  }

	  // YY or ±YYY
	  token = parseTokenYY.exec(dateString) || parseTokenYYY.exec(dateString)
	  if (token) {
	    var centuryString = token[1]
	    return {
	      year: parseInt(centuryString, 10) * 100,
	      restDateString: dateString.slice(centuryString.length)
	    }
	  }

	  // Invalid ISO-formatted year
	  return {
	    year: null
	  }
	}

	function parseDate (dateString, year) {
	  // Invalid ISO-formatted year
	  if (year === null) {
	    return null
	  }

	  var token
	  var date
	  var month
	  var week

	  // YYYY
	  if (dateString.length === 0) {
	    date = new Date(0)
	    date.setUTCFullYear(year)
	    return date
	  }

	  // YYYY-MM
	  token = parseTokenMM.exec(dateString)
	  if (token) {
	    date = new Date(0)
	    month = parseInt(token[1], 10) - 1
	    date.setUTCFullYear(year, month)
	    return date
	  }

	  // YYYY-DDD or YYYYDDD
	  token = parseTokenDDD.exec(dateString)
	  if (token) {
	    date = new Date(0)
	    var dayOfYear = parseInt(token[1], 10)
	    date.setUTCFullYear(year, 0, dayOfYear)
	    return date
	  }

	  // YYYY-MM-DD or YYYYMMDD
	  token = parseTokenMMDD.exec(dateString)
	  if (token) {
	    date = new Date(0)
	    month = parseInt(token[1], 10) - 1
	    var day = parseInt(token[2], 10)
	    date.setUTCFullYear(year, month, day)
	    return date
	  }

	  // YYYY-Www or YYYYWww
	  token = parseTokenWww.exec(dateString)
	  if (token) {
	    week = parseInt(token[1], 10) - 1
	    return dayOfISOYear(year, week)
	  }

	  // YYYY-Www-D or YYYYWwwD
	  token = parseTokenWwwD.exec(dateString)
	  if (token) {
	    week = parseInt(token[1], 10) - 1
	    var dayOfWeek = parseInt(token[2], 10) - 1
	    return dayOfISOYear(year, week, dayOfWeek)
	  }

	  // Invalid ISO-formatted date
	  return null
	}

	function parseTime (timeString) {
	  var token
	  var hours
	  var minutes

	  // hh
	  token = parseTokenHH.exec(timeString)
	  if (token) {
	    hours = parseFloat(token[1].replace(',', '.'))
	    return (hours % 24) * MILLISECONDS_IN_HOUR
	  }

	  // hh:mm or hhmm
	  token = parseTokenHHMM.exec(timeString)
	  if (token) {
	    hours = parseInt(token[1], 10)
	    minutes = parseFloat(token[2].replace(',', '.'))
	    return (hours % 24) * MILLISECONDS_IN_HOUR +
	      minutes * MILLISECONDS_IN_MINUTE
	  }

	  // hh:mm:ss or hhmmss
	  token = parseTokenHHMMSS.exec(timeString)
	  if (token) {
	    hours = parseInt(token[1], 10)
	    minutes = parseInt(token[2], 10)
	    var seconds = parseFloat(token[3].replace(',', '.'))
	    return (hours % 24) * MILLISECONDS_IN_HOUR +
	      minutes * MILLISECONDS_IN_MINUTE +
	      seconds * 1000
	  }

	  // Invalid ISO-formatted time
	  return null
	}

	function parseTimezone (timezoneString) {
	  var token
	  var absoluteOffset

	  // Z
	  token = parseTokenTimezoneZ.exec(timezoneString)
	  if (token) {
	    return 0
	  }

	  // ±hh
	  token = parseTokenTimezoneHH.exec(timezoneString)
	  if (token) {
	    absoluteOffset = parseInt(token[2], 10) * 60
	    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
	  }

	  // ±hh:mm or ±hhmm
	  token = parseTokenTimezoneHHMM.exec(timezoneString)
	  if (token) {
	    absoluteOffset = parseInt(token[2], 10) * 60 + parseInt(token[3], 10)
	    return (token[1] === '+') ? -absoluteOffset : absoluteOffset
	  }

	  return 0
	}

	function dayOfISOYear (isoYear, week, day) {
	  week = week || 0
	  day = day || 0
	  var date = new Date(0)
	  date.setUTCFullYear(isoYear, 0, 4)
	  var fourthOfJanuaryDay = date.getUTCDay() || 7
	  var diff = week * 7 + day + 1 - fourthOfJanuaryDay
	  date.setUTCDate(date.getUTCDate() + diff)
	  return date
	}

	var __moduleExports$3 = parse$1

	var parse = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Add the specified number of days to the given date.
	 *
	 * @description
	 * Add the specified number of days to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of days to be added
	 * @returns {Date} the new date with the days added
	 *
	 * @example
	 * // Add 10 days to 1 September 2014:
	 * var result = addDays(new Date(2014, 8, 1), 10)
	 * //=> Thu Sep 11 2014 00:00:00
	 */
	function addDays (dirtyDate, dirtyAmount) {
	  var date = parse(dirtyDate)
	  var amount = Number(dirtyAmount)
	  date.setDate(date.getDate() + amount)
	  return date
	}

	var __moduleExports$2 = addDays

	var parse$2 = __moduleExports$3

	/**
	 * @category Millisecond Helpers
	 * @summary Add the specified number of milliseconds to the given date.
	 *
	 * @description
	 * Add the specified number of milliseconds to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of milliseconds to be added
	 * @returns {Date} the new date with the milliseconds added
	 *
	 * @example
	 * // Add 750 milliseconds to 10 July 2014 12:45:30.000:
	 * var result = addMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
	 * //=> Thu Jul 10 2014 12:45:30.750
	 */
	function addMilliseconds$1 (dirtyDate, dirtyAmount) {
	  var timestamp = parse$2(dirtyDate).getTime()
	  var amount = Number(dirtyAmount)
	  return new Date(timestamp + amount)
	}

	var __moduleExports$6 = addMilliseconds$1

	var addMilliseconds = __moduleExports$6

	var MILLISECONDS_IN_HOUR$1 = 3600000

	/**
	 * @category Hour Helpers
	 * @summary Add the specified number of hours to the given date.
	 *
	 * @description
	 * Add the specified number of hours to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of hours to be added
	 * @returns {Date} the new date with the hours added
	 *
	 * @example
	 * // Add 2 hours to 10 July 2014 23:00:00:
	 * var result = addHours(new Date(2014, 6, 10, 23, 0), 2)
	 * //=> Fri Jul 11 2014 01:00:00
	 */
	function addHours (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMilliseconds(dirtyDate, amount * MILLISECONDS_IN_HOUR$1)
	}

	var __moduleExports$5 = addHours

	var parse$4 = __moduleExports$3

	/**
	 * @category Week Helpers
	 * @summary Return the start of a week for the given date.
	 *
	 * @description
	 * Return the start of a week for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Date} the start of a week
	 *
	 * @example
	 * // The start of a week for 2 September 2014 11:55:00:
	 * var result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Sun Aug 31 2014 00:00:00
	 *
	 * @example
	 * // If the week starts on Monday, the start of the week for 2 September 2014 11:55:00:
	 * var result = startOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
	 * //=> Mon Sep 01 2014 00:00:00
	 */
	function startOfWeek$1 (dirtyDate, dirtyOptions) {
	  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

	  var date = parse$4(dirtyDate)
	  var day = date.getDay()
	  var diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn

	  date.setDate(date.getDate() - diff)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$10 = startOfWeek$1

	var startOfWeek = __moduleExports$10

	/**
	 * @category ISO Week Helpers
	 * @summary Return the start of an ISO week for the given date.
	 *
	 * @description
	 * Return the start of an ISO week for the given date.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of an ISO week
	 *
	 * @example
	 * // The start of an ISO week for 2 September 2014 11:55:00:
	 * var result = startOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Mon Sep 01 2014 00:00:00
	 */
	function startOfISOWeek$1 (dirtyDate) {
	  return startOfWeek(dirtyDate, {weekStartsOn: 1})
	}

	var __moduleExports$9 = startOfISOWeek$1

	var parse$3 = __moduleExports$3
	var startOfISOWeek = __moduleExports$9

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Get the ISO week-numbering year of the given date.
	 *
	 * @description
	 * Get the ISO week-numbering year of the given date,
	 * which always starts 3 days before the year's first Thursday.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the ISO week-numbering year
	 *
	 * @example
	 * // Which ISO-week numbering year is 2 January 2005?
	 * var result = getISOYear(new Date(2005, 0, 2))
	 * //=> 2004
	 */
	function getISOYear$1 (dirtyDate) {
	  var date = parse$3(dirtyDate)
	  var year = date.getFullYear()

	  var fourthOfJanuaryOfNextYear = new Date(0)
	  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4)
	  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0)
	  var startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear)

	  var fourthOfJanuaryOfThisYear = new Date(0)
	  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4)
	  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0)
	  var startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear)

	  if (date.getTime() >= startOfNextYear.getTime()) {
	    return year + 1
	  } else if (date.getTime() >= startOfThisYear.getTime()) {
	    return year
	  } else {
	    return year - 1
	  }
	}

	var __moduleExports$8 = getISOYear$1

	var getISOYear$2 = __moduleExports$8
	var startOfISOWeek$2 = __moduleExports$9

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Return the start of an ISO week-numbering year for the given date.
	 *
	 * @description
	 * Return the start of an ISO week-numbering year,
	 * which always starts 3 days before the year's first Thursday.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of an ISO year
	 *
	 * @example
	 * // The start of an ISO week-numbering year for 2 July 2005:
	 * var result = startOfISOYear(new Date(2005, 6, 2))
	 * //=> Mon Jan 03 2005 00:00:00
	 */
	function startOfISOYear$1 (dirtyDate) {
	  var year = getISOYear$2(dirtyDate)
	  var fourthOfJanuary = new Date(0)
	  fourthOfJanuary.setFullYear(year, 0, 4)
	  fourthOfJanuary.setHours(0, 0, 0, 0)
	  var date = startOfISOWeek$2(fourthOfJanuary)
	  return date
	}

	var __moduleExports$12 = startOfISOYear$1

	var parse$6 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Return the start of a day for the given date.
	 *
	 * @description
	 * Return the start of a day for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a day
	 *
	 * @example
	 * // The start of a day for 2 September 2014 11:55:00:
	 * var result = startOfDay(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 02 2014 00:00:00
	 */
	function startOfDay$1 (dirtyDate) {
	  var date = parse$6(dirtyDate)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$14 = startOfDay$1

	var startOfDay = __moduleExports$14

	var MILLISECONDS_IN_MINUTE$1 = 60000
	var MILLISECONDS_IN_DAY = 86400000

	/**
	 * @category Day Helpers
	 * @summary Get the number of calendar days between the given dates.
	 *
	 * @description
	 * Get the number of calendar days between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar days
	 *
	 * @example
	 * // How many calendar days are between
	 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
	 * var result = differenceInCalendarDays(
	 *   new Date(2012, 6, 2, 0, 0),
	 *   new Date(2011, 6, 2, 23, 0)
	 * )
	 * //=> 366
	 */
	function differenceInCalendarDays$1 (dirtyDateLeft, dirtyDateRight) {
	  var startOfDayLeft = startOfDay(dirtyDateLeft)
	  var startOfDayRight = startOfDay(dirtyDateRight)

	  var timestampLeft = startOfDayLeft.getTime() -
	    startOfDayLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$1
	  var timestampRight = startOfDayRight.getTime() -
	    startOfDayRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$1

	  // Round the number of days to the nearest integer
	  // because the number of milliseconds in a day is not constant
	  // (e.g. it's different in the day of the daylight saving time clock shift)
	  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_DAY)
	}

	var __moduleExports$13 = differenceInCalendarDays$1

	var parse$5 = __moduleExports$3
	var startOfISOYear = __moduleExports$12
	var differenceInCalendarDays = __moduleExports$13

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Set the ISO week-numbering year to the given date.
	 *
	 * @description
	 * Set the ISO week-numbering year to the given date,
	 * saving the week number and the weekday number.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} isoYear - the ISO week-numbering year of the new date
	 * @returns {Date} the new date with the ISO week-numbering year setted
	 *
	 * @example
	 * // Set ISO week-numbering year 2007 to 29 December 2008:
	 * var result = setISOYear(new Date(2008, 11, 29), 2007)
	 * //=> Mon Jan 01 2007 00:00:00
	 */
	function setISOYear$1 (dirtyDate, dirtyISOYear) {
	  var date = parse$5(dirtyDate)
	  var isoYear = Number(dirtyISOYear)
	  var diff = differenceInCalendarDays(date, startOfISOYear(date))
	  var fourthOfJanuary = new Date(0)
	  fourthOfJanuary.setFullYear(isoYear, 0, 4)
	  fourthOfJanuary.setHours(0, 0, 0, 0)
	  date = startOfISOYear(fourthOfJanuary)
	  date.setDate(date.getDate() + diff)
	  return date
	}

	var __moduleExports$11 = setISOYear$1

	var getISOYear = __moduleExports$8
	var setISOYear = __moduleExports$11

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Add the specified number of ISO week-numbering years to the given date.
	 *
	 * @description
	 * Add the specified number of ISO week-numbering years to the given date.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of ISO week-numbering years to be added
	 * @returns {Date} the new date with the ISO week-numbering years added
	 *
	 * @example
	 * // Add 5 ISO week-numbering years to 2 July 2010:
	 * var result = addISOYears(new Date(2010, 6, 2), 5)
	 * //=> Fri Jun 26 2015 00:00:00
	 */
	function addISOYears (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return setISOYear(dirtyDate, getISOYear(dirtyDate) + amount)
	}

	var __moduleExports$7 = addISOYears

	var addMilliseconds$2 = __moduleExports$6

	var MILLISECONDS_IN_MINUTE$2 = 60000

	/**
	 * @category Minute Helpers
	 * @summary Add the specified number of minutes to the given date.
	 *
	 * @description
	 * Add the specified number of minutes to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of minutes to be added
	 * @returns {Date} the new date with the minutes added
	 *
	 * @example
	 * // Add 30 minutes to 10 July 2014 12:00:00:
	 * var result = addMinutes(new Date(2014, 6, 10, 12, 0), 30)
	 * //=> Thu Jul 10 2014 12:30:00
	 */
	function addMinutes (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMilliseconds$2(dirtyDate, amount * MILLISECONDS_IN_MINUTE$2)
	}

	var __moduleExports$15 = addMinutes

	var parse$8 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Get the number of days in a month of the given date.
	 *
	 * @description
	 * Get the number of days in a month of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the number of days in a month
	 *
	 * @example
	 * // How many days are in February 2000?
	 * var result = getDaysInMonth(new Date(2000, 1))
	 * //=> 29
	 */
	function getDaysInMonth$1 (dirtyDate) {
	  var date = parse$8(dirtyDate)
	  var year = date.getFullYear()
	  var monthIndex = date.getMonth()
	  var lastDayOfMonth = new Date(0)
	  lastDayOfMonth.setFullYear(year, monthIndex + 1, 0)
	  lastDayOfMonth.setHours(0, 0, 0, 0)
	  return lastDayOfMonth.getDate()
	}

	var __moduleExports$17 = getDaysInMonth$1

	var parse$7 = __moduleExports$3
	var getDaysInMonth = __moduleExports$17

	/**
	 * @category Month Helpers
	 * @summary Add the specified number of months to the given date.
	 *
	 * @description
	 * Add the specified number of months to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of months to be added
	 * @returns {Date} the new date with the months added
	 *
	 * @example
	 * // Add 5 months to 1 September 2014:
	 * var result = addMonths(new Date(2014, 8, 1), 5)
	 * //=> Sun Feb 01 2015 00:00:00
	 */
	function addMonths (dirtyDate, dirtyAmount) {
	  var date = parse$7(dirtyDate)
	  var amount = Number(dirtyAmount)
	  var desiredMonth = date.getMonth() + amount
	  var dateWithDesiredMonth = new Date(0)
	  dateWithDesiredMonth.setFullYear(date.getFullYear(), desiredMonth, 1)
	  dateWithDesiredMonth.setHours(0, 0, 0, 0)
	  var daysInMonth = getDaysInMonth(dateWithDesiredMonth)
	  // Set the last day of the new month
	  // if the original date was the last day of the longer month
	  date.setMonth(desiredMonth, Math.min(daysInMonth, date.getDate()))
	  return date
	}

	var __moduleExports$16 = addMonths

	var addMonths$1 = __moduleExports$16

	/**
	 * @category Quarter Helpers
	 * @summary Add the specified number of year quarters to the given date.
	 *
	 * @description
	 * Add the specified number of year quarters to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of quarters to be added
	 * @returns {Date} the new date with the quarters added
	 *
	 * @example
	 * // Add 1 quarter to 1 September 2014:
	 * var result = addQuarters(new Date(2014, 8, 1), 1)
	 * //=> Mon Dec 01 2014 00:00:00
	 */
	function addQuarters (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  var months = amount * 3
	  return addMonths$1(dirtyDate, months)
	}

	var __moduleExports$18 = addQuarters

	var addMilliseconds$3 = __moduleExports$6

	/**
	 * @category Second Helpers
	 * @summary Add the specified number of seconds to the given date.
	 *
	 * @description
	 * Add the specified number of seconds to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of seconds to be added
	 * @returns {Date} the new date with the seconds added
	 *
	 * @example
	 * // Add 30 seconds to 10 July 2014 12:45:00:
	 * var result = addSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
	 * //=> Thu Jul 10 2014 12:45:30
	 */
	function addSeconds (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMilliseconds$3(dirtyDate, amount * 1000)
	}

	var __moduleExports$19 = addSeconds

	var addDays$1 = __moduleExports$2

	/**
	 * @category Week Helpers
	 * @summary Add the specified number of weeks to the given date.
	 *
	 * @description
	 * Add the specified number of week to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of weeks to be added
	 * @returns {Date} the new date with the weeks added
	 *
	 * @example
	 * // Add 4 weeks to 1 September 2014:
	 * var result = addWeeks(new Date(2014, 8, 1), 4)
	 * //=> Mon Sep 29 2014 00:00:00
	 */
	function addWeeks (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  var days = amount * 7
	  return addDays$1(dirtyDate, days)
	}

	var __moduleExports$20 = addWeeks

	var addMonths$2 = __moduleExports$16

	/**
	 * @category Year Helpers
	 * @summary Add the specified number of years to the given date.
	 *
	 * @description
	 * Add the specified number of years to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of years to be added
	 * @returns {Date} the new date with the years added
	 *
	 * @example
	 * // Add 5 years to 1 September 2014:
	 * var result = addYears(new Date(2014, 8, 1), 5)
	 * //=> Sun Sep 01 2019 00:00:00
	 */
	function addYears (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMonths$2(dirtyDate, amount * 12)
	}

	var __moduleExports$21 = addYears

	var parse$9 = __moduleExports$3

	/**
	 * @category Range Helpers
	 * @summary Is the given date range overlapping with another date range?
	 *
	 * @description
	 * Is the given date range overlapping with another date range?
	 *
	 * @param {Date|String|Number} initialRangeStartDate - the start of the initial range
	 * @param {Date|String|Number} initialRangeEndDate - the end of the initial range
	 * @param {Date|String|Number} comparedRangeStartDate - the start of the range to compare it with
	 * @param {Date|String|Number} comparedRangeEndDate - the end of the range to compare it with
	 * @returns {Boolean} whether the date ranges are overlapping
	 * @throws {Error} startDate of a date range cannot be after its endDate
	 *
	 * @example
	 * // For overlapping date ranges:
	 * areRangesOverlapping(
	 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 17), new Date(2014, 0, 21)
	 * )
	 * //=> true
	 *
	 * @example
	 * // For non-overlapping date ranges:
	 * areRangesOverlapping(
	 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 21), new Date(2014, 0, 22)
	 * )
	 * //=> false
	 */
	function areRangesOverlapping (dirtyInitialRangeStartDate, dirtyInitialRangeEndDate, dirtyComparedRangeStartDate, dirtyComparedRangeEndDate) {
	  var initialStartTime = parse$9(dirtyInitialRangeStartDate).getTime()
	  var initialEndTime = parse$9(dirtyInitialRangeEndDate).getTime()
	  var comparedStartTime = parse$9(dirtyComparedRangeStartDate).getTime()
	  var comparedEndTime = parse$9(dirtyComparedRangeEndDate).getTime()

	  if (initialStartTime > initialEndTime || comparedStartTime > comparedEndTime) {
	    throw new Error('The start of the range cannot be after the end of the range')
	  }

	  return initialStartTime < comparedEndTime && comparedStartTime < initialEndTime
	}

	var __moduleExports$22 = areRangesOverlapping

	var parse$10 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Return an index of the closest date from the array comparing to the given date.
	 *
	 * @description
	 * Return an index of the closest date from the array comparing to the given date.
	 *
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @param {Date[]|String[]|Number[]} datesArray - the array to search
	 * @returns {Number} an index of the date closest to the given date
	 * @throws {TypeError} the second argument must be an instance of Array
	 *
	 * @example
	 * // Which date is closer to 6 September 2015?
	 * var dateToCompare = new Date(2015, 8, 6)
	 * var datesArray = [
	 *   new Date(2015, 0, 1),
	 *   new Date(2016, 0, 1),
	 *   new Date(2017, 0, 1)
	 * ]
	 * var result = closestIndexTo(dateToCompare, datesArray)
	 * //=> 1
	 */
	function closestIndexTo (dirtyDateToCompare, dirtyDatesArray) {
	  if (!(dirtyDatesArray instanceof Array)) {
	    throw new TypeError(toString.call(dirtyDatesArray) + ' is not an instance of Array')
	  }

	  var dateToCompare = parse$10(dirtyDateToCompare)
	  var timeToCompare = dateToCompare.getTime()

	  var result
	  var minDistance

	  dirtyDatesArray.forEach(function (dirtyDate, index) {
	    var currentDate = parse$10(dirtyDate)
	    var distance = Math.abs(timeToCompare - currentDate.getTime())
	    if (result === undefined || distance < minDistance) {
	      result = index
	      minDistance = distance
	    }
	  })

	  return result
	}

	var __moduleExports$23 = closestIndexTo

	var parse$11 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Return a date from the array closest to the given date.
	 *
	 * @description
	 * Return a date from the array closest to the given date.
	 *
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @param {Date[]|String[]|Number[]} datesArray - the array to search
	 * @returns {Date} the date from the array closest to the given date
	 * @throws {TypeError} the second argument must be an instance of Array
	 *
	 * @example
	 * // Which date is closer to 6 September 2015: 1 January 2000 or 1 January 2030?
	 * var dateToCompare = new Date(2015, 8, 6)
	 * var result = closestTo(dateToCompare, [
	 *   new Date(2000, 0, 1),
	 *   new Date(2030, 0, 1)
	 * ])
	 * //=> Tue Jan 01 2030 00:00:00
	 */
	function closestTo (dirtyDateToCompare, dirtyDatesArray) {
	  if (!(dirtyDatesArray instanceof Array)) {
	    throw new TypeError(toString.call(dirtyDatesArray) + ' is not an instance of Array')
	  }

	  var dateToCompare = parse$11(dirtyDateToCompare)
	  var timeToCompare = dateToCompare.getTime()

	  var result
	  var minDistance

	  dirtyDatesArray.forEach(function (dirtyDate) {
	    var currentDate = parse$11(dirtyDate)
	    var distance = Math.abs(timeToCompare - currentDate.getTime())
	    if (result === undefined || distance < minDistance) {
	      result = currentDate
	      minDistance = distance
	    }
	  })

	  return result
	}

	var __moduleExports$24 = closestTo

	var parse$12 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Compare the two dates and return -1, 0 or 1.
	 *
	 * @description
	 * Compare the two dates and return 1 if the first date is after the second,
	 * -1 if the first date is before the second or 0 if dates are equal.
	 *
	 * @param {Date|String|Number} dateLeft - the first date to compare
	 * @param {Date|String|Number} dateRight - the second date to compare
	 * @returns {Number} the result of the comparison
	 *
	 * @example
	 * // Compare 11 February 1987 and 10 July 1989:
	 * var result = compareAsc(
	 *   new Date(1987, 1, 11),
	 *   new Date(1989, 6, 10)
	 * )
	 * //=> -1
	 *
	 * @example
	 * // Sort the array of dates:
	 * var result = [
	 *   new Date(1995, 6, 2),
	 *   new Date(1987, 1, 11),
	 *   new Date(1989, 6, 10)
	 * ].sort(compareAsc)
	 * //=> [
	 * //   Wed Feb 11 1987 00:00:00,
	 * //   Mon Jul 10 1989 00:00:00,
	 * //   Sun Jul 02 1995 00:00:00
	 * // ]
	 */
	function compareAsc (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$12(dirtyDateLeft)
	  var timeLeft = dateLeft.getTime()
	  var dateRight = parse$12(dirtyDateRight)
	  var timeRight = dateRight.getTime()

	  if (timeLeft < timeRight) {
	    return -1
	  } else if (timeLeft > timeRight) {
	    return 1
	  } else {
	    return 0
	  }
	}

	var __moduleExports$25 = compareAsc

	var parse$13 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Compare the two dates reverse chronologically and return -1, 0 or 1.
	 *
	 * @description
	 * Compare the two dates and return -1 if the first date is after the second,
	 * 1 if the first date is before the second or 0 if dates are equal.
	 *
	 * @param {Date|String|Number} dateLeft - the first date to compare
	 * @param {Date|String|Number} dateRight - the second date to compare
	 * @returns {Number} the result of the comparison
	 *
	 * @example
	 * // Compare 11 February 1987 and 10 July 1989 reverse chronologically:
	 * var result = compareDesc(
	 *   new Date(1987, 1, 11),
	 *   new Date(1989, 6, 10)
	 * )
	 * //=> 1
	 *
	 * @example
	 * // Sort the array of dates in reverse chronological order:
	 * var result = [
	 *   new Date(1995, 6, 2),
	 *   new Date(1987, 1, 11),
	 *   new Date(1989, 6, 10)
	 * ].sort(compareDesc)
	 * //=> [
	 * //   Sun Jul 02 1995 00:00:00,
	 * //   Mon Jul 10 1989 00:00:00,
	 * //   Wed Feb 11 1987 00:00:00
	 * // ]
	 */
	function compareDesc (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$13(dirtyDateLeft)
	  var timeLeft = dateLeft.getTime()
	  var dateRight = parse$13(dirtyDateRight)
	  var timeRight = dateRight.getTime()

	  if (timeLeft > timeRight) {
	    return -1
	  } else if (timeLeft < timeRight) {
	    return 1
	  } else {
	    return 0
	  }
	}

	var __moduleExports$26 = compareDesc

	var startOfISOWeek$3 = __moduleExports$9

	var MILLISECONDS_IN_MINUTE$3 = 60000
	var MILLISECONDS_IN_WEEK = 604800000

	/**
	 * @category ISO Week Helpers
	 * @summary Get the number of calendar ISO weeks between the given dates.
	 *
	 * @description
	 * Get the number of calendar ISO weeks between the given dates.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar ISO weeks
	 *
	 * @example
	 * // How many calendar ISO weeks are between 6 July 2014 and 21 July 2014?
	 * var result = differenceInCalendarISOWeeks(
	 *   new Date(2014, 6, 21),
	 *   new Date(2014, 6, 6)
	 * )
	 * //=> 3
	 */
	function differenceInCalendarISOWeeks (dirtyDateLeft, dirtyDateRight) {
	  var startOfISOWeekLeft = startOfISOWeek$3(dirtyDateLeft)
	  var startOfISOWeekRight = startOfISOWeek$3(dirtyDateRight)

	  var timestampLeft = startOfISOWeekLeft.getTime() -
	    startOfISOWeekLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$3
	  var timestampRight = startOfISOWeekRight.getTime() -
	    startOfISOWeekRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$3

	  // Round the number of days to the nearest integer
	  // because the number of milliseconds in a week is not constant
	  // (e.g. it's different in the week of the daylight saving time clock shift)
	  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_WEEK)
	}

	var __moduleExports$27 = differenceInCalendarISOWeeks

	var getISOYear$3 = __moduleExports$8

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Get the number of calendar ISO week-numbering years between the given dates.
	 *
	 * @description
	 * Get the number of calendar ISO week-numbering years between the given dates.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar ISO week-numbering years
	 *
	 * @example
	 * // How many calendar ISO week-numbering years are 1 January 2010 and 1 January 2012?
	 * var result = differenceInCalendarISOYears(
	 *   new Date(2012, 0, 1),
	 *   new Date(2010, 0, 1)
	 * )
	 * //=> 2
	 */
	function differenceInCalendarISOYears (dirtyDateLeft, dirtyDateRight) {
	  return getISOYear$3(dirtyDateLeft) - getISOYear$3(dirtyDateRight)
	}

	var __moduleExports$28 = differenceInCalendarISOYears

	var parse$14 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Get the number of calendar months between the given dates.
	 *
	 * @description
	 * Get the number of calendar months between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar months
	 *
	 * @example
	 * // How many calendar months are between 31 January 2014 and 1 September 2014?
	 * var result = differenceInCalendarMonths(
	 *   new Date(2014, 8, 1),
	 *   new Date(2014, 0, 31)
	 * )
	 * //=> 8
	 */
	function differenceInCalendarMonths (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$14(dirtyDateLeft)
	  var dateRight = parse$14(dirtyDateRight)

	  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear()
	  var monthDiff = dateLeft.getMonth() - dateRight.getMonth()

	  return yearDiff * 12 + monthDiff
	}

	var __moduleExports$29 = differenceInCalendarMonths

	var parse$16 = __moduleExports$3

	/**
	 * @category Quarter Helpers
	 * @summary Get the year quarter of the given date.
	 *
	 * @description
	 * Get the year quarter of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the quarter
	 *
	 * @example
	 * // Which quarter is 2 July 2014?
	 * var result = getQuarter(new Date(2014, 6, 2))
	 * //=> 3
	 */
	function getQuarter$1 (dirtyDate) {
	  var date = parse$16(dirtyDate)
	  var quarter = Math.floor(date.getMonth() / 3) + 1
	  return quarter
	}

	var __moduleExports$31 = getQuarter$1

	var getQuarter = __moduleExports$31
	var parse$15 = __moduleExports$3

	/**
	 * @category Quarter Helpers
	 * @summary Get the number of calendar quarters between the given dates.
	 *
	 * @description
	 * Get the number of calendar quarters between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar quarters
	 *
	 * @example
	 * // How many calendar quarters are between 31 December 2013 and 2 July 2014?
	 * var result = differenceInCalendarQuarters(
	 *   new Date(2014, 6, 2),
	 *   new Date(2013, 11, 31)
	 * )
	 * //=> 3
	 */
	function differenceInCalendarQuarters (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$15(dirtyDateLeft)
	  var dateRight = parse$15(dirtyDateRight)

	  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear()
	  var quarterDiff = getQuarter(dateLeft) - getQuarter(dateRight)

	  return yearDiff * 4 + quarterDiff
	}

	var __moduleExports$30 = differenceInCalendarQuarters

	var startOfWeek$2 = __moduleExports$10

	var MILLISECONDS_IN_MINUTE$4 = 60000
	var MILLISECONDS_IN_WEEK$1 = 604800000

	/**
	 * @category Week Helpers
	 * @summary Get the number of calendar weeks between the given dates.
	 *
	 * @description
	 * Get the number of calendar weeks between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Number} the number of calendar weeks
	 *
	 * @example
	 * // How many calendar weeks are between 5 July 2014 and 20 July 2014?
	 * var result = differenceInCalendarWeeks(
	 *   new Date(2014, 6, 20),
	 *   new Date(2014, 6, 5)
	 * )
	 * //=> 3
	 *
	 * @example
	 * // If the week starts on Monday,
	 * // how many calendar weeks are between 5 July 2014 and 20 July 2014?
	 * var result = differenceInCalendarWeeks(
	 *   new Date(2014, 6, 20),
	 *   new Date(2014, 6, 5),
	 *   {weekStartsOn: 1}
	 * )
	 * //=> 2
	 */
	function differenceInCalendarWeeks (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
	  var startOfWeekLeft = startOfWeek$2(dirtyDateLeft, dirtyOptions)
	  var startOfWeekRight = startOfWeek$2(dirtyDateRight, dirtyOptions)

	  var timestampLeft = startOfWeekLeft.getTime() -
	    startOfWeekLeft.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$4
	  var timestampRight = startOfWeekRight.getTime() -
	    startOfWeekRight.getTimezoneOffset() * MILLISECONDS_IN_MINUTE$4

	  // Round the number of days to the nearest integer
	  // because the number of milliseconds in a week is not constant
	  // (e.g. it's different in the week of the daylight saving time clock shift)
	  return Math.round((timestampLeft - timestampRight) / MILLISECONDS_IN_WEEK$1)
	}

	var __moduleExports$32 = differenceInCalendarWeeks

	var parse$17 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Get the number of calendar years between the given dates.
	 *
	 * @description
	 * Get the number of calendar years between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of calendar years
	 *
	 * @example
	 * // How many calendar years are between 31 December 2013 and 11 February 2015?
	 * var result = differenceInCalendarYears(
	 *   new Date(2015, 1, 11),
	 *   new Date(2013, 11, 31)
	 * )
	 * //=> 2
	 */
	function differenceInCalendarYears (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$17(dirtyDateLeft)
	  var dateRight = parse$17(dirtyDateRight)

	  return dateLeft.getFullYear() - dateRight.getFullYear()
	}

	var __moduleExports$33 = differenceInCalendarYears

	var parse$18 = __moduleExports$3
	var differenceInCalendarDays$2 = __moduleExports$13
	var compareAsc$1 = __moduleExports$25

	/**
	 * @category Day Helpers
	 * @summary Get the number of full days between the given dates.
	 *
	 * @description
	 * Get the number of full days between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full days
	 *
	 * @example
	 * // How many full days are between
	 * // 2 July 2011 23:00:00 and 2 July 2012 00:00:00?
	 * var result = differenceInDays(
	 *   new Date(2012, 6, 2, 0, 0),
	 *   new Date(2011, 6, 2, 23, 0)
	 * )
	 * //=> 365
	 */
	function differenceInDays (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$18(dirtyDateLeft)
	  var dateRight = parse$18(dirtyDateRight)

	  var sign = compareAsc$1(dateLeft, dateRight)
	  var difference = Math.abs(differenceInCalendarDays$2(dateLeft, dateRight))
	  dateLeft.setDate(dateLeft.getDate() - sign * difference)

	  // Math.abs(diff in full days - diff in calendar days) === 1 if last calendar day is not full
	  // If so, result must be decreased by 1 in absolute value
	  var isLastDayNotFull = compareAsc$1(dateLeft, dateRight) === -sign
	  return sign * (difference - isLastDayNotFull)
	}

	var __moduleExports$34 = differenceInDays

	var parse$19 = __moduleExports$3

	/**
	 * @category Millisecond Helpers
	 * @summary Get the number of milliseconds between the given dates.
	 *
	 * @description
	 * Get the number of milliseconds between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of milliseconds
	 *
	 * @example
	 * // How many milliseconds are between
	 * // 2 July 2014 12:30:20.600 and 2 July 2014 12:30:21.700?
	 * var result = differenceInMilliseconds(
	 *   new Date(2014, 6, 2, 12, 30, 21, 700),
	 *   new Date(2014, 6, 2, 12, 30, 20, 600)
	 * )
	 * //=> 1100
	 */
	function differenceInMilliseconds$1 (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$19(dirtyDateLeft)
	  var dateRight = parse$19(dirtyDateRight)
	  return dateLeft.getTime() - dateRight.getTime()
	}

	var __moduleExports$36 = differenceInMilliseconds$1

	var differenceInMilliseconds = __moduleExports$36

	var MILLISECONDS_IN_HOUR$2 = 3600000

	/**
	 * @category Hour Helpers
	 * @summary Get the number of hours between the given dates.
	 *
	 * @description
	 * Get the number of hours between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of hours
	 *
	 * @example
	 * // How many hours are between 2 July 2014 06:50:00 and 2 July 2014 19:00:00?
	 * var result = differenceInHours(
	 *   new Date(2014, 6, 2, 19, 0),
	 *   new Date(2014, 6, 2, 6, 50)
	 * )
	 * //=> 12
	 */
	function differenceInHours (dirtyDateLeft, dirtyDateRight) {
	  var diff = differenceInMilliseconds(dirtyDateLeft, dirtyDateRight) / MILLISECONDS_IN_HOUR$2
	  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
	}

	var __moduleExports$35 = differenceInHours

	var addISOYears$1 = __moduleExports$7

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Subtract the specified number of ISO week-numbering years from the given date.
	 *
	 * @description
	 * Subtract the specified number of ISO week-numbering years from the given date.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of ISO week-numbering years to be subtracted
	 * @returns {Date} the new date with the ISO week-numbering years subtracted
	 *
	 * @example
	 * // Subtract 5 ISO week-numbering years from 1 September 2014:
	 * var result = subISOYears(new Date(2014, 8, 1), 5)
	 * //=> Mon Aug 31 2009 00:00:00
	 */
	function subISOYears$1 (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addISOYears$1(dirtyDate, -amount)
	}

	var __moduleExports$38 = subISOYears$1

	var parse$20 = __moduleExports$3
	var differenceInCalendarISOYears$1 = __moduleExports$28
	var compareAsc$2 = __moduleExports$25
	var subISOYears = __moduleExports$38

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Get the number of full ISO week-numbering years between the given dates.
	 *
	 * @description
	 * Get the number of full ISO week-numbering years between the given dates.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full ISO week-numbering years
	 *
	 * @example
	 * // How many full ISO week-numbering years are between 1 January 2010 and 1 January 2012?
	 * var result = differenceInISOYears(
	 *   new Date(2012, 0, 1),
	 *   new Date(2010, 0, 1)
	 * )
	 * //=> 1
	 */
	function differenceInISOYears (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$20(dirtyDateLeft)
	  var dateRight = parse$20(dirtyDateRight)

	  var sign = compareAsc$2(dateLeft, dateRight)
	  var difference = Math.abs(differenceInCalendarISOYears$1(dateLeft, dateRight))
	  dateLeft = subISOYears(dateLeft, sign * difference)

	  // Math.abs(diff in full ISO years - diff in calendar ISO years) === 1
	  // if last calendar ISO year is not full
	  // If so, result must be decreased by 1 in absolute value
	  var isLastISOYearNotFull = compareAsc$2(dateLeft, dateRight) === -sign
	  return sign * (difference - isLastISOYearNotFull)
	}

	var __moduleExports$37 = differenceInISOYears

	var differenceInMilliseconds$2 = __moduleExports$36

	var MILLISECONDS_IN_MINUTE$5 = 60000

	/**
	 * @category Minute Helpers
	 * @summary Get the number of minutes between the given dates.
	 *
	 * @description
	 * Get the number of minutes between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of minutes
	 *
	 * @example
	 * // How many minutes are between 2 July 2014 12:07:59 and 2 July 2014 12:20:00?
	 * var result = differenceInMinutes(
	 *   new Date(2014, 6, 2, 12, 20, 0),
	 *   new Date(2014, 6, 2, 12, 7, 59)
	 * )
	 * //=> 12
	 */
	function differenceInMinutes (dirtyDateLeft, dirtyDateRight) {
	  var diff = differenceInMilliseconds$2(dirtyDateLeft, dirtyDateRight) / MILLISECONDS_IN_MINUTE$5
	  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
	}

	var __moduleExports$39 = differenceInMinutes

	var parse$21 = __moduleExports$3
	var differenceInCalendarMonths$1 = __moduleExports$29
	var compareAsc$3 = __moduleExports$25

	/**
	 * @category Month Helpers
	 * @summary Get the number of full months between the given dates.
	 *
	 * @description
	 * Get the number of full months between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full months
	 *
	 * @example
	 * // How many full months are between 31 January 2014 and 1 September 2014?
	 * var result = differenceInMonths(
	 *   new Date(2014, 8, 1),
	 *   new Date(2014, 0, 31)
	 * )
	 * //=> 7
	 */
	function differenceInMonths (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$21(dirtyDateLeft)
	  var dateRight = parse$21(dirtyDateRight)

	  var sign = compareAsc$3(dateLeft, dateRight)
	  var difference = Math.abs(differenceInCalendarMonths$1(dateLeft, dateRight))
	  dateLeft.setMonth(dateLeft.getMonth() - sign * difference)

	  // Math.abs(diff in full months - diff in calendar months) === 1 if last calendar month is not full
	  // If so, result must be decreased by 1 in absolute value
	  var isLastMonthNotFull = compareAsc$3(dateLeft, dateRight) === -sign
	  return sign * (difference - isLastMonthNotFull)
	}

	var __moduleExports$40 = differenceInMonths

	var differenceInMonths$1 = __moduleExports$40

	/**
	 * @category Quarter Helpers
	 * @summary Get the number of full quarters between the given dates.
	 *
	 * @description
	 * Get the number of full quarters between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full quarters
	 *
	 * @example
	 * // How many full quarters are between 31 December 2013 and 2 July 2014?
	 * var result = differenceInQuarters(
	 *   new Date(2014, 6, 2),
	 *   new Date(2013, 11, 31)
	 * )
	 * //=> 2
	 */
	function differenceInQuarters (dirtyDateLeft, dirtyDateRight) {
	  var diff = differenceInMonths$1(dirtyDateLeft, dirtyDateRight) / 3
	  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
	}

	var __moduleExports$41 = differenceInQuarters

	var differenceInMilliseconds$3 = __moduleExports$36

	/**
	 * @category Second Helpers
	 * @summary Get the number of seconds between the given dates.
	 *
	 * @description
	 * Get the number of seconds between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of seconds
	 *
	 * @example
	 * // How many seconds are between
	 * // 2 July 2014 12:30:07.999 and 2 July 2014 12:30:20.000?
	 * var result = differenceInSeconds(
	 *   new Date(2014, 6, 2, 12, 30, 20, 0),
	 *   new Date(2014, 6, 2, 12, 30, 7, 999)
	 * )
	 * //=> 12
	 */
	function differenceInSeconds (dirtyDateLeft, dirtyDateRight) {
	  var diff = differenceInMilliseconds$3(dirtyDateLeft, dirtyDateRight) / 1000
	  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
	}

	var __moduleExports$42 = differenceInSeconds

	var differenceInDays$1 = __moduleExports$34

	/**
	 * @category Week Helpers
	 * @summary Get the number of full weeks between the given dates.
	 *
	 * @description
	 * Get the number of full weeks between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full weeks
	 *
	 * @example
	 * // How many full weeks are between 5 July 2014 and 20 July 2014?
	 * var result = differenceInWeeks(
	 *   new Date(2014, 6, 20),
	 *   new Date(2014, 6, 5)
	 * )
	 * //=> 2
	 */
	function differenceInWeeks (dirtyDateLeft, dirtyDateRight) {
	  var diff = differenceInDays$1(dirtyDateLeft, dirtyDateRight) / 7
	  return diff > 0 ? Math.floor(diff) : Math.ceil(diff)
	}

	var __moduleExports$43 = differenceInWeeks

	var parse$22 = __moduleExports$3
	var differenceInCalendarYears$1 = __moduleExports$33
	var compareAsc$4 = __moduleExports$25

	/**
	 * @category Year Helpers
	 * @summary Get the number of full years between the given dates.
	 *
	 * @description
	 * Get the number of full years between the given dates.
	 *
	 * @param {Date|String|Number} dateLeft - the later date
	 * @param {Date|String|Number} dateRight - the earlier date
	 * @returns {Number} the number of full years
	 *
	 * @example
	 * // How many full years are between 31 December 2013 and 11 February 2015?
	 * var result = differenceInYears(
	 *   new Date(2015, 1, 11),
	 *   new Date(2013, 11, 31)
	 * )
	 * //=> 1
	 */
	function differenceInYears (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$22(dirtyDateLeft)
	  var dateRight = parse$22(dirtyDateRight)

	  var sign = compareAsc$4(dateLeft, dateRight)
	  var difference = Math.abs(differenceInCalendarYears$1(dateLeft, dateRight))
	  dateLeft.setFullYear(dateLeft.getFullYear() - sign * difference)

	  // Math.abs(diff in full years - diff in calendar years) === 1 if last calendar year is not full
	  // If so, result must be decreased by 1 in absolute value
	  var isLastYearNotFull = compareAsc$4(dateLeft, dateRight) === -sign
	  return sign * (difference - isLastYearNotFull)
	}

	var __moduleExports$44 = differenceInYears

	function buildDistanceInWordsLocale$1 () {
	  var distanceInWordsLocale = {
	    lessThanXSeconds: {
	      one: 'less than a second',
	      other: 'less than {{count}} seconds'
	    },

	    xSeconds: {
	      one: '1 second',
	      other: '{{count}} seconds'
	    },

	    halfAMinute: 'half a minute',

	    lessThanXMinutes: {
	      one: 'less than a minute',
	      other: 'less than {{count}} minutes'
	    },

	    xMinutes: {
	      one: '1 minute',
	      other: '{{count}} minutes'
	    },

	    aboutXHours: {
	      one: 'about 1 hour',
	      other: 'about {{count}} hours'
	    },

	    xHours: {
	      one: '1 hour',
	      other: '{{count}} hours'
	    },

	    xDays: {
	      one: '1 day',
	      other: '{{count}} days'
	    },

	    aboutXMonths: {
	      one: 'about 1 month',
	      other: 'about {{count}} months'
	    },

	    xMonths: {
	      one: '1 month',
	      other: '{{count}} months'
	    },

	    aboutXYears: {
	      one: 'about 1 year',
	      other: 'about {{count}} years'
	    },

	    xYears: {
	      one: '1 year',
	      other: '{{count}} years'
	    },

	    overXYears: {
	      one: 'over 1 year',
	      other: 'over {{count}} years'
	    },

	    almostXYears: {
	      one: 'almost 1 year',
	      other: 'almost {{count}} years'
	    }
	  }

	  function localize (token, count, options) {
	    options = options || {}

	    var result
	    if (typeof distanceInWordsLocale[token] === 'string') {
	      result = distanceInWordsLocale[token]
	    } else if (count === 1) {
	      result = distanceInWordsLocale[token].one
	    } else {
	      result = distanceInWordsLocale[token].other.replace('{{count}}', count)
	    }

	    if (options.addSuffix) {
	      if (options.comparison > 0) {
	        return 'in ' + result
	      } else {
	        return result + ' ago'
	      }
	    }

	    return result
	  }

	  return {
	    localize: localize
	  }
	}

	var __moduleExports$47 = buildDistanceInWordsLocale$1

	var commonFormatterKeys = [
	  'M', 'MM', 'Q', 'D', 'DD', 'DDD', 'DDDD', 'd',
	  'E', 'W', 'WW', 'YY', 'YYYY', 'GG', 'GGGG',
	  'H', 'HH', 'h', 'hh', 'm', 'mm',
	  's', 'ss', 'S', 'SS', 'SSS',
	  'Z', 'ZZ', 'X', 'x'
	]

	function buildFormattingTokensRegExp$1 (formatters) {
	  var formatterKeys = []
	  for (var key in formatters) {
	    if (formatters.hasOwnProperty(key)) {
	      formatterKeys.push(key)
	    }
	  }

	  var formattingTokens = commonFormatterKeys
	    .concat(formatterKeys)
	    .sort()
	    .reverse()
	  var formattingTokensRegExp = new RegExp(
	    '(\\[[^\\[]*\\])|(\\\\)?' + '(' + formattingTokens.join('|') + '|.)', 'g'
	  )

	  return formattingTokensRegExp
	}

	var __moduleExports$49 = buildFormattingTokensRegExp$1

	var buildFormattingTokensRegExp = __moduleExports$49

	function buildFormatLocale$1 () {
	  // Note: in English, the names of days of the week and months are capitalized.
	  // If you are making a new locale based on this one, check if the same is true for the language you're working on.
	  // Generally, formatted dates should look like they are in the middle of a sentence,
	  // e.g. in Spanish language the weekdays and months should be in the lowercase.
	  var months3char = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	  var monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
	  var weekdays2char = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
	  var weekdays3char = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	  var weekdaysFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
	  var meridiemUppercase = ['AM', 'PM']
	  var meridiemLowercase = ['am', 'pm']
	  var meridiemFull = ['a.m.', 'p.m.']

	  var formatters = {
	    // Month: Jan, Feb, ..., Dec
	    'MMM': function (date) {
	      return months3char[date.getMonth()]
	    },

	    // Month: January, February, ..., December
	    'MMMM': function (date) {
	      return monthsFull[date.getMonth()]
	    },

	    // Day of week: Su, Mo, ..., Sa
	    'dd': function (date) {
	      return weekdays2char[date.getDay()]
	    },

	    // Day of week: Sun, Mon, ..., Sat
	    'ddd': function (date) {
	      return weekdays3char[date.getDay()]
	    },

	    // Day of week: Sunday, Monday, ..., Saturday
	    'dddd': function (date) {
	      return weekdaysFull[date.getDay()]
	    },

	    // AM, PM
	    'A': function (date) {
	      return (date.getHours() / 12) >= 1 ? meridiemUppercase[1] : meridiemUppercase[0]
	    },

	    // am, pm
	    'a': function (date) {
	      return (date.getHours() / 12) >= 1 ? meridiemLowercase[1] : meridiemLowercase[0]
	    },

	    // a.m., p.m.
	    'aa': function (date) {
	      return (date.getHours() / 12) >= 1 ? meridiemFull[1] : meridiemFull[0]
	    }
	  }

	  // Generate ordinal version of formatters: M -> Mo, D -> Do, etc.
	  var ordinalFormatters = ['M', 'D', 'DDD', 'd', 'Q', 'W']
	  ordinalFormatters.forEach(function (formatterToken) {
	    formatters[formatterToken + 'o'] = function (date, formatters) {
	      return ordinal(formatters[formatterToken](date))
	    }
	  })

	  return {
	    formatters: formatters,
	    formattingTokensRegExp: buildFormattingTokensRegExp(formatters)
	  }
	}

	function ordinal (number) {
	  var rem100 = number % 100
	  if (rem100 > 20 || rem100 < 10) {
	    switch (rem100 % 10) {
	      case 1:
	        return number + 'st'
	      case 2:
	        return number + 'nd'
	      case 3:
	        return number + 'rd'
	    }
	  }
	  return number + 'th'
	}

	var __moduleExports$48 = buildFormatLocale$1

	var buildDistanceInWordsLocale = __moduleExports$47
	var buildFormatLocale = __moduleExports$48

	/**
	 * @category Locales
	 * @summary English locale.
	 */
	var __moduleExports$46 = {
	  distanceInWords: buildDistanceInWordsLocale(),
	  format: buildFormatLocale()
	}

	var compareDesc$1 = __moduleExports$26
	var parse$23 = __moduleExports$3
	var differenceInSeconds$1 = __moduleExports$42
	var differenceInMonths$2 = __moduleExports$40
	var enLocale = __moduleExports$46

	var MINUTES_IN_DAY = 1440
	var MINUTES_IN_ALMOST_TWO_DAYS = 2520
	var MINUTES_IN_MONTH = 43200
	var MINUTES_IN_TWO_MONTHS = 86400

	/**
	 * @category Common Helpers
	 * @summary Return the distance between the given dates in words.
	 *
	 * @description
	 * Return the distance between the given dates in words.
	 *
	 * | Distance between dates                                            | Result              |
	 * |-------------------------------------------------------------------|---------------------|
	 * | 0 ... 30 secs                                                     | less than a minute  |
	 * | 30 secs ... 1 min 30 secs                                         | 1 minute            |
	 * | 1 min 30 secs ... 44 mins 30 secs                                 | [2..44] minutes     |
	 * | 44 mins ... 30 secs ... 89 mins 30 secs                           | about 1 hour        |
	 * | 89 mins 30 secs ... 23 hrs 59 mins 30 secs                        | about [2..24] hours |
	 * | 23 hrs 59 mins 30 secs ... 41 hrs 59 mins 30 secs                 | 1 day               |
	 * | 41 hrs 59 mins 30 secs ... 29 days 23 hrs 59 mins 30 secs         | [2..30] days        |
	 * | 29 days 23 hrs 59 mins 30 secs ... 44 days 23 hrs 59 mins 30 secs | about 1 month       |
	 * | 44 days 23 hrs 59 mins 30 secs ... 59 days 23 hrs 59 mins 30 secs | about 2 months      |
	 * | 59 days 23 hrs 59 mins 30 secs ... 1 yr                           | [2..12] months      |
	 * | 1 yr ... 1 yr 3 months                                            | about 1 year        |
	 * | 1 yr 3 months ... 1 yr 9 month s                                  | over 1 year         |
	 * | 1 yr 9 months ... 2 yrs                                           | almost 2 years      |
	 * | N yrs ... N yrs 3 months                                          | about N years       |
	 * | N yrs 3 months ... N yrs 9 months                                 | over N years        |
	 * | N yrs 9 months ... N+1 yrs                                        | almost N+1 years    |
	 *
	 * With `options.includeSeconds == true`:
	 * | Distance between dates | Result               |
	 * |------------------------|----------------------|
	 * | 0 secs ... 5 secs      | less than 5 seconds  |
	 * | 5 secs ... 10 secs     | less than 10 seconds |
	 * | 10 secs ... 20 secs    | less than 20 seconds |
	 * | 20 secs ... 40 secs    | half a minute        |
	 * | 40 secs ... 60 secs    | less than a minute   |
	 * | 60 secs ... 90 secs    | 1 minute             |
	 *
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @param {Date|String|Number} date - the other date
	 * @param {Object} [options] - the object with options
	 * @param {Boolean} [options.includeSeconds=false] - distances less than a minute are more detailed
	 * @param {Boolean} [options.addSuffix=false] - result indicates if the second date is earlier or later than the first
	 * @param {Object} [options.locale=enLocale] - the locale object
	 * @returns {String} the distance in words
	 *
	 * @example
	 * // What is the distance between 2 July 2014 and 1 January 2015?
	 * var result = distanceInWords(
	 *   new Date(2014, 6, 2),
	 *   new Date(2015, 0, 1)
	 * )
	 * //=> '6 months'
	 *
	 * @example
	 * // What is the distance between 1 January 2015 00:00:15
	 * // and 1 January 2015 00:00:00, including seconds?
	 * var result = distanceInWords(
	 *   new Date(2015, 0, 1, 0, 0, 15),
	 *   new Date(2015, 0, 1, 0, 0, 0),
	 *   {includeSeconds: true}
	 * )
	 * //=> 'less than 20 seconds'
	 *
	 * @example
	 * // What is the distance from 1 January 2016
	 * // to 1 January 2015, with a suffix?
	 * var result = distanceInWords(
	 *   new Date(2016, 0, 1),
	 *   new Date(2015, 0, 1),
	 *   {addSuffix: true}
	 * )
	 * //=> 'about 1 year ago'
	 *
	 * @example
	 * // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
	 * var eoLocale = require('date-fns/locale/eo')
	 * var result = distanceInWords(
	 *   new Date(2016, 7, 1),
	 *   new Date(2015, 0, 1),
	 *   {locale: eoLocale}
	 * )
	 * //=> 'pli ol 1 jaro'
	 */
	function distanceInWords (dirtyDateToCompare, dirtyDate, dirtyOptions) {
	  var options = dirtyOptions || {}

	  var comparison = compareDesc$1(dirtyDateToCompare, dirtyDate)

	  var locale = options.locale
	  var localize = enLocale.distanceInWords.localize
	  if (locale && locale.distanceInWords && locale.distanceInWords.localize) {
	    localize = locale.distanceInWords.localize
	  }

	  var localizeOptions = {
	    addSuffix: Boolean(options.addSuffix),
	    comparison: comparison
	  }

	  var dateLeft, dateRight
	  if (comparison > 0) {
	    dateLeft = parse$23(dirtyDateToCompare)
	    dateRight = parse$23(dirtyDate)
	  } else {
	    dateLeft = parse$23(dirtyDate)
	    dateRight = parse$23(dirtyDateToCompare)
	  }

	  var seconds = differenceInSeconds$1(dateRight, dateLeft)
	  var offset = dateRight.getTimezoneOffset() - dateLeft.getTimezoneOffset()
	  var minutes = Math.round(seconds / 60) - offset
	  var months

	  // 0 up to 2 mins
	  if (minutes < 2) {
	    if (options.includeSeconds) {
	      if (seconds < 5) {
	        return localize('lessThanXSeconds', 5, localizeOptions)
	      } else if (seconds < 10) {
	        return localize('lessThanXSeconds', 10, localizeOptions)
	      } else if (seconds < 20) {
	        return localize('lessThanXSeconds', 20, localizeOptions)
	      } else if (seconds < 40) {
	        return localize('halfAMinute', null, localizeOptions)
	      } else if (seconds < 60) {
	        return localize('lessThanXMinutes', 1, localizeOptions)
	      } else {
	        return localize('xMinutes', 1, localizeOptions)
	      }
	    } else {
	      if (minutes === 0) {
	        return localize('lessThanXMinutes', 1, localizeOptions)
	      } else {
	        return localize('xMinutes', minutes, localizeOptions)
	      }
	    }

	  // 2 mins up to 0.75 hrs
	  } else if (minutes < 45) {
	    return localize('xMinutes', minutes, localizeOptions)

	  // 0.75 hrs up to 1.5 hrs
	  } else if (minutes < 90) {
	    return localize('aboutXHours', 1, localizeOptions)

	  // 1.5 hrs up to 24 hrs
	  } else if (minutes < MINUTES_IN_DAY) {
	    var hours = Math.round(minutes / 60)
	    return localize('aboutXHours', hours, localizeOptions)

	  // 1 day up to 1.75 days
	  } else if (minutes < MINUTES_IN_ALMOST_TWO_DAYS) {
	    return localize('xDays', 1, localizeOptions)

	  // 1.75 days up to 30 days
	  } else if (minutes < MINUTES_IN_MONTH) {
	    var days = Math.round(minutes / MINUTES_IN_DAY)
	    return localize('xDays', days, localizeOptions)

	  // 1 month up to 2 months
	  } else if (minutes < MINUTES_IN_TWO_MONTHS) {
	    months = Math.round(minutes / MINUTES_IN_MONTH)
	    return localize('aboutXMonths', months, localizeOptions)
	  }

	  months = differenceInMonths$2(dateRight, dateLeft)

	  // 2 months up to 12 months
	  if (months < 12) {
	    var nearestMonth = Math.round(minutes / MINUTES_IN_MONTH)
	    return localize('xMonths', nearestMonth, localizeOptions)

	  // 1 year up to max Date
	  } else {
	    var monthsSinceStartOfYear = months % 12
	    var years = Math.floor(months / 12)

	    // N years up to 1 years 3 months
	    if (monthsSinceStartOfYear < 3) {
	      return localize('aboutXYears', years, localizeOptions)

	    // N years 3 months up to N years 9 months
	    } else if (monthsSinceStartOfYear < 9) {
	      return localize('overXYears', years, localizeOptions)

	    // N years 9 months up to N year 12 months
	    } else {
	      return localize('almostXYears', years + 1, localizeOptions)
	    }
	  }
	}

	var __moduleExports$45 = distanceInWords

	var compareDesc$2 = __moduleExports$26
	var parse$24 = __moduleExports$3
	var differenceInSeconds$2 = __moduleExports$42
	var enLocale$1 = __moduleExports$46

	var MINUTES_IN_DAY$1 = 1440
	var MINUTES_IN_MONTH$1 = 43200
	var MINUTES_IN_YEAR = 525600

	/**
	 * @category Common Helpers
	 * @summary Return the distance between the given dates in words.
	 *
	 * @description
	 * Return the distance between the given dates in words, using strict units.
	 * This is like `distanceInWords`, but does not use helpers like 'almost', 'over',
	 * 'less than' and the like.
	 *
	 * | Distance between dates | Result              |
	 * |------------------------|---------------------|
	 * | 0 ... 59 secs          | [0..59] seconds     |
	 * | 1 ... 59 mins          | [1..59] minutes     |
	 * | 1 ... 23 hrs           | [1..23] hours       |
	 * | 1 ... 29 days          | [1..29] days        |
	 * | 1 ... 11 months        | [1..11] months      |
	 * | 1 ... N years          | [1..N]  years       |
	 *
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @param {Date|String|Number} date - the other date
	 * @param {Object} [options] - the object with options
	 * @param {Boolean} [options.addSuffix=false] - result indicates if the second date is earlier or later than the first
	 * @param {'s'|'m'|'h'|'d'|'M'|'Y'} [options.unit] - if specified, will force a unit
	 * @param {'floor'|'ceil'|'round'} [options.partialMethod='floor'] - which way to round partial units
	 * @param {Object} [options.locale=enLocale] - the locale object
	 * @returns {String} the distance in words
	 *
	 * @example
	 * // What is the distance between 2 July 2014 and 1 January 2015?
	 * var result = distanceInWordsStrict(
	 *   new Date(2014, 6, 2),
	 *   new Date(2015, 0, 2)
	 * )
	 * //=> '6 months'
	 *
	 * @example
	 * // What is the distance between 1 January 2015 00:00:15
	 * // and 1 January 2015 00:00:00?
	 * var result = distanceInWordsStrict(
	 *   new Date(2015, 0, 1, 0, 0, 15),
	 *   new Date(2015, 0, 1, 0, 0, 0),
	 * )
	 * //=> '15 seconds'
	 *
	 * @example
	 * // What is the distance from 1 January 2016
	 * // to 1 January 2015, with a suffix?
	 * var result = distanceInWordsStrict(
	 *   new Date(2016, 0, 1),
	 *   new Date(2015, 0, 1),
	 *   {addSuffix: true}
	 * )
	 * //=> '1 year ago'
	 *
	 * @example
	 * // What is the distance from 1 January 2016
	 * // to 1 January 2015, in minutes?
	 * var result = distanceInWordsStrict(
	 *   new Date(2016, 0, 1),
	 *   new Date(2015, 0, 1),
	 *   {unit: 'm'}
	 * )
	 * //=> '525600 minutes'
	 *
	 * @example
	 * // What is the distance from 1 January 2016
	 * // to 28 January 2015, in months, rounded up?
	 * var result = distanceInWordsStrict(
	 *   new Date(2015, 0, 28),
	 *   new Date(2015, 0, 1),
	 *   {unit: 'M', partialMethod: 'ceil'}
	 * )
	 * //=> '1 month'
	 *
	 * @example
	 * // What is the distance between 1 August 2016 and 1 January 2015 in Esperanto?
	 * var eoLocale = require('date-fns/locale/eo')
	 * var result = distanceInWordsStrict(
	 *   new Date(2016, 7, 1),
	 *   new Date(2015, 0, 1),
	 *   {locale: eoLocale}
	 * )
	 * //=> '1 jaro'
	 */
	function distanceInWordsStrict (dirtyDateToCompare, dirtyDate, dirtyOptions) {
	  var options = dirtyOptions || {}

	  var comparison = compareDesc$2(dirtyDateToCompare, dirtyDate)

	  var locale = options.locale
	  var localize = enLocale$1.distanceInWords.localize
	  if (locale && locale.distanceInWords && locale.distanceInWords.localize) {
	    localize = locale.distanceInWords.localize
	  }

	  var localizeOptions = {
	    addSuffix: Boolean(options.addSuffix),
	    comparison: comparison
	  }

	  var dateLeft, dateRight
	  if (comparison > 0) {
	    dateLeft = parse$24(dirtyDateToCompare)
	    dateRight = parse$24(dirtyDate)
	  } else {
	    dateLeft = parse$24(dirtyDate)
	    dateRight = parse$24(dirtyDateToCompare)
	  }

	  var unit
	  var mathPartial = Math[options.partialMethod ? String(options.partialMethod) : 'floor']
	  var seconds = differenceInSeconds$2(dateRight, dateLeft)
	  var offset = dateRight.getTimezoneOffset() - dateLeft.getTimezoneOffset()
	  var minutes = mathPartial(seconds / 60) - offset
	  var hours, days, months, years

	  if (options.unit) {
	    unit = String(options.unit)
	  } else {
	    if (minutes < 1) {
	      unit = 's'
	    } else if (minutes < 60) {
	      unit = 'm'
	    } else if (minutes < MINUTES_IN_DAY$1) {
	      unit = 'h'
	    } else if (minutes < MINUTES_IN_MONTH$1) {
	      unit = 'd'
	    } else if (minutes < MINUTES_IN_YEAR) {
	      unit = 'M'
	    } else {
	      unit = 'Y'
	    }
	  }

	  // 0 up to 60 seconds
	  if (unit === 's') {
	    return localize('xSeconds', seconds, localizeOptions)

	  // 1 up to 60 mins
	  } else if (unit === 'm') {
	    return localize('xMinutes', minutes, localizeOptions)

	  // 1 up to 24 hours
	  } else if (unit === 'h') {
	    hours = mathPartial(minutes / 60)
	    return localize('xHours', hours, localizeOptions)

	  // 1 up to 30 days
	  } else if (unit === 'd') {
	    days = mathPartial(minutes / MINUTES_IN_DAY$1)
	    return localize('xDays', days, localizeOptions)

	  // 1 up to 12 months
	  } else if (unit === 'M') {
	    months = mathPartial(minutes / MINUTES_IN_MONTH$1)
	    return localize('xMonths', months, localizeOptions)

	  // 1 year up to max Date
	  } else if (unit === 'Y') {
	    years = mathPartial(minutes / MINUTES_IN_YEAR)
	    return localize('xYears', years, localizeOptions)
	  }

	  throw new Error('Unknown unit: ' + unit)
	}

	var __moduleExports$50 = distanceInWordsStrict

	var distanceInWords$1 = __moduleExports$45

	/**
	 * @category Common Helpers
	 * @summary Return the distance between the given date and now in words.
	 *
	 * @description
	 * Return the distance between the given date and now in words.
	 *
	 * | Distance to now                                                   | Result              |
	 * |-------------------------------------------------------------------|---------------------|
	 * | 0 ... 30 secs                                                     | less than a minute  |
	 * | 30 secs ... 1 min 30 secs                                         | 1 minute            |
	 * | 1 min 30 secs ... 44 mins 30 secs                                 | [2..44] minutes     |
	 * | 44 mins ... 30 secs ... 89 mins 30 secs                           | about 1 hour        |
	 * | 89 mins 30 secs ... 23 hrs 59 mins 30 secs                        | about [2..24] hours |
	 * | 23 hrs 59 mins 30 secs ... 41 hrs 59 mins 30 secs                 | 1 day               |
	 * | 41 hrs 59 mins 30 secs ... 29 days 23 hrs 59 mins 30 secs         | [2..30] days        |
	 * | 29 days 23 hrs 59 mins 30 secs ... 44 days 23 hrs 59 mins 30 secs | about 1 month       |
	 * | 44 days 23 hrs 59 mins 30 secs ... 59 days 23 hrs 59 mins 30 secs | about 2 months      |
	 * | 59 days 23 hrs 59 mins 30 secs ... 1 yr                           | [2..12] months      |
	 * | 1 yr ... 1 yr 3 months                                            | about 1 year        |
	 * | 1 yr 3 months ... 1 yr 9 month s                                  | over 1 year         |
	 * | 1 yr 9 months ... 2 yrs                                           | almost 2 years      |
	 * | N yrs ... N yrs 3 months                                          | about N years       |
	 * | N yrs 3 months ... N yrs 9 months                                 | over N years        |
	 * | N yrs 9 months ... N+1 yrs                                        | almost N+1 years    |
	 *
	 * With `options.includeSeconds == true`:
	 * | Distance to now     | Result               |
	 * |---------------------|----------------------|
	 * | 0 secs ... 5 secs   | less than 5 seconds  |
	 * | 5 secs ... 10 secs  | less than 10 seconds |
	 * | 10 secs ... 20 secs | less than 20 seconds |
	 * | 20 secs ... 40 secs | half a minute        |
	 * | 40 secs ... 60 secs | less than a minute   |
	 * | 60 secs ... 90 secs | 1 minute             |
	 *
	 * @param {Date|String|Number} date - the given date
	 * @param {Object} [options] - the object with options
	 * @param {Boolean} [options.includeSeconds=false] - distances less than a minute are more detailed
	 * @param {Boolean} [options.addSuffix=false] - result specifies if the second date is earlier or later than the first
	 * @param {Object} [options.locale=enLocale] - the locale object
	 * @returns {String} the distance in words
	 *
	 * @example
	 * // If today is 1 January 2015, what is the distance to 2 July 2014?
	 * var result = distanceInWordsToNow(
	 *   new Date(2014, 6, 2)
	 * )
	 * //=> '6 months'
	 *
	 * @example
	 * // If now is 1 January 2015 00:00:00,
	 * // what is the distance to 1 January 2015 00:00:15, including seconds?
	 * var result = distanceInWordsToNow(
	 *   new Date(2015, 0, 1, 0, 0, 15),
	 *   {includeSeconds: true}
	 * )
	 * //=> 'less than 20 seconds'
	 *
	 * @example
	 * // If today is 1 January 2015,
	 * // what is the distance to 1 January 2016, with a suffix?
	 * var result = distanceInWordsToNow(
	 *   new Date(2016, 0, 1),
	 *   {addSuffix: true}
	 * )
	 * //=> 'in about 1 year'
	 *
	 * @example
	 * // If today is 1 January 2015,
	 * // what is the distance to 1 August 2016 in Esperanto?
	 * var eoLocale = require('date-fns/locale/eo')
	 * var result = distanceInWordsToNow(
	 *   new Date(2016, 7, 1),
	 *   {locale: eoLocale}
	 * )
	 * //=> 'pli ol 1 jaro'
	 */
	function distanceInWordsToNow (dirtyDate, dirtyOptions) {
	  return distanceInWords$1(Date.now(), dirtyDate, dirtyOptions)
	}

	var __moduleExports$51 = distanceInWordsToNow

	var parse$25 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Return the array of dates within the specified range.
	 *
	 * @description
	 * Return the array of dates within the specified range.
	 *
	 * @param {Date|String|Number} startDate - the first date
	 * @param {Date|String|Number} endDate - the last date
	 * @param {Number} [step=1] - the step between each day
	 * @returns {Date[]} the array with starts of days from the day of startDate to the day of endDate
	 * @throws {Error} startDate cannot be after endDate
	 *
	 * @example
	 * // Each day between 6 October 2014 and 10 October 2014:
	 * var result = eachDay(
	 *   new Date(2014, 9, 6),
	 *   new Date(2014, 9, 10)
	 * )
	 * //=> [
	 * //   Mon Oct 06 2014 00:00:00,
	 * //   Tue Oct 07 2014 00:00:00,
	 * //   Wed Oct 08 2014 00:00:00,
	 * //   Thu Oct 09 2014 00:00:00,
	 * //   Fri Oct 10 2014 00:00:00
	 * // ]
	 */
	function eachDay (dirtyStartDate, dirtyEndDate, dirtyStep) {
	  var startDate = parse$25(dirtyStartDate)
	  var endDate = parse$25(dirtyEndDate)
	  var step = dirtyStep !== undefined ? dirtyStep : 1

	  var endTime = endDate.getTime()

	  if (startDate.getTime() > endTime) {
	    throw new Error('The first date cannot be after the second date')
	  }

	  var dates = []

	  var currentDate = startDate
	  currentDate.setHours(0, 0, 0, 0)

	  while (currentDate.getTime() <= endTime) {
	    dates.push(parse$25(currentDate))
	    currentDate.setDate(currentDate.getDate() + step)
	  }

	  return dates
	}

	var __moduleExports$52 = eachDay

	var parse$26 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Return the end of a day for the given date.
	 *
	 * @description
	 * Return the end of a day for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a day
	 *
	 * @example
	 * // The end of a day for 2 September 2014 11:55:00:
	 * var result = endOfDay(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 02 2014 23:59:59.999
	 */
	function endOfDay (dirtyDate) {
	  var date = parse$26(dirtyDate)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$53 = endOfDay

	var parse$27 = __moduleExports$3

	/**
	 * @category Hour Helpers
	 * @summary Return the end of an hour for the given date.
	 *
	 * @description
	 * Return the end of an hour for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of an hour
	 *
	 * @example
	 * // The end of an hour for 2 September 2014 11:55:00:
	 * var result = endOfHour(new Date(2014, 8, 2, 11, 55))
	 * //=> Tue Sep 02 2014 11:59:59.999
	 */
	function endOfHour (dirtyDate) {
	  var date = parse$27(dirtyDate)
	  date.setMinutes(59, 59, 999)
	  return date
	}

	var __moduleExports$54 = endOfHour

	var parse$28 = __moduleExports$3

	/**
	 * @category Week Helpers
	 * @summary Return the end of a week for the given date.
	 *
	 * @description
	 * Return the end of a week for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Date} the end of a week
	 *
	 * @example
	 * // The end of a week for 2 September 2014 11:55:00:
	 * var result = endOfWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Sat Sep 06 2014 23:59:59.999
	 *
	 * @example
	 * // If the week starts on Monday, the end of the week for 2 September 2014 11:55:00:
	 * var result = endOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
	 * //=> Sun Sep 07 2014 23:59:59.999
	 */
	function endOfWeek$1 (dirtyDate, dirtyOptions) {
	  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

	  var date = parse$28(dirtyDate)
	  var day = date.getDay()
	  var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn)

	  date.setDate(date.getDate() + diff)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$56 = endOfWeek$1

	var endOfWeek = __moduleExports$56

	/**
	 * @category ISO Week Helpers
	 * @summary Return the end of an ISO week for the given date.
	 *
	 * @description
	 * Return the end of an ISO week for the given date.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of an ISO week
	 *
	 * @example
	 * // The end of an ISO week for 2 September 2014 11:55:00:
	 * var result = endOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Sun Sep 07 2014 23:59:59.999
	 */
	function endOfISOWeek (dirtyDate) {
	  return endOfWeek(dirtyDate, {weekStartsOn: 1})
	}

	var __moduleExports$55 = endOfISOWeek

	var getISOYear$4 = __moduleExports$8
	var startOfISOWeek$4 = __moduleExports$9

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Return the end of an ISO week-numbering year for the given date.
	 *
	 * @description
	 * Return the end of an ISO week-numbering year,
	 * which always starts 3 days before the year's first Thursday.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of an ISO week-numbering year
	 *
	 * @example
	 * // The end of an ISO week-numbering year for 2 July 2005:
	 * var result = endOfISOYear(new Date(2005, 6, 2))
	 * //=> Sun Jan 01 2006 23:59:59.999
	 */
	function endOfISOYear (dirtyDate) {
	  var year = getISOYear$4(dirtyDate)
	  var fourthOfJanuaryOfNextYear = new Date(0)
	  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4)
	  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0)
	  var date = startOfISOWeek$4(fourthOfJanuaryOfNextYear)
	  date.setMilliseconds(date.getMilliseconds() - 1)
	  return date
	}

	var __moduleExports$57 = endOfISOYear

	var parse$29 = __moduleExports$3

	/**
	 * @category Minute Helpers
	 * @summary Return the end of a minute for the given date.
	 *
	 * @description
	 * Return the end of a minute for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a minute
	 *
	 * @example
	 * // The end of a minute for 1 December 2014 22:15:45.400:
	 * var result = endOfMinute(new Date(2014, 11, 1, 22, 15, 45, 400))
	 * //=> Mon Dec 01 2014 22:15:59.999
	 */
	function endOfMinute (dirtyDate) {
	  var date = parse$29(dirtyDate)
	  date.setSeconds(59, 999)
	  return date
	}

	var __moduleExports$58 = endOfMinute

	var parse$30 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Return the end of a month for the given date.
	 *
	 * @description
	 * Return the end of a month for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a month
	 *
	 * @example
	 * // The end of a month for 2 September 2014 11:55:00:
	 * var result = endOfMonth(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 30 2014 23:59:59.999
	 */
	function endOfMonth (dirtyDate) {
	  var date = parse$30(dirtyDate)
	  var month = date.getMonth()
	  date.setFullYear(date.getFullYear(), month + 1, 0)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$59 = endOfMonth

	var parse$31 = __moduleExports$3

	/**
	 * @category Quarter Helpers
	 * @summary Return the end of a year quarter for the given date.
	 *
	 * @description
	 * Return the end of a year quarter for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a quarter
	 *
	 * @example
	 * // The end of a quarter for 2 September 2014 11:55:00:
	 * var result = endOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 30 2014 23:59:59.999
	 */
	function endOfQuarter (dirtyDate) {
	  var date = parse$31(dirtyDate)
	  var currentMonth = date.getMonth()
	  var month = currentMonth - currentMonth % 3 + 3
	  date.setMonth(month, 0)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$60 = endOfQuarter

	var parse$32 = __moduleExports$3

	/**
	 * @category Second Helpers
	 * @summary Return the end of a second for the given date.
	 *
	 * @description
	 * Return the end of a second for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a second
	 *
	 * @example
	 * // The end of a second for 1 December 2014 22:15:45.400:
	 * var result = endOfSecond(new Date(2014, 11, 1, 22, 15, 45, 400))
	 * //=> Mon Dec 01 2014 22:15:45.999
	 */
	function endOfSecond (dirtyDate) {
	  var date = parse$32(dirtyDate)
	  date.setMilliseconds(999)
	  return date
	}

	var __moduleExports$61 = endOfSecond

	var endOfDay$1 = __moduleExports$53

	/**
	 * @category Day Helpers
	 * @summary Return the end of today.
	 *
	 * @description
	 * Return the end of today.
	 *
	 * @returns {Date} the end of today
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = endOfToday()
	 * //=> Mon Oct 6 2014 23:59:59.999
	 */
	function endOfToday () {
	  return endOfDay$1(new Date())
	}

	var __moduleExports$62 = endOfToday

	/**
	 * @category Day Helpers
	 * @summary Return the end of tomorrow.
	 *
	 * @description
	 * Return the end of tomorrow.
	 *
	 * @returns {Date} the end of tomorrow
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = endOfTomorrow()
	 * //=> Tue Oct 7 2014 23:59:59.999
	 */
	function endOfTomorrow () {
	  var now = new Date()
	  var year = now.getFullYear()
	  var month = now.getMonth()
	  var day = now.getDate()

	  var date = new Date(0)
	  date.setFullYear(year, month, day + 1)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$63 = endOfTomorrow

	var parse$33 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Return the end of a year for the given date.
	 *
	 * @description
	 * Return the end of a year for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of a year
	 *
	 * @example
	 * // The end of a year for 2 September 2014 11:55:00:
	 * var result = endOfYear(new Date(2014, 8, 2, 11, 55, 00))
	 * //=> Wed Dec 31 2014 23:59:59.999
	 */
	function endOfYear (dirtyDate) {
	  var date = parse$33(dirtyDate)
	  var year = date.getFullYear()
	  date.setFullYear(year + 1, 0, 0)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$64 = endOfYear

	/**
	 * @category Day Helpers
	 * @summary Return the end of yesterday.
	 *
	 * @description
	 * Return the end of yesterday.
	 *
	 * @returns {Date} the end of yesterday
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = endOfYesterday()
	 * //=> Sun Oct 5 2014 23:59:59.999
	 */
	function endOfYesterday () {
	  var now = new Date()
	  var year = now.getFullYear()
	  var month = now.getMonth()
	  var day = now.getDate()

	  var date = new Date(0)
	  date.setFullYear(year, month, day - 1)
	  date.setHours(23, 59, 59, 999)
	  return date
	}

	var __moduleExports$65 = endOfYesterday

	var parse$36 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Return the start of a year for the given date.
	 *
	 * @description
	 * Return the start of a year for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a year
	 *
	 * @example
	 * // The start of a year for 2 September 2014 11:55:00:
	 * var result = startOfYear(new Date(2014, 8, 2, 11, 55, 00))
	 * //=> Wed Jan 01 2014 00:00:00
	 */
	function startOfYear$1 (dirtyDate) {
	  var cleanDate = parse$36(dirtyDate)
	  var date = new Date(0)
	  date.setFullYear(cleanDate.getFullYear(), 0, 1)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$68 = startOfYear$1

	var parse$35 = __moduleExports$3
	var startOfYear = __moduleExports$68
	var differenceInCalendarDays$3 = __moduleExports$13

	/**
	 * @category Day Helpers
	 * @summary Get the day of the year of the given date.
	 *
	 * @description
	 * Get the day of the year of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the day of year
	 *
	 * @example
	 * // Which day of the year is 2 July 2014?
	 * var result = getDayOfYear(new Date(2014, 6, 2))
	 * //=> 183
	 */
	function getDayOfYear$1 (dirtyDate) {
	  var date = parse$35(dirtyDate)
	  var diff = differenceInCalendarDays$3(date, startOfYear(date))
	  var dayOfYear = diff + 1
	  return dayOfYear
	}

	var __moduleExports$67 = getDayOfYear$1

	var parse$37 = __moduleExports$3
	var startOfISOWeek$5 = __moduleExports$9
	var startOfISOYear$2 = __moduleExports$12

	var MILLISECONDS_IN_WEEK$2 = 604800000

	/**
	 * @category ISO Week Helpers
	 * @summary Get the ISO week of the given date.
	 *
	 * @description
	 * Get the ISO week of the given date.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the ISO week
	 *
	 * @example
	 * // Which week of the ISO-week numbering year is 2 January 2005?
	 * var result = getISOWeek(new Date(2005, 0, 2))
	 * //=> 53
	 */
	function getISOWeek$1 (dirtyDate) {
	  var date = parse$37(dirtyDate)
	  var diff = startOfISOWeek$5(date).getTime() - startOfISOYear$2(date).getTime()

	  // Round the number of days to the nearest integer
	  // because the number of milliseconds in a week is not constant
	  // (e.g. it's different in the week of the daylight saving time clock shift)
	  return Math.round(diff / MILLISECONDS_IN_WEEK$2) + 1
	}

	var __moduleExports$69 = getISOWeek$1

	var isDate$2 = __moduleExports$4

	/**
	 * @category Common Helpers
	 * @summary Is the given date valid?
	 *
	 * @description
	 * Returns false if argument is Invalid Date and true otherwise.
	 * Invalid Date is a Date, whose time value is NaN.
	 *
	 * Time value of Date: http://es5.github.io/#x15.9.1.1
	 *
	 * @param {Date} date - the date to check
	 * @returns {Boolean} the date is valid
	 * @throws {TypeError} argument must be an instance of Date
	 *
	 * @example
	 * // For the valid date:
	 * var result = isValid(new Date(2014, 1, 31))
	 * //=> true
	 *
	 * @example
	 * // For the invalid date:
	 * var result = isValid(new Date(''))
	 * //=> false
	 */
	function isValid$1 (dirtyDate) {
	  if (isDate$2(dirtyDate)) {
	    return !isNaN(dirtyDate)
	  } else {
	    throw new TypeError(toString.call(dirtyDate) + ' is not an instance of Date')
	  }
	}

	var __moduleExports$70 = isValid$1

	var getDayOfYear = __moduleExports$67
	var getISOWeek = __moduleExports$69
	var getISOYear$5 = __moduleExports$8
	var parse$34 = __moduleExports$3
	var isValid = __moduleExports$70
	var enLocale$2 = __moduleExports$46

	/**
	 * @category Common Helpers
	 * @summary Format the date.
	 *
	 * @description
	 * Return the formatted date string in the given format.
	 *
	 * Accepted tokens:
	 * | Unit                    | Token | Result examples                  |
	 * |-------------------------|-------|----------------------------------|
	 * | Month                   | M     | 1, 2, ..., 12                    |
	 * |                         | Mo    | 1st, 2nd, ..., 12th              |
	 * |                         | MM    | 01, 02, ..., 12                  |
	 * |                         | MMM   | Jan, Feb, ..., Dec               |
	 * |                         | MMMM  | January, February, ..., December |
	 * | Quarter                 | Q     | 1, 2, 3, 4                       |
	 * |                         | Qo    | 1st, 2nd, 3rd, 4th               |
	 * | Day of month            | D     | 1, 2, ..., 31                    |
	 * |                         | Do    | 1st, 2nd, ..., 31st              |
	 * |                         | DD    | 01, 02, ..., 31                  |
	 * | Day of year             | DDD   | 1, 2, ..., 366                   |
	 * |                         | DDDo  | 1st, 2nd, ..., 366th             |
	 * |                         | DDDD  | 001, 002, ..., 366               |
	 * | Day of week             | d     | 0, 1, ..., 6                     |
	 * |                         | do    | 0th, 1st, ..., 6th               |
	 * |                         | dd    | Su, Mo, ..., Sa                  |
	 * |                         | ddd   | Sun, Mon, ..., Sat               |
	 * |                         | dddd  | Sunday, Monday, ..., Saturday    |
	 * | Day of ISO week         | E     | 1, 2, ..., 7                     |
	 * | ISO week                | W     | 1, 2, ..., 53                    |
	 * |                         | Wo    | 1st, 2nd, ..., 53rd              |
	 * |                         | WW    | 01, 02, ..., 53                  |
	 * | Year                    | YY    | 00, 01, ..., 99                  |
	 * |                         | YYYY  | 1900, 1901, ..., 2099            |
	 * | ISO week-numbering year | GG    | 00, 01, ..., 99                  |
	 * |                         | GGGG  | 1900, 1901, ..., 2099            |
	 * | AM/PM                   | A     | AM, PM                           |
	 * |                         | a     | am, pm                           |
	 * |                         | aa    | a.m., p.m.                       |
	 * | Hour                    | H     | 0, 1, ... 23                     |
	 * |                         | HH    | 00, 01, ... 23                   |
	 * |                         | h     | 1, 2, ..., 12                    |
	 * |                         | hh    | 01, 02, ..., 12                  |
	 * | Minute                  | m     | 0, 1, ..., 59                    |
	 * |                         | mm    | 00, 01, ..., 59                  |
	 * | Second                  | s     | 0, 1, ..., 59                    |
	 * |                         | ss    | 00, 01, ..., 59                  |
	 * | 1/10 of second          | S     | 0, 1, ..., 9                     |
	 * | 1/100 of second         | SS    | 00, 01, ..., 99                  |
	 * | Millisecond             | SSS   | 000, 001, ..., 999               |
	 * | Timezone                | Z     | -01:00, +00:00, ... +12:00       |
	 * |                         | ZZ    | -0100, +0000, ..., +1200         |
	 * | Seconds timestamp       | X     | 512969520                        |
	 * | Milliseconds timestamp  | x     | 512969520900                     |
	 *
	 * The characters wrapped in square brackets are escaped.
	 *
	 * The result may vary by locale.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @param {String} [format='YYYY-MM-DDTHH:mm:ss.SSSZ'] - the string of tokens
	 * @param {Object} [options] - the object with options
	 * @param {Object} [options.locale=enLocale] - the locale object
	 * @returns {String} the formatted date string
	 *
	 * @example
	 * // Represent 11 February 2014 in middle-endian format:
	 * var result = format(
	 *   new Date(2014, 1, 11),
	 *   'MM/DD/YYYY'
	 * )
	 * //=> '02/11/2014'
	 *
	 * @example
	 * // Represent 2 July 2014 in Esperanto:
	 * var eoLocale = require('date-fns/locale/eo')
	 * var result = format(
	 *   new Date(2014, 6, 2),
	 *   'Do [de] MMMM YYYY',
	 *   {locale: eoLocale}
	 * )
	 * //=> '2-a de julio 2014'
	 */
	function format$1 (dirtyDate, dirtyFormatStr, dirtyOptions) {
	  var formatStr = dirtyFormatStr ? String(dirtyFormatStr) : 'YYYY-MM-DDTHH:mm:ss.SSSZ'
	  var options = dirtyOptions || {}

	  var locale = options.locale
	  var localeFormatters = enLocale$2.format.formatters
	  var formattingTokensRegExp = enLocale$2.format.formattingTokensRegExp
	  if (locale && locale.format && locale.format.formatters) {
	    localeFormatters = locale.format.formatters

	    if (locale.format.formattingTokensRegExp) {
	      formattingTokensRegExp = locale.format.formattingTokensRegExp
	    }
	  }

	  var date = parse$34(dirtyDate)

	  if (!isValid(date)) {
	    return 'Invalid Date'
	  }

	  var formatFn = buildFormatFn(formatStr, localeFormatters, formattingTokensRegExp)

	  return formatFn(date)
	}

	var formatters = {
	  // Month: 1, 2, ..., 12
	  'M': function (date) {
	    return date.getMonth() + 1
	  },

	  // Month: 01, 02, ..., 12
	  'MM': function (date) {
	    return addLeadingZeros(date.getMonth() + 1, 2)
	  },

	  // Quarter: 1, 2, 3, 4
	  'Q': function (date) {
	    return Math.ceil((date.getMonth() + 1) / 3)
	  },

	  // Day of month: 1, 2, ..., 31
	  'D': function (date) {
	    return date.getDate()
	  },

	  // Day of month: 01, 02, ..., 31
	  'DD': function (date) {
	    return addLeadingZeros(date.getDate(), 2)
	  },

	  // Day of year: 1, 2, ..., 366
	  'DDD': function (date) {
	    return getDayOfYear(date)
	  },

	  // Day of year: 001, 002, ..., 366
	  'DDDD': function (date) {
	    return addLeadingZeros(getDayOfYear(date), 3)
	  },

	  // Day of week: 0, 1, ..., 6
	  'd': function (date) {
	    return date.getDay()
	  },

	  // Day of ISO week: 1, 2, ..., 7
	  'E': function (date) {
	    return date.getDay() || 7
	  },

	  // ISO week: 1, 2, ..., 53
	  'W': function (date) {
	    return getISOWeek(date)
	  },

	  // ISO week: 01, 02, ..., 53
	  'WW': function (date) {
	    return addLeadingZeros(getISOWeek(date), 2)
	  },

	  // Year: 00, 01, ..., 99
	  'YY': function (date) {
	    return addLeadingZeros(date.getFullYear(), 4).substr(2)
	  },

	  // Year: 1900, 1901, ..., 2099
	  'YYYY': function (date) {
	    return addLeadingZeros(date.getFullYear(), 4)
	  },

	  // ISO week-numbering year: 00, 01, ..., 99
	  'GG': function (date) {
	    return String(getISOYear$5(date)).substr(2)
	  },

	  // ISO week-numbering year: 1900, 1901, ..., 2099
	  'GGGG': function (date) {
	    return getISOYear$5(date)
	  },

	  // Hour: 0, 1, ... 23
	  'H': function (date) {
	    return date.getHours()
	  },

	  // Hour: 00, 01, ..., 23
	  'HH': function (date) {
	    return addLeadingZeros(date.getHours(), 2)
	  },

	  // Hour: 1, 2, ..., 12
	  'h': function (date) {
	    var hours = date.getHours()
	    if (hours === 0) {
	      return 12
	    } else if (hours > 12) {
	      return hours % 12
	    } else {
	      return hours
	    }
	  },

	  // Hour: 01, 02, ..., 12
	  'hh': function (date) {
	    return addLeadingZeros(formatters['h'](date), 2)
	  },

	  // Minute: 0, 1, ..., 59
	  'm': function (date) {
	    return date.getMinutes()
	  },

	  // Minute: 00, 01, ..., 59
	  'mm': function (date) {
	    return addLeadingZeros(date.getMinutes(), 2)
	  },

	  // Second: 0, 1, ..., 59
	  's': function (date) {
	    return date.getSeconds()
	  },

	  // Second: 00, 01, ..., 59
	  'ss': function (date) {
	    return addLeadingZeros(date.getSeconds(), 2)
	  },

	  // 1/10 of second: 0, 1, ..., 9
	  'S': function (date) {
	    return Math.floor(date.getMilliseconds() / 100)
	  },

	  // 1/100 of second: 00, 01, ..., 99
	  'SS': function (date) {
	    return addLeadingZeros(Math.floor(date.getMilliseconds() / 10), 2)
	  },

	  // Millisecond: 000, 001, ..., 999
	  'SSS': function (date) {
	    return addLeadingZeros(date.getMilliseconds(), 3)
	  },

	  // Timezone: -01:00, +00:00, ... +12:00
	  'Z': function (date) {
	    return formatTimezone(date.getTimezoneOffset(), ':')
	  },

	  // Timezone: -0100, +0000, ... +1200
	  'ZZ': function (date) {
	    return formatTimezone(date.getTimezoneOffset())
	  },

	  // Seconds timestamp: 512969520
	  'X': function (date) {
	    return Math.floor(date.getTime() / 1000)
	  },

	  // Milliseconds timestamp: 512969520900
	  'x': function (date) {
	    return date.getTime()
	  }
	}

	function buildFormatFn (formatStr, localeFormatters, formattingTokensRegExp) {
	  var array = formatStr.match(formattingTokensRegExp)
	  var length = array.length

	  var i
	  var formatter
	  for (i = 0; i < length; i++) {
	    formatter = localeFormatters[array[i]] || formatters[array[i]]
	    if (formatter) {
	      array[i] = formatter
	    } else {
	      array[i] = removeFormattingTokens(array[i])
	    }
	  }

	  return function (date) {
	    var output = ''
	    for (var i = 0; i < length; i++) {
	      if (array[i] instanceof Function) {
	        output += array[i](date, formatters)
	      } else {
	        output += array[i]
	      }
	    }
	    return output
	  }
	}

	function removeFormattingTokens (input) {
	  if (input.match(/\[[\s\S]/)) {
	    return input.replace(/^\[|]$/g, '')
	  }
	  return input.replace(/\\/g, '')
	}

	function formatTimezone (offset, delimeter) {
	  delimeter = delimeter || ''
	  var sign = offset > 0 ? '-' : '+'
	  var absOffset = Math.abs(offset)
	  var hours = Math.floor(absOffset / 60)
	  var minutes = absOffset % 60
	  return sign + addLeadingZeros(hours, 2) + delimeter + addLeadingZeros(minutes, 2)
	}

	function addLeadingZeros (number, targetLength) {
	  var output = Math.abs(number).toString()
	  while (output.length < targetLength) {
	    output = '0' + output
	  }
	  return output
	}

	var __moduleExports$66 = format$1

	var parse$38 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Get the day of the month of the given date.
	 *
	 * @description
	 * Get the day of the month of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the day of month
	 *
	 * @example
	 * // Which day of the month is 29 February 2012?
	 * var result = getDate(new Date(2012, 1, 29))
	 * //=> 29
	 */
	function getDate (dirtyDate) {
	  var date = parse$38(dirtyDate)
	  var dayOfMonth = date.getDate()
	  return dayOfMonth
	}

	var __moduleExports$71 = getDate

	var parse$39 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Get the day of the week of the given date.
	 *
	 * @description
	 * Get the day of the week of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the day of week
	 *
	 * @example
	 * // Which day of the week is 29 February 2012?
	 * var result = getDay(new Date(2012, 1, 29))
	 * //=> 3
	 */
	function getDay (dirtyDate) {
	  var date = parse$39(dirtyDate)
	  var day = date.getDay()
	  return day
	}

	var __moduleExports$72 = getDay

	var parse$40 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Is the given date in the leap year?
	 *
	 * @description
	 * Is the given date in the leap year?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in the leap year
	 *
	 * @example
	 * // Is 1 September 2012 in the leap year?
	 * var result = isLeapYear(new Date(2012, 8, 1))
	 * //=> true
	 */
	function isLeapYear$1 (dirtyDate) {
	  var date = parse$40(dirtyDate)
	  var year = date.getFullYear()
	  return year % 400 === 0 || year % 4 === 0 && year % 100 !== 0
	}

	var __moduleExports$74 = isLeapYear$1

	var isLeapYear = __moduleExports$74

	/**
	 * @category Year Helpers
	 * @summary Get the number of days in a year of the given date.
	 *
	 * @description
	 * Get the number of days in a year of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the number of days in a year
	 *
	 * @example
	 * // How many days are in 2012?
	 * var result = getDaysInYear(new Date(2012, 0, 1))
	 * //=> 366
	 */
	function getDaysInYear (dirtyDate) {
	  return isLeapYear(dirtyDate) ? 366 : 365
	}

	var __moduleExports$73 = getDaysInYear

	var parse$41 = __moduleExports$3

	/**
	 * @category Hour Helpers
	 * @summary Get the hours of the given date.
	 *
	 * @description
	 * Get the hours of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the hours
	 *
	 * @example
	 * // Get the hours of 29 February 2012 11:45:00:
	 * var result = getHours(new Date(2012, 1, 29, 11, 45))
	 * //=> 11
	 */
	function getHours (dirtyDate) {
	  var date = parse$41(dirtyDate)
	  var hours = date.getHours()
	  return hours
	}

	var __moduleExports$75 = getHours

	var parse$42 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Get the day of the ISO week of the given date.
	 *
	 * @description
	 * Get the day of the ISO week of the given date,
	 * which is 7 for Sunday, 1 for Monday etc.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the day of ISO week
	 *
	 * @example
	 * // Which day of the ISO week is 26 February 2012?
	 * var result = getISODay(new Date(2012, 1, 26))
	 * //=> 7
	 */
	function getISODay (dirtyDate) {
	  var date = parse$42(dirtyDate)
	  var day = date.getDay()

	  if (day === 0) {
	    day = 7
	  }

	  return day
	}

	var __moduleExports$76 = getISODay

	var startOfISOYear$3 = __moduleExports$12
	var addWeeks$1 = __moduleExports$20

	var MILLISECONDS_IN_WEEK$3 = 604800000

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Get the number of weeks in an ISO week-numbering year of the given date.
	 *
	 * @description
	 * Get the number of weeks in an ISO week-numbering year of the given date.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the number of ISO weeks in a year
	 *
	 * @example
	 * // How many weeks are in ISO week-numbering year 2015?
	 * var result = getISOWeeksInYear(new Date(2015, 1, 11))
	 * //=> 53
	 */
	function getISOWeeksInYear (dirtyDate) {
	  var thisYear = startOfISOYear$3(dirtyDate)
	  var nextYear = startOfISOYear$3(addWeeks$1(thisYear, 60))
	  var diff = nextYear.valueOf() - thisYear.valueOf()
	  // Round the number of weeks to the nearest integer
	  // because the number of milliseconds in a week is not constant
	  // (e.g. it's different in the week of the daylight saving time clock shift)
	  return Math.round(diff / MILLISECONDS_IN_WEEK$3)
	}

	var __moduleExports$77 = getISOWeeksInYear

	var parse$43 = __moduleExports$3

	/**
	 * @category Millisecond Helpers
	 * @summary Get the milliseconds of the given date.
	 *
	 * @description
	 * Get the milliseconds of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the milliseconds
	 *
	 * @example
	 * // Get the milliseconds of 29 February 2012 11:45:05.123:
	 * var result = getMilliseconds(new Date(2012, 1, 29, 11, 45, 5, 123))
	 * //=> 123
	 */
	function getMilliseconds (dirtyDate) {
	  var date = parse$43(dirtyDate)
	  var milliseconds = date.getMilliseconds()
	  return milliseconds
	}

	var __moduleExports$78 = getMilliseconds

	var parse$44 = __moduleExports$3

	/**
	 * @category Minute Helpers
	 * @summary Get the minutes of the given date.
	 *
	 * @description
	 * Get the minutes of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the minutes
	 *
	 * @example
	 * // Get the minutes of 29 February 2012 11:45:05:
	 * var result = getMinutes(new Date(2012, 1, 29, 11, 45, 5))
	 * //=> 45
	 */
	function getMinutes (dirtyDate) {
	  var date = parse$44(dirtyDate)
	  var minutes = date.getMinutes()
	  return minutes
	}

	var __moduleExports$79 = getMinutes

	var parse$45 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Get the month of the given date.
	 *
	 * @description
	 * Get the month of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the month
	 *
	 * @example
	 * // Which month is 29 February 2012?
	 * var result = getMonth(new Date(2012, 1, 29))
	 * //=> 1
	 */
	function getMonth (dirtyDate) {
	  var date = parse$45(dirtyDate)
	  var month = date.getMonth()
	  return month
	}

	var __moduleExports$80 = getMonth

	var parse$46 = __moduleExports$3

	var MILLISECONDS_IN_DAY$1 = 24 * 60 * 60 * 1000

	/**
	 * @category Range Helpers
	 * @summary Get the number of days that overlap in two date ranges
	 *
	 * @description
	 * Get the number of days that overlap in two date ranges
	 *
	 * @param {Date|String|Number} initialRangeStartDate - the start of the initial range
	 * @param {Date|String|Number} initialRangeEndDate - the end of the initial range
	 * @param {Date|String|Number} comparedRangeStartDate - the start of the range to compare it with
	 * @param {Date|String|Number} comparedRangeEndDate - the end of the range to compare it with
	 * @returns {Number} the number of days that overlap in two date ranges
	 * @throws {Error} startDate of a date range cannot be after its endDate
	 *
	 * @example
	 * // For overlapping date ranges adds 1 for each started overlapping day:
	 * getOverlappingDaysInRanges(
	 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 17), new Date(2014, 0, 21)
	 * )
	 * //=> 3
	 *
	 * @example
	 * // For non-overlapping date ranges returns 0:
	 * getOverlappingDaysInRanges(
	 *   new Date(2014, 0, 10), new Date(2014, 0, 20), new Date(2014, 0, 21), new Date(2014, 0, 22)
	 * )
	 * //=> 0
	 */
	function getOverlappingDaysInRanges (dirtyInitialRangeStartDate, dirtyInitialRangeEndDate, dirtyComparedRangeStartDate, dirtyComparedRangeEndDate) {
	  var initialStartTime = parse$46(dirtyInitialRangeStartDate).getTime()
	  var initialEndTime = parse$46(dirtyInitialRangeEndDate).getTime()
	  var comparedStartTime = parse$46(dirtyComparedRangeStartDate).getTime()
	  var comparedEndTime = parse$46(dirtyComparedRangeEndDate).getTime()

	  if (initialStartTime > initialEndTime || comparedStartTime > comparedEndTime) {
	    throw new Error('The start of the range cannot be after the end of the range')
	  }

	  var isOverlapping = initialStartTime < comparedEndTime && comparedStartTime < initialEndTime

	  if (!isOverlapping) {
	    return 0
	  }

	  var overlapStartDate = comparedStartTime < initialStartTime
	    ? initialStartTime
	    : comparedStartTime

	  var overlapEndDate = comparedEndTime > initialEndTime
	    ? initialEndTime
	    : comparedEndTime

	  var differenceInMs = overlapEndDate - overlapStartDate

	  return Math.ceil(differenceInMs / MILLISECONDS_IN_DAY$1)
	}

	var __moduleExports$81 = getOverlappingDaysInRanges

	var parse$47 = __moduleExports$3

	/**
	 * @category Second Helpers
	 * @summary Get the seconds of the given date.
	 *
	 * @description
	 * Get the seconds of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the seconds
	 *
	 * @example
	 * // Get the seconds of 29 February 2012 11:45:05.123:
	 * var result = getSeconds(new Date(2012, 1, 29, 11, 45, 5, 123))
	 * //=> 5
	 */
	function getSeconds (dirtyDate) {
	  var date = parse$47(dirtyDate)
	  var seconds = date.getSeconds()
	  return seconds
	}

	var __moduleExports$82 = getSeconds

	var parse$48 = __moduleExports$3

	/**
	 * @category Timestamp Helpers
	 * @summary Get the milliseconds timestamp of the given date.
	 *
	 * @description
	 * Get the milliseconds timestamp of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the timestamp
	 *
	 * @example
	 * // Get the timestamp of 29 February 2012 11:45:05.123:
	 * var result = getTime(new Date(2012, 1, 29, 11, 45, 5, 123))
	 * //=> 1330515905123
	 */
	function getTime (dirtyDate) {
	  var date = parse$48(dirtyDate)
	  var timestamp = date.getTime()
	  return timestamp
	}

	var __moduleExports$83 = getTime

	var parse$49 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Get the year of the given date.
	 *
	 * @description
	 * Get the year of the given date.
	 *
	 * @param {Date|String|Number} date - the given date
	 * @returns {Number} the year
	 *
	 * @example
	 * // Which year is 2 July 2014?
	 * var result = getYear(new Date(2014, 6, 2))
	 * //=> 2014
	 */
	function getYear (dirtyDate) {
	  var date = parse$49(dirtyDate)
	  var year = date.getFullYear()
	  return year
	}

	var __moduleExports$84 = getYear

	var parse$50 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Is the first date after the second one?
	 *
	 * @description
	 * Is the first date after the second one?
	 *
	 * @param {Date|String|Number} date - the date that should be after the other one to return true
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @returns {Boolean} the first date is after the second date
	 *
	 * @example
	 * // Is 10 July 1989 after 11 February 1987?
	 * var result = isAfter(new Date(1989, 6, 10), new Date(1987, 1, 11))
	 * //=> true
	 */
	function isAfter (dirtyDate, dirtyDateToCompare) {
	  var date = parse$50(dirtyDate)
	  var dateToCompare = parse$50(dirtyDateToCompare)
	  return date.getTime() > dateToCompare.getTime()
	}

	var __moduleExports$85 = isAfter

	var parse$51 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Is the first date before the second one?
	 *
	 * @description
	 * Is the first date before the second one?
	 *
	 * @param {Date|String|Number} date - the date that should be before the other one to return true
	 * @param {Date|String|Number} dateToCompare - the date to compare with
	 * @returns {Boolean} the first date is before the second date
	 *
	 * @example
	 * // Is 10 July 1989 before 11 February 1987?
	 * var result = isBefore(new Date(1989, 6, 10), new Date(1987, 1, 11))
	 * //=> false
	 */
	function isBefore (dirtyDate, dirtyDateToCompare) {
	  var date = parse$51(dirtyDate)
	  var dateToCompare = parse$51(dirtyDateToCompare)
	  return date.getTime() < dateToCompare.getTime()
	}

	var __moduleExports$86 = isBefore

	var parse$52 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Are the given dates equal?
	 *
	 * @description
	 * Are the given dates equal?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to compare
	 * @param {Date|String|Number} dateRight - the second date to compare
	 * @returns {Boolean} the dates are equal
	 *
	 * @example
	 * // Are 2 July 2014 06:30:45.000 and 2 July 2014 06:30:45.500 equal?
	 * var result = isEqual(
	 *   new Date(2014, 6, 2, 6, 30, 45, 0)
	 *   new Date(2014, 6, 2, 6, 30, 45, 500)
	 * )
	 * //=> false
	 */
	function isEqual (dirtyLeftDate, dirtyRightDate) {
	  var dateLeft = parse$52(dirtyLeftDate)
	  var dateRight = parse$52(dirtyRightDate)
	  return dateLeft.getTime() === dateRight.getTime()
	}

	var __moduleExports$87 = isEqual

	var parse$53 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Is the given date the first day of a month?
	 *
	 * @description
	 * Is the given date the first day of a month?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is the first day of a month
	 *
	 * @example
	 * // Is 1 September 2014 the first day of a month?
	 * var result = isFirstDayOfMonth(new Date(2014, 8, 1))
	 * //=> true
	 */
	function isFirstDayOfMonth (dirtyDate) {
	  return parse$53(dirtyDate).getDate() === 1
	}

	var __moduleExports$88 = isFirstDayOfMonth

	var parse$54 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Friday?
	 *
	 * @description
	 * Is the given date Friday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Friday
	 *
	 * @example
	 * // Is 26 September 2014 Friday?
	 * var result = isFriday(new Date(2014, 8, 26))
	 * //=> true
	 */
	function isFriday (dirtyDate) {
	  return parse$54(dirtyDate).getDay() === 5
	}

	var __moduleExports$89 = isFriday

	var parse$55 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Is the given date in the future?
	 *
	 * @description
	 * Is the given date in the future?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in the future
	 *
	 * @example
	 * // If today is 6 October 2014, is 31 December 2014 in the future?
	 * var result = isFuture(new Date(2014, 11, 31))
	 * //=> true
	 */
	function isFuture (dirtyDate) {
	  return parse$55(dirtyDate).getTime() > new Date().getTime()
	}

	var __moduleExports$90 = isFuture

	var parse$56 = __moduleExports$3
	var endOfDay$2 = __moduleExports$53
	var endOfMonth$1 = __moduleExports$59

	/**
	 * @category Month Helpers
	 * @summary Is the given date the last day of a month?
	 *
	 * @description
	 * Is the given date the last day of a month?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is the last day of a month
	 *
	 * @example
	 * // Is 28 February 2014 the last day of a month?
	 * var result = isLastDayOfMonth(new Date(2014, 1, 28))
	 * //=> true
	 */
	function isLastDayOfMonth (dirtyDate) {
	  var date = parse$56(dirtyDate)
	  return endOfDay$2(date).getTime() === endOfMonth$1(date).getTime()
	}

	var __moduleExports$91 = isLastDayOfMonth

	var parse$57 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Monday?
	 *
	 * @description
	 * Is the given date Monday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Monday
	 *
	 * @example
	 * // Is 22 September 2014 Monday?
	 * var result = isMonday(new Date(2014, 8, 22))
	 * //=> true
	 */
	function isMonday (dirtyDate) {
	  return parse$57(dirtyDate).getDay() === 1
	}

	var __moduleExports$92 = isMonday

	var parse$58 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Is the given date in the past?
	 *
	 * @description
	 * Is the given date in the past?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in the past
	 *
	 * @example
	 * // If today is 6 October 2014, is 2 July 2014 in the past?
	 * var result = isPast(new Date(2014, 6, 2))
	 * //=> true
	 */
	function isPast (dirtyDate) {
	  return parse$58(dirtyDate).getTime() < new Date().getTime()
	}

	var __moduleExports$93 = isPast

	var startOfDay$2 = __moduleExports$14

	/**
	 * @category Day Helpers
	 * @summary Are the given dates in the same day?
	 *
	 * @description
	 * Are the given dates in the same day?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same day
	 *
	 * @example
	 * // Are 4 September 06:00:00 and 4 September 18:00:00 in the same day?
	 * var result = isSameDay(
	 *   new Date(2014, 8, 4, 6, 0),
	 *   new Date(2014, 8, 4, 18, 0)
	 * )
	 * //=> true
	 */
	function isSameDay (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfDay = startOfDay$2(dirtyDateLeft)
	  var dateRightStartOfDay = startOfDay$2(dirtyDateRight)

	  return dateLeftStartOfDay.getTime() === dateRightStartOfDay.getTime()
	}

	var __moduleExports$94 = isSameDay

	var parse$59 = __moduleExports$3

	/**
	 * @category Hour Helpers
	 * @summary Return the start of an hour for the given date.
	 *
	 * @description
	 * Return the start of an hour for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of an hour
	 *
	 * @example
	 * // The start of an hour for 2 September 2014 11:55:00:
	 * var result = startOfHour(new Date(2014, 8, 2, 11, 55))
	 * //=> Tue Sep 02 2014 11:00:00
	 */
	function startOfHour$1 (dirtyDate) {
	  var date = parse$59(dirtyDate)
	  date.setMinutes(0, 0, 0)
	  return date
	}

	var __moduleExports$96 = startOfHour$1

	var startOfHour = __moduleExports$96

	/**
	 * @category Hour Helpers
	 * @summary Are the given dates in the same hour?
	 *
	 * @description
	 * Are the given dates in the same hour?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same hour
	 *
	 * @example
	 * // Are 4 September 2014 06:00:00 and 4 September 06:30:00 in the same hour?
	 * var result = isSameHour(
	 *   new Date(2014, 8, 4, 6, 0),
	 *   new Date(2014, 8, 4, 6, 30)
	 * )
	 * //=> true
	 */
	function isSameHour (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfHour = startOfHour(dirtyDateLeft)
	  var dateRightStartOfHour = startOfHour(dirtyDateRight)

	  return dateLeftStartOfHour.getTime() === dateRightStartOfHour.getTime()
	}

	var __moduleExports$95 = isSameHour

	var startOfWeek$3 = __moduleExports$10

	/**
	 * @category Week Helpers
	 * @summary Are the given dates in the same week?
	 *
	 * @description
	 * Are the given dates in the same week?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Boolean} the dates are in the same week
	 *
	 * @example
	 * // Are 31 August 2014 and 4 September 2014 in the same week?
	 * var result = isSameWeek(
	 *   new Date(2014, 7, 31),
	 *   new Date(2014, 8, 4)
	 * )
	 * //=> true
	 *
	 * @example
	 * // If week starts with Monday,
	 * // are 31 August 2014 and 4 September 2014 in the same week?
	 * var result = isSameWeek(
	 *   new Date(2014, 7, 31),
	 *   new Date(2014, 8, 4),
	 *   {weekStartsOn: 1}
	 * )
	 * //=> false
	 */
	function isSameWeek$1 (dirtyDateLeft, dirtyDateRight, dirtyOptions) {
	  var dateLeftStartOfWeek = startOfWeek$3(dirtyDateLeft, dirtyOptions)
	  var dateRightStartOfWeek = startOfWeek$3(dirtyDateRight, dirtyOptions)

	  return dateLeftStartOfWeek.getTime() === dateRightStartOfWeek.getTime()
	}

	var __moduleExports$98 = isSameWeek$1

	var isSameWeek = __moduleExports$98

	/**
	 * @category ISO Week Helpers
	 * @summary Are the given dates in the same ISO week?
	 *
	 * @description
	 * Are the given dates in the same ISO week?
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same ISO week
	 *
	 * @example
	 * // Are 1 September 2014 and 7 September 2014 in the same ISO week?
	 * var result = isSameISOWeek(
	 *   new Date(2014, 8, 1),
	 *   new Date(2014, 8, 7)
	 * )
	 * //=> true
	 */
	function isSameISOWeek (dirtyDateLeft, dirtyDateRight) {
	  return isSameWeek(dirtyDateLeft, dirtyDateRight, {weekStartsOn: 1})
	}

	var __moduleExports$97 = isSameISOWeek

	var startOfISOYear$4 = __moduleExports$12

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Are the given dates in the same ISO week-numbering year?
	 *
	 * @description
	 * Are the given dates in the same ISO week-numbering year?
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same ISO week-numbering year
	 *
	 * @example
	 * // Are 29 December 2003 and 2 January 2005 in the same ISO week-numbering year?
	 * var result = isSameISOYear(
	 *   new Date(2003, 11, 29),
	 *   new Date(2005, 0, 2)
	 * )
	 * //=> true
	 */
	function isSameISOYear (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfYear = startOfISOYear$4(dirtyDateLeft)
	  var dateRightStartOfYear = startOfISOYear$4(dirtyDateRight)

	  return dateLeftStartOfYear.getTime() === dateRightStartOfYear.getTime()
	}

	var __moduleExports$99 = isSameISOYear

	var parse$60 = __moduleExports$3

	/**
	 * @category Minute Helpers
	 * @summary Return the start of a minute for the given date.
	 *
	 * @description
	 * Return the start of a minute for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a minute
	 *
	 * @example
	 * // The start of a minute for 1 December 2014 22:15:45.400:
	 * var result = startOfMinute(new Date(2014, 11, 1, 22, 15, 45, 400))
	 * //=> Mon Dec 01 2014 22:15:00
	 */
	function startOfMinute$1 (dirtyDate) {
	  var date = parse$60(dirtyDate)
	  date.setSeconds(0, 0)
	  return date
	}

	var __moduleExports$101 = startOfMinute$1

	var startOfMinute = __moduleExports$101

	/**
	 * @category Minute Helpers
	 * @summary Are the given dates in the same minute?
	 *
	 * @description
	 * Are the given dates in the same minute?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same minute
	 *
	 * @example
	 * // Are 4 September 2014 06:30:00 and 4 September 2014 06:30:15
	 * // in the same minute?
	 * var result = isSameMinute(
	 *   new Date(2014, 8, 4, 6, 30),
	 *   new Date(2014, 8, 4, 6, 30, 15)
	 * )
	 * //=> true
	 */
	function isSameMinute (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfMinute = startOfMinute(dirtyDateLeft)
	  var dateRightStartOfMinute = startOfMinute(dirtyDateRight)

	  return dateLeftStartOfMinute.getTime() === dateRightStartOfMinute.getTime()
	}

	var __moduleExports$100 = isSameMinute

	var parse$61 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Are the given dates in the same month?
	 *
	 * @description
	 * Are the given dates in the same month?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same month
	 *
	 * @example
	 * // Are 2 September 2014 and 25 September 2014 in the same month?
	 * var result = isSameMonth(
	 *   new Date(2014, 8, 2),
	 *   new Date(2014, 8, 25)
	 * )
	 * //=> true
	 */
	function isSameMonth (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$61(dirtyDateLeft)
	  var dateRight = parse$61(dirtyDateRight)
	  return dateLeft.getFullYear() === dateRight.getFullYear() &&
	    dateLeft.getMonth() === dateRight.getMonth()
	}

	var __moduleExports$102 = isSameMonth

	var parse$62 = __moduleExports$3

	/**
	 * @category Quarter Helpers
	 * @summary Return the start of a year quarter for the given date.
	 *
	 * @description
	 * Return the start of a year quarter for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a quarter
	 *
	 * @example
	 * // The start of a quarter for 2 September 2014 11:55:00:
	 * var result = startOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Jul 01 2014 00:00:00
	 */
	function startOfQuarter$1 (dirtyDate) {
	  var date = parse$62(dirtyDate)
	  var currentMonth = date.getMonth()
	  var month = currentMonth - currentMonth % 3
	  date.setMonth(month, 1)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$104 = startOfQuarter$1

	var startOfQuarter = __moduleExports$104

	/**
	 * @category Quarter Helpers
	 * @summary Are the given dates in the same year quarter?
	 *
	 * @description
	 * Are the given dates in the same year quarter?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same quarter
	 *
	 * @example
	 * // Are 1 January 2014 and 8 March 2014 in the same quarter?
	 * var result = isSameQuarter(
	 *   new Date(2014, 0, 1),
	 *   new Date(2014, 2, 8)
	 * )
	 * //=> true
	 */
	function isSameQuarter (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfQuarter = startOfQuarter(dirtyDateLeft)
	  var dateRightStartOfQuarter = startOfQuarter(dirtyDateRight)

	  return dateLeftStartOfQuarter.getTime() === dateRightStartOfQuarter.getTime()
	}

	var __moduleExports$103 = isSameQuarter

	var parse$63 = __moduleExports$3

	/**
	 * @category Second Helpers
	 * @summary Return the start of a second for the given date.
	 *
	 * @description
	 * Return the start of a second for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a second
	 *
	 * @example
	 * // The start of a second for 1 December 2014 22:15:45.400:
	 * var result = startOfSecond(new Date(2014, 11, 1, 22, 15, 45, 400))
	 * //=> Mon Dec 01 2014 22:15:45.000
	 */
	function startOfSecond$1 (dirtyDate) {
	  var date = parse$63(dirtyDate)
	  date.setMilliseconds(0)
	  return date
	}

	var __moduleExports$106 = startOfSecond$1

	var startOfSecond = __moduleExports$106

	/**
	 * @category Second Helpers
	 * @summary Are the given dates in the same second?
	 *
	 * @description
	 * Are the given dates in the same second?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same second
	 *
	 * @example
	 * // Are 4 September 2014 06:30:15.000 and 4 September 2014 06:30.15.500
	 * // in the same second?
	 * var result = isSameSecond(
	 *   new Date(2014, 8, 4, 6, 30, 15),
	 *   new Date(2014, 8, 4, 6, 30, 15, 500)
	 * )
	 * //=> true
	 */
	function isSameSecond (dirtyDateLeft, dirtyDateRight) {
	  var dateLeftStartOfSecond = startOfSecond(dirtyDateLeft)
	  var dateRightStartOfSecond = startOfSecond(dirtyDateRight)

	  return dateLeftStartOfSecond.getTime() === dateRightStartOfSecond.getTime()
	}

	var __moduleExports$105 = isSameSecond

	var parse$64 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Are the given dates in the same year?
	 *
	 * @description
	 * Are the given dates in the same year?
	 *
	 * @param {Date|String|Number} dateLeft - the first date to check
	 * @param {Date|String|Number} dateRight - the second date to check
	 * @returns {Boolean} the dates are in the same year
	 *
	 * @example
	 * // Are 2 September 2014 and 25 September 2014 in the same year?
	 * var result = isSameYear(
	 *   new Date(2014, 8, 2),
	 *   new Date(2014, 8, 25)
	 * )
	 * //=> true
	 */
	function isSameYear (dirtyDateLeft, dirtyDateRight) {
	  var dateLeft = parse$64(dirtyDateLeft)
	  var dateRight = parse$64(dirtyDateRight)
	  return dateLeft.getFullYear() === dateRight.getFullYear()
	}

	var __moduleExports$107 = isSameYear

	var parse$65 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Saturday?
	 *
	 * @description
	 * Is the given date Saturday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Saturday
	 *
	 * @example
	 * // Is 27 September 2014 Saturday?
	 * var result = isSaturday(new Date(2014, 8, 27))
	 * //=> true
	 */
	function isSaturday (dirtyDate) {
	  return parse$65(dirtyDate).getDay() === 6
	}

	var __moduleExports$108 = isSaturday

	var parse$66 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Sunday?
	 *
	 * @description
	 * Is the given date Sunday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Sunday
	 *
	 * @example
	 * // Is 21 September 2014 Sunday?
	 * var result = isSunday(new Date(2014, 8, 21))
	 * //=> true
	 */
	function isSunday (dirtyDate) {
	  return parse$66(dirtyDate).getDay() === 0
	}

	var __moduleExports$109 = isSunday

	var isSameHour$1 = __moduleExports$95

	/**
	 * @category Hour Helpers
	 * @summary Is the given date in the same hour as the current date?
	 *
	 * @description
	 * Is the given date in the same hour as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this hour
	 *
	 * @example
	 * // If now is 25 September 2014 18:30:15.500,
	 * // is 25 September 2014 18:00:00 in this hour?
	 * var result = isThisHour(new Date(2014, 8, 25, 18))
	 * //=> true
	 */
	function isThisHour (dirtyDate) {
	  return isSameHour$1(new Date(), dirtyDate)
	}

	var __moduleExports$110 = isThisHour

	var isSameISOWeek$1 = __moduleExports$97

	/**
	 * @category ISO Week Helpers
	 * @summary Is the given date in the same ISO week as the current date?
	 *
	 * @description
	 * Is the given date in the same ISO week as the current date?
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this ISO week
	 *
	 * @example
	 * // If today is 25 September 2014, is 22 September 2014 in this ISO week?
	 * var result = isThisISOWeek(new Date(2014, 8, 22))
	 * //=> true
	 */
	function isThisISOWeek (dirtyDate) {
	  return isSameISOWeek$1(new Date(), dirtyDate)
	}

	var __moduleExports$111 = isThisISOWeek

	var isSameISOYear$1 = __moduleExports$99

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Is the given date in the same ISO week-numbering year as the current date?
	 *
	 * @description
	 * Is the given date in the same ISO week-numbering year as the current date?
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this ISO week-numbering year
	 *
	 * @example
	 * // If today is 25 September 2014,
	 * // is 30 December 2013 in this ISO week-numbering year?
	 * var result = isThisISOYear(new Date(2013, 11, 30))
	 * //=> true
	 */
	function isThisISOYear (dirtyDate) {
	  return isSameISOYear$1(new Date(), dirtyDate)
	}

	var __moduleExports$112 = isThisISOYear

	var isSameMinute$1 = __moduleExports$100

	/**
	 * @category Minute Helpers
	 * @summary Is the given date in the same minute as the current date?
	 *
	 * @description
	 * Is the given date in the same minute as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this minute
	 *
	 * @example
	 * // If now is 25 September 2014 18:30:15.500,
	 * // is 25 September 2014 18:30:00 in this minute?
	 * var result = isThisMinute(new Date(2014, 8, 25, 18, 30))
	 * //=> true
	 */
	function isThisMinute (dirtyDate) {
	  return isSameMinute$1(new Date(), dirtyDate)
	}

	var __moduleExports$113 = isThisMinute

	var isSameMonth$1 = __moduleExports$102

	/**
	 * @category Month Helpers
	 * @summary Is the given date in the same month as the current date?
	 *
	 * @description
	 * Is the given date in the same month as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this month
	 *
	 * @example
	 * // If today is 25 September 2014, is 15 September 2014 in this month?
	 * var result = isThisMonth(new Date(2014, 8, 15))
	 * //=> true
	 */
	function isThisMonth (dirtyDate) {
	  return isSameMonth$1(new Date(), dirtyDate)
	}

	var __moduleExports$114 = isThisMonth

	var isSameQuarter$1 = __moduleExports$103

	/**
	 * @category Quarter Helpers
	 * @summary Is the given date in the same quarter as the current date?
	 *
	 * @description
	 * Is the given date in the same quarter as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this quarter
	 *
	 * @example
	 * // If today is 25 September 2014, is 2 July 2014 in this quarter?
	 * var result = isThisQuarter(new Date(2014, 6, 2))
	 * //=> true
	 */
	function isThisQuarter (dirtyDate) {
	  return isSameQuarter$1(new Date(), dirtyDate)
	}

	var __moduleExports$115 = isThisQuarter

	var isSameSecond$1 = __moduleExports$105

	/**
	 * @category Second Helpers
	 * @summary Is the given date in the same second as the current date?
	 *
	 * @description
	 * Is the given date in the same second as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this second
	 *
	 * @example
	 * // If now is 25 September 2014 18:30:15.500,
	 * // is 25 September 2014 18:30:15.000 in this second?
	 * var result = isThisSecond(new Date(2014, 8, 25, 18, 30, 15))
	 * //=> true
	 */
	function isThisSecond (dirtyDate) {
	  return isSameSecond$1(new Date(), dirtyDate)
	}

	var __moduleExports$116 = isThisSecond

	var isSameWeek$2 = __moduleExports$98

	/**
	 * @category Week Helpers
	 * @summary Is the given date in the same week as the current date?
	 *
	 * @description
	 * Is the given date in the same week as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Boolean} the date is in this week
	 *
	 * @example
	 * // If today is 25 September 2014, is 21 September 2014 in this week?
	 * var result = isThisWeek(new Date(2014, 8, 21))
	 * //=> true
	 *
	 * @example
	 * // If today is 25 September 2014 and week starts with Monday
	 * // is 21 September 2014 in this week?
	 * var result = isThisWeek(new Date(2014, 8, 21), {weekStartsOn: 1})
	 * //=> false
	 */
	function isThisWeek (dirtyDate, dirtyOptions) {
	  return isSameWeek$2(new Date(), dirtyDate, dirtyOptions)
	}

	var __moduleExports$117 = isThisWeek

	var isSameYear$1 = __moduleExports$107

	/**
	 * @category Year Helpers
	 * @summary Is the given date in the same year as the current date?
	 *
	 * @description
	 * Is the given date in the same year as the current date?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is in this year
	 *
	 * @example
	 * // If today is 25 September 2014, is 2 July 2014 in this year?
	 * var result = isThisYear(new Date(2014, 6, 2))
	 * //=> true
	 */
	function isThisYear (dirtyDate) {
	  return isSameYear$1(new Date(), dirtyDate)
	}

	var __moduleExports$118 = isThisYear

	var parse$67 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Thursday?
	 *
	 * @description
	 * Is the given date Thursday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Thursday
	 *
	 * @example
	 * // Is 25 September 2014 Thursday?
	 * var result = isThursday(new Date(2014, 8, 25))
	 * //=> true
	 */
	function isThursday (dirtyDate) {
	  return parse$67(dirtyDate).getDay() === 4
	}

	var __moduleExports$119 = isThursday

	var startOfDay$3 = __moduleExports$14

	/**
	 * @category Day Helpers
	 * @summary Is the given date today?
	 *
	 * @description
	 * Is the given date today?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is today
	 *
	 * @example
	 * // If today is 6 October 2014, is 6 October 14:00:00 today?
	 * var result = isToday(new Date(2014, 9, 6, 14, 0))
	 * //=> true
	 */
	function isToday (dirtyDate) {
	  return startOfDay$3(dirtyDate).getTime() === startOfDay$3(new Date()).getTime()
	}

	var __moduleExports$120 = isToday

	var startOfDay$4 = __moduleExports$14

	/**
	 * @category Day Helpers
	 * @summary Is the given date tomorrow?
	 *
	 * @description
	 * Is the given date tomorrow?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is tomorrow
	 *
	 * @example
	 * // If today is 6 October 2014, is 7 October 14:00:00 tomorrow?
	 * var result = isTomorrow(new Date(2014, 9, 7, 14, 0))
	 * //=> true
	 */
	function isTomorrow (dirtyDate) {
	  var tomorrow = new Date()
	  tomorrow.setDate(tomorrow.getDate() + 1)
	  return startOfDay$4(dirtyDate).getTime() === startOfDay$4(tomorrow).getTime()
	}

	var __moduleExports$121 = isTomorrow

	var parse$68 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Tuesday?
	 *
	 * @description
	 * Is the given date Tuesday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Tuesday
	 *
	 * @example
	 * // Is 23 September 2014 Tuesday?
	 * var result = isTuesday(new Date(2014, 8, 23))
	 * //=> true
	 */
	function isTuesday (dirtyDate) {
	  return parse$68(dirtyDate).getDay() === 2
	}

	var __moduleExports$122 = isTuesday

	var parse$69 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Is the given date Wednesday?
	 *
	 * @description
	 * Is the given date Wednesday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is Wednesday
	 *
	 * @example
	 * // Is 24 September 2014 Wednesday?
	 * var result = isWednesday(new Date(2014, 8, 24))
	 * //=> true
	 */
	function isWednesday (dirtyDate) {
	  return parse$69(dirtyDate).getDay() === 3
	}

	var __moduleExports$123 = isWednesday

	var parse$70 = __moduleExports$3

	/**
	 * @category Weekday Helpers
	 * @summary Does the given date fall on a weekend?
	 *
	 * @description
	 * Does the given date fall on a weekend?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date falls on a weekend
	 *
	 * @example
	 * // Does 5 October 2014 fall on a weekend?
	 * var result = isWeekend(new Date(2014, 9, 5))
	 * //=> true
	 */
	function isWeekend (dirtyDate) {
	  var date = parse$70(dirtyDate)
	  var day = date.getDay()
	  return day === 0 || day === 6
	}

	var __moduleExports$124 = isWeekend

	var parse$71 = __moduleExports$3

	/**
	 * @category Range Helpers
	 * @summary Is the given date within the range?
	 *
	 * @description
	 * Is the given date within the range?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @param {Date|String|Number} startDate - the start of range
	 * @param {Date|String|Number} endDate - the end of range
	 * @returns {Boolean} the date is within the range
	 * @throws {Error} startDate cannot be after endDate
	 *
	 * @example
	 * // For the date within the range:
	 * isWithinRange(
	 *   new Date(2014, 0, 3), new Date(2014, 0, 1), new Date(2014, 0, 7)
	 * )
	 * //=> true
	 *
	 * @example
	 * // For the date outside of the range:
	 * isWithinRange(
	 *   new Date(2014, 0, 10), new Date(2014, 0, 1), new Date(2014, 0, 7)
	 * )
	 * //=> false
	 */
	function isWithinRange (dirtyDate, dirtyStartDate, dirtyEndDate) {
	  var time = parse$71(dirtyDate).getTime()
	  var startTime = parse$71(dirtyStartDate).getTime()
	  var endTime = parse$71(dirtyEndDate).getTime()

	  if (startTime > endTime) {
	    throw new Error('The start of the range cannot be after the end of the range')
	  }

	  return time >= startTime && time <= endTime
	}

	var __moduleExports$125 = isWithinRange

	var startOfDay$5 = __moduleExports$14

	/**
	 * @category Day Helpers
	 * @summary Is the given date yesterday?
	 *
	 * @description
	 * Is the given date yesterday?
	 *
	 * @param {Date|String|Number} date - the date to check
	 * @returns {Boolean} the date is yesterday
	 *
	 * @example
	 * // If today is 6 October 2014, is 5 October 14:00:00 yesterday?
	 * var result = isYesterday(new Date(2014, 9, 5, 14, 0))
	 * //=> true
	 */
	function isYesterday (dirtyDate) {
	  var yesterday = new Date()
	  yesterday.setDate(yesterday.getDate() - 1)
	  return startOfDay$5(dirtyDate).getTime() === startOfDay$5(yesterday).getTime()
	}

	var __moduleExports$126 = isYesterday

	var parse$72 = __moduleExports$3

	/**
	 * @category Week Helpers
	 * @summary Return the last day of a week for the given date.
	 *
	 * @description
	 * Return the last day of a week for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Date} the last day of a week
	 *
	 * @example
	 * // The last day of a week for 2 September 2014 11:55:00:
	 * var result = lastDayOfWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Sat Sep 06 2014 00:00:00
	 *
	 * @example
	 * // If the week starts on Monday, the last day of the week for 2 September 2014 11:55:00:
	 * var result = lastDayOfWeek(new Date(2014, 8, 2, 11, 55, 0), {weekStartsOn: 1})
	 * //=> Sun Sep 07 2014 00:00:00
	 */
	function lastDayOfWeek$1 (dirtyDate, dirtyOptions) {
	  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0

	  var date = parse$72(dirtyDate)
	  var day = date.getDay()
	  var diff = (day < weekStartsOn ? -7 : 0) + 6 - (day - weekStartsOn)

	  date.setHours(0, 0, 0, 0)
	  date.setDate(date.getDate() + diff)
	  return date
	}

	var __moduleExports$128 = lastDayOfWeek$1

	var lastDayOfWeek = __moduleExports$128

	/**
	 * @category ISO Week Helpers
	 * @summary Return the last day of an ISO week for the given date.
	 *
	 * @description
	 * Return the last day of an ISO week for the given date.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the last day of an ISO week
	 *
	 * @example
	 * // The last day of an ISO week for 2 September 2014 11:55:00:
	 * var result = lastDayOfISOWeek(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Sun Sep 07 2014 00:00:00
	 */
	function lastDayOfISOWeek (dirtyDate) {
	  return lastDayOfWeek(dirtyDate, {weekStartsOn: 1})
	}

	var __moduleExports$127 = lastDayOfISOWeek

	var getISOYear$6 = __moduleExports$8
	var startOfISOWeek$6 = __moduleExports$9

	/**
	 * @category ISO Week-Numbering Year Helpers
	 * @summary Return the last day of an ISO week-numbering year for the given date.
	 *
	 * @description
	 * Return the last day of an ISO week-numbering year,
	 * which always starts 3 days before the year's first Thursday.
	 * The result will be in the local timezone.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the end of an ISO week-numbering year
	 *
	 * @example
	 * // The last day of an ISO week-numbering year for 2 July 2005:
	 * var result = lastDayOfISOYear(new Date(2005, 6, 2))
	 * //=> Sun Jan 01 2006 00:00:00
	 */
	function lastDayOfISOYear (dirtyDate) {
	  var year = getISOYear$6(dirtyDate)
	  var fourthOfJanuary = new Date(0)
	  fourthOfJanuary.setFullYear(year + 1, 0, 4)
	  fourthOfJanuary.setHours(0, 0, 0, 0)
	  var date = startOfISOWeek$6(fourthOfJanuary)
	  date.setDate(date.getDate() - 1)
	  return date
	}

	var __moduleExports$129 = lastDayOfISOYear

	var parse$73 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Return the last day of a month for the given date.
	 *
	 * @description
	 * Return the last day of a month for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the last day of a month
	 *
	 * @example
	 * // The last day of a month for 2 September 2014 11:55:00:
	 * var result = lastDayOfMonth(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 30 2014 00:00:00
	 */
	function lastDayOfMonth (dirtyDate) {
	  var date = parse$73(dirtyDate)
	  var month = date.getMonth()
	  date.setFullYear(date.getFullYear(), month + 1, 0)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$130 = lastDayOfMonth

	var parse$74 = __moduleExports$3

	/**
	 * @category Quarter Helpers
	 * @summary Return the last day of a year quarter for the given date.
	 *
	 * @description
	 * Return the last day of a year quarter for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the last day of a quarter
	 *
	 * @example
	 * // The last day of a quarter for 2 September 2014 11:55:00:
	 * var result = lastDayOfQuarter(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Tue Sep 30 2014 00:00:00
	 */
	function lastDayOfQuarter (dirtyDate) {
	  var date = parse$74(dirtyDate)
	  var currentMonth = date.getMonth()
	  var month = currentMonth - currentMonth % 3 + 3
	  date.setMonth(month, 0)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$131 = lastDayOfQuarter

	var parse$75 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Return the last day of a year for the given date.
	 *
	 * @description
	 * Return the last day of a year for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the last day of a year
	 *
	 * @example
	 * // The last day of a year for 2 September 2014 11:55:00:
	 * var result = lastDayOfYear(new Date(2014, 8, 2, 11, 55, 00))
	 * //=> Wed Dec 31 2014 00:00:00
	 */
	function lastDayOfYear (dirtyDate) {
	  var date = parse$75(dirtyDate)
	  var year = date.getFullYear()
	  date.setFullYear(year + 1, 0, 0)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$132 = lastDayOfYear

	var parse$76 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Return the latest of the given dates.
	 *
	 * @description
	 * Return the latest of the given dates.
	 *
	 * @param {...(Date|String|Number)} dates - the dates to compare
	 * @returns {Date} the latest of the dates
	 *
	 * @example
	 * // Which of these dates is the latest?
	 * var result = max(
	 *   new Date(1989, 6, 10),
	 *   new Date(1987, 1, 11),
	 *   new Date(1995, 6, 2),
	 *   new Date(1990, 0, 1)
	 * )
	 * //=> Sun Jul 02 1995 00:00:00
	 */
	function max () {
	  var dirtyDates = Array.prototype.slice.call(arguments)
	  var dates = dirtyDates.map(function (dirtyDate) {
	    return parse$76(dirtyDate)
	  })
	  var latestTimestamp = Math.max.apply(null, dates)
	  return new Date(latestTimestamp)
	}

	var __moduleExports$133 = max

	var parse$77 = __moduleExports$3

	/**
	 * @category Common Helpers
	 * @summary Return the earliest of the given dates.
	 *
	 * @description
	 * Return the earliest of the given dates.
	 *
	 * @param {...(Date|String|Number)} dates - the dates to compare
	 * @returns {Date} the earliest of the dates
	 *
	 * @example
	 * // Which of these dates is the earliest?
	 * var result = min(
	 *   new Date(1989, 6, 10),
	 *   new Date(1987, 1, 11),
	 *   new Date(1995, 6, 2),
	 *   new Date(1990, 0, 1)
	 * )
	 * //=> Wed Feb 11 1987 00:00:00
	 */
	function min () {
	  var dirtyDates = Array.prototype.slice.call(arguments)
	  var dates = dirtyDates.map(function (dirtyDate) {
	    return parse$77(dirtyDate)
	  })
	  var earliestTimestamp = Math.min.apply(null, dates)
	  return new Date(earliestTimestamp)
	}

	var __moduleExports$134 = min

	var parse$78 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Set the day of the month to the given date.
	 *
	 * @description
	 * Set the day of the month to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} dayOfMonth - the day of the month of the new date
	 * @returns {Date} the new date with the day of the month setted
	 *
	 * @example
	 * // Set the 30th day of the month to 1 September 2014:
	 * var result = setDate(new Date(2014, 8, 1), 30)
	 * //=> Tue Sep 30 2014 00:00:00
	 */
	function setDate (dirtyDate, dirtyDayOfMonth) {
	  var date = parse$78(dirtyDate)
	  var dayOfMonth = Number(dirtyDayOfMonth)
	  date.setDate(dayOfMonth)
	  return date
	}

	var __moduleExports$135 = setDate

	var parse$79 = __moduleExports$3
	var addDays$2 = __moduleExports$2

	/**
	 * @category Weekday Helpers
	 * @summary Set the day of the week to the given date.
	 *
	 * @description
	 * Set the day of the week to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} day - the day of the week of the new date
	 * @param {Object} [options] - the object with options
	 * @param {Number} [options.weekStartsOn=0] - the index of the first day of the week (0 - Sunday)
	 * @returns {Date} the new date with the day of the week setted
	 *
	 * @example
	 * // Set Sunday to 1 September 2014:
	 * var result = setDay(new Date(2014, 8, 1), 0)
	 * //=> Sun Aug 31 2014 00:00:00
	 *
	 * @example
	 * // If week starts with Monday, set Sunday to 1 September 2014:
	 * var result = setDay(new Date(2014, 8, 1), 0, {weekStartsOn: 1})
	 * //=> Sun Sep 07 2014 00:00:00
	 */
	function setDay$1 (dirtyDate, dirtyDay, dirtyOptions) {
	  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0
	  var date = parse$79(dirtyDate)
	  var day = Number(dirtyDay)
	  var currentDay = date.getDay()

	  var remainder = day % 7
	  var dayIndex = (remainder + 7) % 7

	  var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay
	  return addDays$2(date, diff)
	}

	var __moduleExports$136 = setDay$1

	var parse$80 = __moduleExports$3

	/**
	 * @category Day Helpers
	 * @summary Set the day of the year to the given date.
	 *
	 * @description
	 * Set the day of the year to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} dayOfYear - the day of the year of the new date
	 * @returns {Date} the new date with the day of the year setted
	 *
	 * @example
	 * // Set the 2nd day of the year to 2 July 2014:
	 * var result = setDayOfYear(new Date(2014, 6, 2), 2)
	 * //=> Thu Jan 02 2014 00:00:00
	 */
	function setDayOfYear (dirtyDate, dirtyDayOfYear) {
	  var date = parse$80(dirtyDate)
	  var dayOfYear = Number(dirtyDayOfYear)
	  date.setMonth(0)
	  date.setDate(dayOfYear)
	  return date
	}

	var __moduleExports$137 = setDayOfYear

	var parse$81 = __moduleExports$3

	/**
	 * @category Hour Helpers
	 * @summary Set the hours to the given date.
	 *
	 * @description
	 * Set the hours to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} hours - the hours of the new date
	 * @returns {Date} the new date with the hours setted
	 *
	 * @example
	 * // Set 4 hours to 1 September 2014 11:30:00:
	 * var result = setHours(new Date(2014, 8, 1, 11, 30), 4)
	 * //=> Mon Sep 01 2014 04:30:00
	 */
	function setHours (dirtyDate, dirtyHours) {
	  var date = parse$81(dirtyDate)
	  var hours = Number(dirtyHours)
	  date.setHours(hours)
	  return date
	}

	var __moduleExports$138 = setHours

	var parse$82 = __moduleExports$3
	var addDays$3 = __moduleExports$2
	var getISODay$1 = __moduleExports$76

	/**
	 * @category Weekday Helpers
	 * @summary Set the day of the ISO week to the given date.
	 *
	 * @description
	 * Set the day of the ISO week to the given date.
	 * ISO week starts with Monday.
	 * 7 is the index of Sunday, 1 is the index of Monday etc.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} day - the day of the ISO week of the new date
	 * @returns {Date} the new date with the day of the ISO week setted
	 *
	 * @example
	 * // Set Sunday to 1 September 2014:
	 * var result = setISODay(new Date(2014, 8, 1), 7)
	 * //=> Sun Sep 07 2014 00:00:00
	 */
	function setISODay (dirtyDate, dirtyDay) {
	  var date = parse$82(dirtyDate)
	  var day = Number(dirtyDay)
	  var currentDay = getISODay$1(date)
	  var diff = day - currentDay
	  return addDays$3(date, diff)
	}

	var __moduleExports$139 = setISODay

	var parse$83 = __moduleExports$3
	var getISOWeek$2 = __moduleExports$69

	/**
	 * @category ISO Week Helpers
	 * @summary Set the ISO week to the given date.
	 *
	 * @description
	 * Set the ISO week to the given date, saving the weekday number.
	 *
	 * ISO week-numbering year: http://en.wikipedia.org/wiki/ISO_week_date
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} isoWeek - the ISO week of the new date
	 * @returns {Date} the new date with the ISO week setted
	 *
	 * @example
	 * // Set the 53rd ISO week to 7 August 2004:
	 * var result = setISOWeek(new Date(2004, 7, 7), 53)
	 * //=> Sat Jan 01 2005 00:00:00
	 */
	function setISOWeek (dirtyDate, dirtyISOWeek) {
	  var date = parse$83(dirtyDate)
	  var isoWeek = Number(dirtyISOWeek)
	  var diff = getISOWeek$2(date) - isoWeek
	  date.setDate(date.getDate() - diff * 7)
	  return date
	}

	var __moduleExports$140 = setISOWeek

	var parse$84 = __moduleExports$3

	/**
	 * @category Millisecond Helpers
	 * @summary Set the milliseconds to the given date.
	 *
	 * @description
	 * Set the milliseconds to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} milliseconds - the milliseconds of the new date
	 * @returns {Date} the new date with the milliseconds setted
	 *
	 * @example
	 * // Set 300 milliseconds to 1 September 2014 11:30:40.500:
	 * var result = setMilliseconds(new Date(2014, 8, 1, 11, 30, 40, 500), 300)
	 * //=> Mon Sep 01 2014 11:30:40.300
	 */
	function setMilliseconds (dirtyDate, dirtyMilliseconds) {
	  var date = parse$84(dirtyDate)
	  var milliseconds = Number(dirtyMilliseconds)
	  date.setMilliseconds(milliseconds)
	  return date
	}

	var __moduleExports$141 = setMilliseconds

	var parse$85 = __moduleExports$3

	/**
	 * @category Minute Helpers
	 * @summary Set the minutes to the given date.
	 *
	 * @description
	 * Set the minutes to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} minutes - the minutes of the new date
	 * @returns {Date} the new date with the minutes setted
	 *
	 * @example
	 * // Set 45 minutes to 1 September 2014 11:30:40:
	 * var result = setMinutes(new Date(2014, 8, 1, 11, 30, 40), 45)
	 * //=> Mon Sep 01 2014 11:45:40
	 */
	function setMinutes (dirtyDate, dirtyMinutes) {
	  var date = parse$85(dirtyDate)
	  var minutes = Number(dirtyMinutes)
	  date.setMinutes(minutes)
	  return date
	}

	var __moduleExports$142 = setMinutes

	var parse$86 = __moduleExports$3
	var getDaysInMonth$2 = __moduleExports$17

	/**
	 * @category Month Helpers
	 * @summary Set the month to the given date.
	 *
	 * @description
	 * Set the month to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} month - the month of the new date
	 * @returns {Date} the new date with the month setted
	 *
	 * @example
	 * // Set February to 1 September 2014:
	 * var result = setMonth(new Date(2014, 8, 1), 1)
	 * //=> Sat Feb 01 2014 00:00:00
	 */
	function setMonth (dirtyDate, dirtyMonth) {
	  var date = parse$86(dirtyDate)
	  var month = Number(dirtyMonth)
	  var year = date.getFullYear()
	  var day = date.getDate()

	  var dateWithDesiredMonth = new Date(0)
	  dateWithDesiredMonth.setFullYear(year, month, 15)
	  dateWithDesiredMonth.setHours(0, 0, 0, 0)
	  var daysInMonth = getDaysInMonth$2(dateWithDesiredMonth)
	  // Set the last day of the new month
	  // if the original date was the last day of the longer month
	  date.setMonth(month, Math.min(day, daysInMonth))
	  return date
	}

	var __moduleExports$143 = setMonth

	var parse$87 = __moduleExports$3
	var setMonth$1 = __moduleExports$143

	/**
	 * @category Quarter Helpers
	 * @summary Set the year quarter to the given date.
	 *
	 * @description
	 * Set the year quarter to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} quarter - the quarter of the new date
	 * @returns {Date} the new date with the quarter setted
	 *
	 * @example
	 * // Set the 2nd quarter to 2 July 2014:
	 * var result = setQuarter(new Date(2014, 6, 2), 2)
	 * //=> Wed Apr 02 2014 00:00:00
	 */
	function setQuarter (dirtyDate, dirtyQuarter) {
	  var date = parse$87(dirtyDate)
	  var quarter = Number(dirtyQuarter)
	  var oldQuarter = Math.floor(date.getMonth() / 3) + 1
	  var diff = quarter - oldQuarter
	  return setMonth$1(date, date.getMonth() + diff * 3)
	}

	var __moduleExports$144 = setQuarter

	var parse$88 = __moduleExports$3

	/**
	 * @category Second Helpers
	 * @summary Set the seconds to the given date.
	 *
	 * @description
	 * Set the seconds to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} seconds - the seconds of the new date
	 * @returns {Date} the new date with the seconds setted
	 *
	 * @example
	 * // Set 45 seconds to 1 September 2014 11:30:40:
	 * var result = setSeconds(new Date(2014, 8, 1, 11, 30, 40), 45)
	 * //=> Mon Sep 01 2014 11:30:45
	 */
	function setSeconds (dirtyDate, dirtySeconds) {
	  var date = parse$88(dirtyDate)
	  var seconds = Number(dirtySeconds)
	  date.setSeconds(seconds)
	  return date
	}

	var __moduleExports$145 = setSeconds

	var parse$89 = __moduleExports$3

	/**
	 * @category Year Helpers
	 * @summary Set the year to the given date.
	 *
	 * @description
	 * Set the year to the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} year - the year of the new date
	 * @returns {Date} the new date with the year setted
	 *
	 * @example
	 * // Set year 2013 to 1 September 2014:
	 * var result = setYear(new Date(2014, 8, 1), 2013)
	 * //=> Sun Sep 01 2013 00:00:00
	 */
	function setYear (dirtyDate, dirtyYear) {
	  var date = parse$89(dirtyDate)
	  var year = Number(dirtyYear)
	  date.setFullYear(year)
	  return date
	}

	var __moduleExports$146 = setYear

	var parse$90 = __moduleExports$3

	/**
	 * @category Month Helpers
	 * @summary Return the start of a month for the given date.
	 *
	 * @description
	 * Return the start of a month for the given date.
	 * The result will be in the local timezone.
	 *
	 * @param {Date|String|Number} date - the original date
	 * @returns {Date} the start of a month
	 *
	 * @example
	 * // The start of a month for 2 September 2014 11:55:00:
	 * var result = startOfMonth(new Date(2014, 8, 2, 11, 55, 0))
	 * //=> Mon Sep 01 2014 00:00:00
	 */
	function startOfMonth (dirtyDate) {
	  var date = parse$90(dirtyDate)
	  date.setDate(1)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$147 = startOfMonth

	var startOfDay$6 = __moduleExports$14

	/**
	 * @category Day Helpers
	 * @summary Return the start of today.
	 *
	 * @description
	 * Return the start of today.
	 *
	 * @returns {Date} the start of today
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = startOfToday()
	 * //=> Mon Oct 6 2014 00:00:00
	 */
	function startOfToday () {
	  return startOfDay$6(new Date())
	}

	var __moduleExports$148 = startOfToday

	/**
	 * @category Day Helpers
	 * @summary Return the start of tomorrow.
	 *
	 * @description
	 * Return the start of tomorrow.
	 *
	 * @returns {Date} the start of tomorrow
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = startOfTomorrow()
	 * //=> Tue Oct 7 2014 00:00:00
	 */
	function startOfTomorrow () {
	  var now = new Date()
	  var year = now.getFullYear()
	  var month = now.getMonth()
	  var day = now.getDate()

	  var date = new Date(0)
	  date.setFullYear(year, month, day + 1)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$149 = startOfTomorrow

	/**
	 * @category Day Helpers
	 * @summary Return the start of yesterday.
	 *
	 * @description
	 * Return the start of yesterday.
	 *
	 * @returns {Date} the start of yesterday
	 *
	 * @example
	 * // If today is 6 October 2014:
	 * var result = startOfYesterday()
	 * //=> Sun Oct 5 2014 00:00:00
	 */
	function startOfYesterday () {
	  var now = new Date()
	  var year = now.getFullYear()
	  var month = now.getMonth()
	  var day = now.getDate()

	  var date = new Date(0)
	  date.setFullYear(year, month, day - 1)
	  date.setHours(0, 0, 0, 0)
	  return date
	}

	var __moduleExports$150 = startOfYesterday

	var addDays$4 = __moduleExports$2

	/**
	 * @category Day Helpers
	 * @summary Subtract the specified number of days from the given date.
	 *
	 * @description
	 * Subtract the specified number of days from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of days to be subtracted
	 * @returns {Date} the new date with the days subtracted
	 *
	 * @example
	 * // Subtract 10 days from 1 September 2014:
	 * var result = subDays(new Date(2014, 8, 1), 10)
	 * //=> Fri Aug 22 2014 00:00:00
	 */
	function subDays (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addDays$4(dirtyDate, -amount)
	}

	var __moduleExports$151 = subDays

	var addHours$1 = __moduleExports$5

	/**
	 * @category Hour Helpers
	 * @summary Subtract the specified number of hours from the given date.
	 *
	 * @description
	 * Subtract the specified number of hours from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of hours to be subtracted
	 * @returns {Date} the new date with the hours subtracted
	 *
	 * @example
	 * // Subtract 2 hours from 11 July 2014 01:00:00:
	 * var result = subHours(new Date(2014, 6, 11, 1, 0), 2)
	 * //=> Thu Jul 10 2014 23:00:00
	 */
	function subHours (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addHours$1(dirtyDate, -amount)
	}

	var __moduleExports$152 = subHours

	var addMilliseconds$4 = __moduleExports$6

	/**
	 * @category Millisecond Helpers
	 * @summary Subtract the specified number of milliseconds from the given date.
	 *
	 * @description
	 * Subtract the specified number of milliseconds from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of milliseconds to be subtracted
	 * @returns {Date} the new date with the milliseconds subtracted
	 *
	 * @example
	 * // Subtract 750 milliseconds from 10 July 2014 12:45:30.000:
	 * var result = subMilliseconds(new Date(2014, 6, 10, 12, 45, 30, 0), 750)
	 * //=> Thu Jul 10 2014 12:45:29.250
	 */
	function subMilliseconds (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMilliseconds$4(dirtyDate, -amount)
	}

	var __moduleExports$153 = subMilliseconds

	var addMinutes$1 = __moduleExports$15

	/**
	 * @category Minute Helpers
	 * @summary Subtract the specified number of minutes from the given date.
	 *
	 * @description
	 * Subtract the specified number of minutes from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of minutes to be subtracted
	 * @returns {Date} the new date with the mintues subtracted
	 *
	 * @example
	 * // Subtract 30 minutes from 10 July 2014 12:00:00:
	 * var result = subMinutes(new Date(2014, 6, 10, 12, 0), 30)
	 * //=> Thu Jul 10 2014 11:30:00
	 */
	function subMinutes (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMinutes$1(dirtyDate, -amount)
	}

	var __moduleExports$154 = subMinutes

	var addMonths$3 = __moduleExports$16

	/**
	 * @category Month Helpers
	 * @summary Subtract the specified number of months from the given date.
	 *
	 * @description
	 * Subtract the specified number of months from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of months to be subtracted
	 * @returns {Date} the new date with the months subtracted
	 *
	 * @example
	 * // Subtract 5 months from 1 February 2015:
	 * var result = subMonths(new Date(2015, 1, 1), 5)
	 * //=> Mon Sep 01 2014 00:00:00
	 */
	function subMonths (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addMonths$3(dirtyDate, -amount)
	}

	var __moduleExports$155 = subMonths

	var addQuarters$1 = __moduleExports$18

	/**
	 * @category Quarter Helpers
	 * @summary Subtract the specified number of year quarters from the given date.
	 *
	 * @description
	 * Subtract the specified number of year quarters from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of quarters to be subtracted
	 * @returns {Date} the new date with the quarters subtracted
	 *
	 * @example
	 * // Subtract 3 quarters from 1 September 2014:
	 * var result = subQuarters(new Date(2014, 8, 1), 3)
	 * //=> Sun Dec 01 2013 00:00:00
	 */
	function subQuarters (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addQuarters$1(dirtyDate, -amount)
	}

	var __moduleExports$156 = subQuarters

	var addSeconds$1 = __moduleExports$19

	/**
	 * @category Second Helpers
	 * @summary Subtract the specified number of seconds from the given date.
	 *
	 * @description
	 * Subtract the specified number of seconds from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of seconds to be subtracted
	 * @returns {Date} the new date with the seconds subtracted
	 *
	 * @example
	 * // Subtract 30 seconds from 10 July 2014 12:45:00:
	 * var result = subSeconds(new Date(2014, 6, 10, 12, 45, 0), 30)
	 * //=> Thu Jul 10 2014 12:44:30
	 */
	function subSeconds (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addSeconds$1(dirtyDate, -amount)
	}

	var __moduleExports$157 = subSeconds

	var addWeeks$2 = __moduleExports$20

	/**
	 * @category Week Helpers
	 * @summary Subtract the specified number of weeks from the given date.
	 *
	 * @description
	 * Subtract the specified number of weeks from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of weeks to be subtracted
	 * @returns {Date} the new date with the weeks subtracted
	 *
	 * @example
	 * // Subtract 4 weeks from 1 September 2014:
	 * var result = subWeeks(new Date(2014, 8, 1), 4)
	 * //=> Mon Aug 04 2014 00:00:00
	 */
	function subWeeks (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addWeeks$2(dirtyDate, -amount)
	}

	var __moduleExports$158 = subWeeks

	var addYears$1 = __moduleExports$21

	/**
	 * @category Year Helpers
	 * @summary Subtract the specified number of years from the given date.
	 *
	 * @description
	 * Subtract the specified number of years from the given date.
	 *
	 * @param {Date|String|Number} date - the date to be changed
	 * @param {Number} amount - the amount of years to be subtracted
	 * @returns {Date} the new date with the years subtracted
	 *
	 * @example
	 * // Subtract 5 years from 1 September 2014:
	 * var result = subYears(new Date(2014, 8, 1), 5)
	 * //=> Tue Sep 01 2009 00:00:00
	 */
	function subYears (dirtyDate, dirtyAmount) {
	  var amount = Number(dirtyAmount)
	  return addYears$1(dirtyDate, -amount)
	}

	var __moduleExports$159 = subYears

	var __moduleExports$1 = {
	  addDays: __moduleExports$2,
	  addHours: __moduleExports$5,
	  addISOYears: __moduleExports$7,
	  addMilliseconds: __moduleExports$6,
	  addMinutes: __moduleExports$15,
	  addMonths: __moduleExports$16,
	  addQuarters: __moduleExports$18,
	  addSeconds: __moduleExports$19,
	  addWeeks: __moduleExports$20,
	  addYears: __moduleExports$21,
	  areRangesOverlapping: __moduleExports$22,
	  closestIndexTo: __moduleExports$23,
	  closestTo: __moduleExports$24,
	  compareAsc: __moduleExports$25,
	  compareDesc: __moduleExports$26,
	  differenceInCalendarDays: __moduleExports$13,
	  differenceInCalendarISOWeeks: __moduleExports$27,
	  differenceInCalendarISOYears: __moduleExports$28,
	  differenceInCalendarMonths: __moduleExports$29,
	  differenceInCalendarQuarters: __moduleExports$30,
	  differenceInCalendarWeeks: __moduleExports$32,
	  differenceInCalendarYears: __moduleExports$33,
	  differenceInDays: __moduleExports$34,
	  differenceInHours: __moduleExports$35,
	  differenceInISOYears: __moduleExports$37,
	  differenceInMilliseconds: __moduleExports$36,
	  differenceInMinutes: __moduleExports$39,
	  differenceInMonths: __moduleExports$40,
	  differenceInQuarters: __moduleExports$41,
	  differenceInSeconds: __moduleExports$42,
	  differenceInWeeks: __moduleExports$43,
	  differenceInYears: __moduleExports$44,
	  distanceInWords: __moduleExports$45,
	  distanceInWordsStrict: __moduleExports$50,
	  distanceInWordsToNow: __moduleExports$51,
	  eachDay: __moduleExports$52,
	  endOfDay: __moduleExports$53,
	  endOfHour: __moduleExports$54,
	  endOfISOWeek: __moduleExports$55,
	  endOfISOYear: __moduleExports$57,
	  endOfMinute: __moduleExports$58,
	  endOfMonth: __moduleExports$59,
	  endOfQuarter: __moduleExports$60,
	  endOfSecond: __moduleExports$61,
	  endOfToday: __moduleExports$62,
	  endOfTomorrow: __moduleExports$63,
	  endOfWeek: __moduleExports$56,
	  endOfYear: __moduleExports$64,
	  endOfYesterday: __moduleExports$65,
	  format: __moduleExports$66,
	  getDate: __moduleExports$71,
	  getDay: __moduleExports$72,
	  getDayOfYear: __moduleExports$67,
	  getDaysInMonth: __moduleExports$17,
	  getDaysInYear: __moduleExports$73,
	  getHours: __moduleExports$75,
	  getISODay: __moduleExports$76,
	  getISOWeek: __moduleExports$69,
	  getISOWeeksInYear: __moduleExports$77,
	  getISOYear: __moduleExports$8,
	  getMilliseconds: __moduleExports$78,
	  getMinutes: __moduleExports$79,
	  getMonth: __moduleExports$80,
	  getOverlappingDaysInRanges: __moduleExports$81,
	  getQuarter: __moduleExports$31,
	  getSeconds: __moduleExports$82,
	  getTime: __moduleExports$83,
	  getYear: __moduleExports$84,
	  isAfter: __moduleExports$85,
	  isBefore: __moduleExports$86,
	  isDate: __moduleExports$4,
	  isEqual: __moduleExports$87,
	  isFirstDayOfMonth: __moduleExports$88,
	  isFriday: __moduleExports$89,
	  isFuture: __moduleExports$90,
	  isLastDayOfMonth: __moduleExports$91,
	  isLeapYear: __moduleExports$74,
	  isMonday: __moduleExports$92,
	  isPast: __moduleExports$93,
	  isSameDay: __moduleExports$94,
	  isSameHour: __moduleExports$95,
	  isSameISOWeek: __moduleExports$97,
	  isSameISOYear: __moduleExports$99,
	  isSameMinute: __moduleExports$100,
	  isSameMonth: __moduleExports$102,
	  isSameQuarter: __moduleExports$103,
	  isSameSecond: __moduleExports$105,
	  isSameWeek: __moduleExports$98,
	  isSameYear: __moduleExports$107,
	  isSaturday: __moduleExports$108,
	  isSunday: __moduleExports$109,
	  isThisHour: __moduleExports$110,
	  isThisISOWeek: __moduleExports$111,
	  isThisISOYear: __moduleExports$112,
	  isThisMinute: __moduleExports$113,
	  isThisMonth: __moduleExports$114,
	  isThisQuarter: __moduleExports$115,
	  isThisSecond: __moduleExports$116,
	  isThisWeek: __moduleExports$117,
	  isThisYear: __moduleExports$118,
	  isThursday: __moduleExports$119,
	  isToday: __moduleExports$120,
	  isTomorrow: __moduleExports$121,
	  isTuesday: __moduleExports$122,
	  isValid: __moduleExports$70,
	  isWednesday: __moduleExports$123,
	  isWeekend: __moduleExports$124,
	  isWithinRange: __moduleExports$125,
	  isYesterday: __moduleExports$126,
	  lastDayOfISOWeek: __moduleExports$127,
	  lastDayOfISOYear: __moduleExports$129,
	  lastDayOfMonth: __moduleExports$130,
	  lastDayOfQuarter: __moduleExports$131,
	  lastDayOfWeek: __moduleExports$128,
	  lastDayOfYear: __moduleExports$132,
	  max: __moduleExports$133,
	  min: __moduleExports$134,
	  parse: __moduleExports$3,
	  setDate: __moduleExports$135,
	  setDay: __moduleExports$136,
	  setDayOfYear: __moduleExports$137,
	  setHours: __moduleExports$138,
	  setISODay: __moduleExports$139,
	  setISOWeek: __moduleExports$140,
	  setISOYear: __moduleExports$11,
	  setMilliseconds: __moduleExports$141,
	  setMinutes: __moduleExports$142,
	  setMonth: __moduleExports$143,
	  setQuarter: __moduleExports$144,
	  setSeconds: __moduleExports$145,
	  setYear: __moduleExports$146,
	  startOfDay: __moduleExports$14,
	  startOfHour: __moduleExports$96,
	  startOfISOWeek: __moduleExports$9,
	  startOfISOYear: __moduleExports$12,
	  startOfMinute: __moduleExports$101,
	  startOfMonth: __moduleExports$147,
	  startOfQuarter: __moduleExports$104,
	  startOfSecond: __moduleExports$106,
	  startOfToday: __moduleExports$148,
	  startOfTomorrow: __moduleExports$149,
	  startOfWeek: __moduleExports$10,
	  startOfYear: __moduleExports$68,
	  startOfYesterday: __moduleExports$150,
	  subDays: __moduleExports$151,
	  subHours: __moduleExports$152,
	  subISOYears: __moduleExports$38,
	  subMilliseconds: __moduleExports$153,
	  subMinutes: __moduleExports$154,
	  subMonths: __moduleExports$155,
	  subQuarters: __moduleExports$156,
	  subSeconds: __moduleExports$157,
	  subWeeks: __moduleExports$158,
	  subYears: __moduleExports$159
	}

	var _require = __moduleExports$1;
	var format = _require.format;
	var setDay = _require.setDay;
	var dateToReportingPeriod = function dateToReportingPeriod() {
	  var date = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : new Date().toISOString();

	  var friday = setDay(new Date(date), 4);
	  return format(friday, 'YYYY[-W]WW');
	};

	var __moduleExports = dateToReportingPeriod;

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var __moduleExports$162 = locationIdToProperties$1;

	function locationIdToProperties$1(id) {
	  if (id === 'national') {
	    return {
	      national: 'national',
	      level: 'national',
	      id: id
	    };
	  }

	  if (id === 'country') {
	    return {
	      country: 'country',
	      level: 'country',
	      id: id
	    };
	  }

	  var _id$match = id.match(/zone:([^:]+)(:state:([^:]+)(:lga:([^:]+))?)?/),
	      _id$match2 = _slicedToArray(_id$match, 6),
	      zone = _id$match2[1],
	      state = _id$match2[3],
	      lga = _id$match2[5];

	  var properties = { zone: zone };
	  properties.level = 'zone';
	  var locationId = 'zone:' + zone;
	  if (state) {
	    properties.state = state;
	    properties.level = 'state';
	    locationId += ':state:' + state;
	  }
	  if (lga) {
	    properties.lga = lga;
	    properties.level = 'lga';
	    locationId += ':lga:' + lga;
	  }

	  return Object.assign({}, properties, { id: locationId });
	}

	var __moduleExports$161 = stockCountIdToLocationProperties$1;

	var locationIdToProperties = __moduleExports$162;

	function stockCountIdToLocationProperties$1(id) {
	  var parts = id.split(':');
	  if (parts.length > 6) {
	    return locationIdToProperties(parts.slice(0, 4).concat(parts.slice(6)).join(':'));
	  }
	  return locationIdToProperties(id.split(':week:')[0]);
	}

	var __moduleExports$164 = locationIdToSubmitProperties$1;

	var locationIdToProperties$2 = __moduleExports$162;

	// This can be removed when the information has somehow been included
	// in location docs
	// Ignoring the function in tests because it's trivial
	/* istanbul ignore next */
	function locationIdToSubmitProperties$1(locationId) {
	  var location = locationIdToProperties$2(locationId);

	  switch (location.level) {
	    case 'zone':
	    case 'national':
	      return {
	        submitsOwnReport: true,
	        submitsChildrenReport: false,
	        submitsBatchedCounts: true
	      };
	    case 'state':
	      return {
	        submitsOwnReport: true,
	        submitsChildrenReport: true,
	        submitsBatchedCounts: true

	      };
	    default:
	      return {
	        submitsOwnReport: false,
	        submitsChildrenReport: false,
	        submitsBatchedCounts: false

	      };
	  }
	}

	var __moduleExports$163 = shouldTrackBatches$1;

	var locationIdToSubmitProperties = __moduleExports$164;

	function shouldTrackBatches$1(params) {
	  var location = params.location,
	      product = params.product;


	  if (location && !locationIdToSubmitProperties(location.id).submitsBatchedCounts) {
	    return false;
	  }

	  if (product.productType === 'dry') {
	    return false;
	  }

	  if (product.productType === 'diluent') {
	    return false;
	  }

	  return true;
	}

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var __moduleExports$165 = createCommonjsModule(function (module, exports) {
	!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof undefined&&undefined.amd?undefined(n):e.dlv=n()}(commonjsGlobal,function(){function e(e,n,t,o){for(o=0,n=n.split?n.split("."):n;e&&o<n.length;)e=e[n[o++]];return void 0===e?t:e}return e});
	});

	var __moduleExports$166 = {
	  NOT_STARTED: 'notStarted',
	  IN_PROGRESS: 'inProgress',
	  COMPLETE: 'complete'
	};

	var stockCountIdToLocationProperties = __moduleExports$161;
	var shouldTrackBatches = __moduleExports$163;
	var dlv = __moduleExports$165;

	var _require$1 = __moduleExports$166;
	var NOT_STARTED = _require$1.NOT_STARTED;
	var IN_PROGRESS = _require$1.IN_PROGRESS;
	var COMPLETE = _require$1.COMPLETE;
	var reportProgress = function reportProgress(doc, relevantProducts) {
	  // report has no `stock` or `stock: {}` => hasn't been started
	  if (!(doc.stock && Object.keys(doc.stock).length)) {
	    return NOT_STARTED;
	  }

	  var locationId = stockCountIdToLocationProperties(doc._id).id;
	  // is in progress when `stock` field contains a non empty object
	  // and one of the following is true
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = relevantProducts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var product = _step.value;

	      var productStock = doc.stock[product._id];
	      // the counts for any product are missing
	      if (!productStock) {
	        return IN_PROGRESS;
	      }

	      if (!Object.keys(productStock).length) {
	        return IN_PROGRESS;
	      }

	      var isBatchTrackedForProduct = shouldTrackBatches({
	        product: product,
	        location: { id: locationId }
	      });

	      // is missing an `amount` for any non batch tracking product
	      if (!isBatchTrackedForProduct) {
	        if (typeof dlv(productStock, 'amount') === 'undefined') {
	          return IN_PROGRESS;
	        }
	        continue;
	      }

	      var batches = dlv(productStock, 'batches', {});
	      // is missing `batches` for any batch tracking product
	      if (!Object.keys(batches).length) {
	        return IN_PROGRESS;
	      }

	      // is missing `amount` or is not `checked` for any batch in a batch tracking product
	      var _iteratorNormalCompletion2 = true;
	      var _didIteratorError2 = false;
	      var _iteratorError2 = undefined;

	      try {
	        for (var _iterator2 = Object.keys(batches)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
	          var batchId = _step2.value;

	          var batch = batches[batchId];
	          if (typeof batch.amount === 'undefined') {
	            return IN_PROGRESS;
	          }
	          if (!batch.checked) {
	            return IN_PROGRESS;
	          }
	        }
	      } catch (err) {
	        _didIteratorError2 = true;
	        _iteratorError2 = err;
	      } finally {
	        try {
	          if (!_iteratorNormalCompletion2 && _iterator2.return) {
	            _iterator2.return();
	          }
	        } finally {
	          if (_didIteratorError2) {
	            throw _iteratorError2;
	          }
	        }
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

	  return COMPLETE;
	};

	var __moduleExports$160 = reportProgress;

	var __moduleExports$167 = docToStockCountRecord;

	var stockCountIdToLocationProperties$2 = __moduleExports$161;
	var locationIdToSubmitProperties$2 = __moduleExports$164;
	var shouldTrackBatches$2 = __moduleExports$163;
	var reportProgress$1 = __moduleExports$160;

	var stockCountIdToDateProps = function stockCountIdToDateProps(id) {
	  var reportingPeriod = id.split(':week:')[1].split(':')[0];
	  var reportingPeriodParts = reportingPeriod.split('-W');
	  var year = parseInt(reportingPeriodParts[0]);
	  var week = parseInt(reportingPeriodParts[1]);
	  return {
	    year: year,
	    week: week,
	    reportingPeriod: reportingPeriod
	  };
	};

	// if batches items do not contain a `checked` field,
	// add `checked: false`
	var maybeUncheckBatches = function maybeUncheckBatches(batches) {
	  return Object.keys(batches).reduce(function (withChecked, batchId) {
	    var _batches$batchId = batches[batchId],
	        checked = _batches$batchId.checked,
	        amount = _batches$batchId.amount;

	    if (typeof checked === 'undefined') {
	      withChecked[batchId] = {
	        amount: amount,
	        checked: false
	      };
	      return withChecked;
	    }
	    withChecked[batchId] = batches[batchId];
	    return withChecked;
	  }, {});
	};

	var addUpBatchQuantities = function addUpBatchQuantities(batches) {
	  return Object.keys(batches).reduce(function (total, batchId) {
	    var _batches$batchId2 = batches[batchId],
	        checked = _batches$batchId2.checked,
	        amount = _batches$batchId2.amount;

	    if (checked) {
	      return total + amount;
	    }
	    return total;
	  }, 0);
	};

	var stockWithAmounts = function stockWithAmounts(stock) {
	  return Object.keys(stock).reduce(function (withAmounts, productId) {
	    if (!stock[productId].batches) {
	      // unbatched product
	      withAmounts[productId] = stock[productId];
	      return withAmounts;
	    }
	    var batches = stock[productId].batches;
	    withAmounts[productId] = {
	      amount: addUpBatchQuantities(batches),
	      batches: maybeUncheckBatches(batches)
	    };
	    return withAmounts;
	  }, {});
	};

	var addMissingProductsToStock = function addMissingProductsToStock(doc, products) {
	  var stockWithMissingProducts = function stockWithMissingProducts() {
	    var stock = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    var locationId = arguments[1];
	    var products = arguments[2];

	    return products.reduce(function (withProducts, product) {
	      var stockDefault = { batches: {} };
	      var areBatchesTracked = shouldTrackBatches$2({
	        product: product,
	        location: { id: locationId }
	      });
	      if (!areBatchesTracked) {
	        stockDefault = {};
	      }

	      withProducts[product._id] = Object.assign({}, stockDefault, stock[product._id]);
	      return withProducts;
	    }, {});
	  };

	  var locationProps = stockCountIdToLocationProperties$2(doc._id);
	  var locationId = locationProps.id;
	  doc.stock = stockWithMissingProducts(doc.stock, locationId, products);
	  return doc;
	};

	function docToStockCountRecord(doc) {
	  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  var decorate = opts.decorate,
	      products = opts.products;

	  if (decorate && products) {
	    doc.progress = {
	      status: reportProgress$1(doc, products)
	    };

	    addMissingProductsToStock(doc, products);
	  }

	  var _id = doc._id,
	      stock = doc.stock,
	      createdAt = doc.createdAt,
	      updatedAt = doc.updatedAt,
	      updatedBy = doc.updatedBy,
	      createdBy = doc.createdBy,
	      submittedAt = doc.submittedAt,
	      progress = doc.progress;

	  var stockCount = Object.assign({}, {
	    _id: _id,
	    location: stockCountIdToLocationProperties$2(_id),
	    date: stockCountIdToDateProps(_id)
	  });
	  if (createdAt) {
	    stockCount.createdAt = createdAt;
	    stockCount.createdBy = createdBy;
	    stockCount.updatedAt = updatedAt;
	    stockCount.updatedBy = updatedBy;
	  }
	  if (submittedAt) {
	    stockCount.submittedAt = submittedAt;
	  }
	  if (stock) {
	    stockCount.stock = stockWithAmounts(stock);
	  }
	  if (typeof progress !== 'undefined') {
	    stockCount.progress = progress;
	  }
	  stockCount.submitConfig = locationIdToSubmitProperties$2(stockCount.location.id);
	  return stockCount;
	}

	var __moduleExports$169 = locationIdToParent$1;

	var locationIdToProperties$3 = __moduleExports$162;

	function locationIdToParent$1(locationId) {
	  var location = locationIdToProperties$3(locationId);
	  switch (location.level) {
	    case 'lga':
	      return 'zone:' + location.zone + ':state:' + location.state;
	    case 'state':
	      return 'zone:' + location.zone;
	    case 'zone':
	      return 'national';
	  }
	}

	var __moduleExports$168 = formatReportsByLevel;

	var locationIdToParent = __moduleExports$169;

	var levels = ['national', 'zone', 'state', 'lga'];

	var level = function level(report, currentLocationLevel) {
	  var descendantLevel = report.location.level;
	  var distance = levels.indexOf(descendantLevel) - levels.indexOf(currentLocationLevel);
	  return distance === 1 ? 'children' : 'grandchildren';
	};

	function formatReportsByLevel(reports) {
	  var currentLocationReport = reports.shift();
	  var currentLocationLevel = currentLocationReport.location.level;

	  var byLevel = {
	    date: currentLocationReport.date,
	    location: currentLocationReport.location,
	    current: currentLocationReport
	  };

	  return reports.reduce(function (byLevel, report) {
	    var descendantLevel = level(report, currentLocationLevel);
	    if (descendantLevel === 'children') {
	      byLevel.children = byLevel.children || [];
	      byLevel.children.push(report);
	      return byLevel;
	    }
	    /* istanbul ignore else */
	    if (descendantLevel === 'grandchildren') {
	      byLevel.grandchildren = byLevel.grandchildren || { byChild: {} };
	      var parentId = locationIdToParent(report.location.id);
	      byLevel.grandchildren.byChild[parentId] = byLevel.grandchildren.byChild[parentId] || [];
	      byLevel.grandchildren.byChild[parentId].push(report);
	    }
	    return byLevel;
	  }, byLevel);
	}

	var __moduleExports$170 = toStockCountId;

	var dateToReportingPeriod$1 = __moduleExports;
	var locationIdToProperties$4 = __moduleExports$162;

	function toStockCountId(params) {
	  var location = params.location,
	      reportingPeriod = params.reportingPeriod,
	      reportingDate = params.reportingDate;

	  /* istanbul ignore if */

	  if (!location) {
	    return;
	  }

	  var week = reportingPeriod || dateToReportingPeriod$1(reportingDate);

	  var locationProps = locationIdToProperties$4(location);

	  if (!locationProps.lga) {
	    return location + ':week:' + week;
	  }
	  return 'zone:' + locationProps.zone + ':state:' + locationProps.state + ':week:' + week + ':lga:' + locationProps.lga;
	}

	var __moduleExports$171 = translateReport;

	var docToStockCountRecord$1 = __moduleExports$167;
	var dlv$1 = __moduleExports$165;

	var toOldFormatUnbatchedStock = function toOldFormatUnbatchedStock(stock) {
	  return Object.keys(stock).reduce(function (unbatched, productId) {
	    unbatched[productId] = stock[productId].amount;
	    return unbatched;
	  }, {});
	};

	var toNewFormatUnbatchedStock = function toNewFormatUnbatchedStock(stock) {
	  return Object.keys(stock).reduce(function (unbatched, productId) {
	    unbatched[productId] = { amount: stock[productId] };
	    return unbatched;
	  }, {});
	};

	function translateReport(report, version) {
	  var reportVersion = dlv$1(report, 'version', '1.0.0');
	  if (reportVersion === '2.0.0' && version === '1.0.0') {
	    var stockCount = docToStockCountRecord$1(report);

	    var storeType = stockCount.location.level;
	    delete stockCount.location.level;
	    var weekStr = stockCount.date.reportingPeriod;
	    delete stockCount.date.reportingPeriod;

	    var _id = stockCount._id,
	        location = stockCount.location,
	        date = stockCount.date,
	        createdAt = stockCount.createdAt,
	        createdBy = stockCount.createdBy,
	        updatedAt = stockCount.updatedAt,
	        updatedBy = stockCount.updatedBy,
	        stock = stockCount.stock,
	        submittedAt = stockCount.submittedAt;


	    var oldVersion = {
	      _id: _id,
	      type: report.type,
	      createdAt: createdAt,
	      createdBy: createdBy,
	      updatedAt: updatedAt,
	      updatedBy: updatedBy,
	      location: location,
	      date: date,
	      weekStr: weekStr,
	      store: {
	        type: storeType
	      },
	      stock: toOldFormatUnbatchedStock(stock)
	    };

	    if (submittedAt) {
	      oldVersion.submittedAt = submittedAt;
	    }

	    return oldVersion;
	  }

	  if (reportVersion === '1.0.0' && version === '2.0.0') {
	    var _id2 = report._id,
	        type = report.type,
	        _createdAt = report.createdAt,
	        _createdBy = report.createdBy,
	        _updatedAt = report.updatedAt,
	        _updatedBy = report.updatedBy,
	        _submittedAt = report.submittedAt,
	        _stock = report.stock;


	    var newVersion = {
	      _id: _id2,
	      type: type,
	      version: version,
	      createdAt: _createdAt,
	      createdBy: _createdBy,
	      updatedAt: _updatedAt,
	      updatedBy: _updatedBy,
	      stock: toNewFormatUnbatchedStock(_stock)
	    };

	    if (_submittedAt) {
	      newVersion.submittedAt = _submittedAt;
	    }

	    return newVersion;
	  }
	  return report;
	}

	var _dateToReportingPeriod = __moduleExports;
	var _reportProgress = __moduleExports$160;
	var _docToStockCountRecord = __moduleExports$167;
	var _formatReportsByLevel = __moduleExports$168;
	var _locationIdToParent = __moduleExports$169;
	var _locationIdToProperties = __moduleExports$162;
	var _locationIdToSubmitProperties = __moduleExports$164;
	var _shouldTrackBatches = __moduleExports$163;
	var _stockCountIdToLocationProperties = __moduleExports$161;
	var _toStockCountId = __moduleExports$170;
	var _translateReport = __moduleExports$171;

	// not all functions are called through index.js in tests so istanbul complains
	/* istanbul ignore next */
	var index = {
	  dateToReportingPeriod: function dateToReportingPeriod(params) {
	    return _dateToReportingPeriod(params);
	  },
	  reportProgress: function reportProgress(doc, relevantProducts) {
	    return _reportProgress(doc, relevantProducts);
	  },
	  docToStockCountRecord: function docToStockCountRecord(params, opts) {
	    return _docToStockCountRecord(params, opts);
	  },
	  formatReportsByLevel: function formatReportsByLevel(params) {
	    return _formatReportsByLevel(params);
	  },
	  locationIdToParent: function locationIdToParent(params) {
	    return _locationIdToParent(params);
	  },
	  locationIdToProperties: function locationIdToProperties(params) {
	    return _locationIdToProperties(params);
	  },
	  locationIdToSubmitProperties: function locationIdToSubmitProperties(params) {
	    return _locationIdToSubmitProperties(params);
	  },
	  shouldTrackBatches: function shouldTrackBatches(params) {
	    return _shouldTrackBatches(params);
	  },
	  stockCountIdToLocationProperties: function stockCountIdToLocationProperties(params) {
	    return _stockCountIdToLocationProperties(params);
	  },
	  toStockCountId: function toStockCountId(params) {
	    return _toStockCountId(params);
	  },
	  translateReport: function translateReport(report, version) {
	    return _translateReport(report, version);
	  }
	};

	var TranslatorService = function () {
	  function TranslatorService() {
	    classCallCheck(this, TranslatorService);
	  }

	  createClass(TranslatorService, [{
	    key: 'translate',
	    value: function translate(data, version) {
	      return index.translateReport(data, version);
	    }
	  }]);
	  return TranslatorService;
	}();

	var moduleName$3 = 'angularNavData.translator';

	angular$1.module(moduleName$3, []).service('translatorService', TranslatorService);

	angular$1.module('angularNavData', [moduleName, moduleName$2, moduleName$3]);

}(angular));