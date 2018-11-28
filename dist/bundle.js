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

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function unwrapExports (x) {
		return x && x.__esModule ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var __moduleExports$1 = createCommonjsModule(function (module) {
	function _interopRequireDefault(obj) {
	  return obj && obj.__esModule ? obj : {
	    default: obj
	  };
	}

	module.exports = _interopRequireDefault;
	});

	unwrapExports(__moduleExports$1);

	function _arrayWithHoles(arr) {
	  if (Array.isArray(arr)) return arr;
	}

	var __moduleExports$3 = _arrayWithHoles;

	function _iterableToArrayLimit(arr, i) {
	  var _arr = [];
	  var _n = true;
	  var _d = false;
	  var _e = undefined;

	  try {
	    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
	      _arr.push(_s.value);

	      if (i && _arr.length === i) break;
	    }
	  } catch (err) {
	    _d = true;
	    _e = err;
	  } finally {
	    try {
	      if (!_n && _i["return"] != null) _i["return"]();
	    } finally {
	      if (_d) throw _e;
	    }
	  }

	  return _arr;
	}

	var __moduleExports$4 = _iterableToArrayLimit;

	function _nonIterableRest() {
	  throw new TypeError("Invalid attempt to destructure non-iterable instance");
	}

	var __moduleExports$5 = _nonIterableRest;

	var arrayWithHoles = __moduleExports$3;

	var iterableToArrayLimit = __moduleExports$4;

	var nonIterableRest = __moduleExports$5;

	function _slicedToArray(arr, i) {
	  return arrayWithHoles(arr) || iterableToArrayLimit(arr, i) || nonIterableRest();
	}

	var __moduleExports$2 = _slicedToArray;

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

	var __moduleExports$9 = isDate$1

	var isDate = __moduleExports$9

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

	var __moduleExports$8 = parse$1

	var parse = __moduleExports$8

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

	var __moduleExports$7 = addDays

	var parse$2 = __moduleExports$8

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

	var __moduleExports$11 = addMilliseconds$1

	var addMilliseconds = __moduleExports$11

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

	var __moduleExports$10 = addHours

	var parse$4 = __moduleExports$8

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

	var __moduleExports$15 = startOfWeek$1

	var startOfWeek = __moduleExports$15

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

	var __moduleExports$14 = startOfISOWeek$1

	var parse$3 = __moduleExports$8
	var startOfISOWeek = __moduleExports$14

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

	var __moduleExports$13 = getISOYear$1

	var getISOYear$2 = __moduleExports$13
	var startOfISOWeek$2 = __moduleExports$14

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

	var __moduleExports$17 = startOfISOYear$1

	var parse$6 = __moduleExports$8

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

	var __moduleExports$19 = startOfDay$1

	var startOfDay = __moduleExports$19

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

	var __moduleExports$18 = differenceInCalendarDays$1

	var parse$5 = __moduleExports$8
	var startOfISOYear = __moduleExports$17
	var differenceInCalendarDays = __moduleExports$18

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

	var __moduleExports$16 = setISOYear$1

	var getISOYear = __moduleExports$13
	var setISOYear = __moduleExports$16

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

	var __moduleExports$12 = addISOYears

	var addMilliseconds$2 = __moduleExports$11

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

	var __moduleExports$20 = addMinutes

	var parse$8 = __moduleExports$8

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

	var __moduleExports$22 = getDaysInMonth$1

	var parse$7 = __moduleExports$8
	var getDaysInMonth = __moduleExports$22

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

	var __moduleExports$21 = addMonths

	var addMonths$1 = __moduleExports$21

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

	var __moduleExports$23 = addQuarters

	var addMilliseconds$3 = __moduleExports$11

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

	var __moduleExports$24 = addSeconds

	var addDays$1 = __moduleExports$7

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

	var __moduleExports$25 = addWeeks

	var addMonths$2 = __moduleExports$21

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

	var __moduleExports$26 = addYears

	var parse$9 = __moduleExports$8

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

	var __moduleExports$27 = areRangesOverlapping

	var parse$10 = __moduleExports$8

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

	var __moduleExports$28 = closestIndexTo

	var parse$11 = __moduleExports$8

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

	var __moduleExports$29 = closestTo

	var parse$12 = __moduleExports$8

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

	var __moduleExports$30 = compareAsc

	var parse$13 = __moduleExports$8

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

	var __moduleExports$31 = compareDesc

	var startOfISOWeek$3 = __moduleExports$14

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

	var __moduleExports$32 = differenceInCalendarISOWeeks

	var getISOYear$3 = __moduleExports$13

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

	var __moduleExports$33 = differenceInCalendarISOYears

	var parse$14 = __moduleExports$8

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

	var __moduleExports$34 = differenceInCalendarMonths

	var parse$16 = __moduleExports$8

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

	var __moduleExports$36 = getQuarter$1

	var getQuarter = __moduleExports$36
	var parse$15 = __moduleExports$8

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

	var __moduleExports$35 = differenceInCalendarQuarters

	var startOfWeek$2 = __moduleExports$15

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

	var __moduleExports$37 = differenceInCalendarWeeks

	var parse$17 = __moduleExports$8

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

	var __moduleExports$38 = differenceInCalendarYears

	var parse$18 = __moduleExports$8
	var differenceInCalendarDays$2 = __moduleExports$18
	var compareAsc$1 = __moduleExports$30

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

	var __moduleExports$39 = differenceInDays

	var parse$19 = __moduleExports$8

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

	var __moduleExports$41 = differenceInMilliseconds$1

	var differenceInMilliseconds = __moduleExports$41

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

	var __moduleExports$40 = differenceInHours

	var addISOYears$1 = __moduleExports$12

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

	var __moduleExports$43 = subISOYears$1

	var parse$20 = __moduleExports$8
	var differenceInCalendarISOYears$1 = __moduleExports$33
	var compareAsc$2 = __moduleExports$30
	var subISOYears = __moduleExports$43

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

	var __moduleExports$42 = differenceInISOYears

	var differenceInMilliseconds$2 = __moduleExports$41

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

	var __moduleExports$44 = differenceInMinutes

	var parse$21 = __moduleExports$8
	var differenceInCalendarMonths$1 = __moduleExports$34
	var compareAsc$3 = __moduleExports$30

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

	var __moduleExports$45 = differenceInMonths

	var differenceInMonths$1 = __moduleExports$45

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

	var __moduleExports$46 = differenceInQuarters

	var differenceInMilliseconds$3 = __moduleExports$41

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

	var __moduleExports$47 = differenceInSeconds

	var differenceInDays$1 = __moduleExports$39

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

	var __moduleExports$48 = differenceInWeeks

	var parse$22 = __moduleExports$8
	var differenceInCalendarYears$1 = __moduleExports$38
	var compareAsc$4 = __moduleExports$30

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

	var __moduleExports$49 = differenceInYears

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

	var __moduleExports$52 = buildDistanceInWordsLocale$1

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

	var __moduleExports$54 = buildFormattingTokensRegExp$1

	var buildFormattingTokensRegExp = __moduleExports$54

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

	var __moduleExports$53 = buildFormatLocale$1

	var buildDistanceInWordsLocale = __moduleExports$52
	var buildFormatLocale = __moduleExports$53

	/**
	 * @category Locales
	 * @summary English locale.
	 */
	var __moduleExports$51 = {
	  distanceInWords: buildDistanceInWordsLocale(),
	  format: buildFormatLocale()
	}

	var compareDesc$1 = __moduleExports$31
	var parse$23 = __moduleExports$8
	var differenceInSeconds$1 = __moduleExports$47
	var differenceInMonths$2 = __moduleExports$45
	var enLocale = __moduleExports$51

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

	var __moduleExports$50 = distanceInWords

	var compareDesc$2 = __moduleExports$31
	var parse$24 = __moduleExports$8
	var differenceInSeconds$2 = __moduleExports$47
	var enLocale$1 = __moduleExports$51

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

	var __moduleExports$55 = distanceInWordsStrict

	var distanceInWords$1 = __moduleExports$50

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

	var __moduleExports$56 = distanceInWordsToNow

	var parse$25 = __moduleExports$8

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

	var __moduleExports$57 = eachDay

	var parse$26 = __moduleExports$8

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

	var __moduleExports$58 = endOfDay

	var parse$27 = __moduleExports$8

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

	var __moduleExports$59 = endOfHour

	var parse$28 = __moduleExports$8

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

	var __moduleExports$61 = endOfWeek$1

	var endOfWeek = __moduleExports$61

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

	var __moduleExports$60 = endOfISOWeek

	var getISOYear$4 = __moduleExports$13
	var startOfISOWeek$4 = __moduleExports$14

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

	var __moduleExports$62 = endOfISOYear

	var parse$29 = __moduleExports$8

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

	var __moduleExports$63 = endOfMinute

	var parse$30 = __moduleExports$8

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

	var __moduleExports$64 = endOfMonth

	var parse$31 = __moduleExports$8

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

	var __moduleExports$65 = endOfQuarter

	var parse$32 = __moduleExports$8

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

	var __moduleExports$66 = endOfSecond

	var endOfDay$1 = __moduleExports$58

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

	var __moduleExports$67 = endOfToday

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

	var __moduleExports$68 = endOfTomorrow

	var parse$33 = __moduleExports$8

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

	var __moduleExports$69 = endOfYear

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

	var __moduleExports$70 = endOfYesterday

	var parse$36 = __moduleExports$8

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

	var __moduleExports$73 = startOfYear$1

	var parse$35 = __moduleExports$8
	var startOfYear = __moduleExports$73
	var differenceInCalendarDays$3 = __moduleExports$18

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

	var __moduleExports$72 = getDayOfYear$1

	var parse$37 = __moduleExports$8
	var startOfISOWeek$5 = __moduleExports$14
	var startOfISOYear$2 = __moduleExports$17

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

	var __moduleExports$74 = getISOWeek$1

	var isDate$2 = __moduleExports$9

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

	var __moduleExports$75 = isValid$1

	var getDayOfYear = __moduleExports$72
	var getISOWeek = __moduleExports$74
	var getISOYear$5 = __moduleExports$13
	var parse$34 = __moduleExports$8
	var isValid = __moduleExports$75
	var enLocale$2 = __moduleExports$51

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
	function format (dirtyDate, dirtyFormatStr, dirtyOptions) {
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

	var __moduleExports$71 = format

	var parse$38 = __moduleExports$8

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

	var __moduleExports$76 = getDate

	var parse$39 = __moduleExports$8

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

	var __moduleExports$77 = getDay

	var parse$40 = __moduleExports$8

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

	var __moduleExports$79 = isLeapYear$1

	var isLeapYear = __moduleExports$79

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

	var __moduleExports$78 = getDaysInYear

	var parse$41 = __moduleExports$8

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

	var __moduleExports$80 = getHours

	var parse$42 = __moduleExports$8

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

	var __moduleExports$81 = getISODay

	var startOfISOYear$3 = __moduleExports$17
	var addWeeks$1 = __moduleExports$25

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

	var __moduleExports$82 = getISOWeeksInYear

	var parse$43 = __moduleExports$8

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

	var __moduleExports$83 = getMilliseconds

	var parse$44 = __moduleExports$8

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

	var __moduleExports$84 = getMinutes

	var parse$45 = __moduleExports$8

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

	var __moduleExports$85 = getMonth

	var parse$46 = __moduleExports$8

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

	var __moduleExports$86 = getOverlappingDaysInRanges

	var parse$47 = __moduleExports$8

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

	var __moduleExports$87 = getSeconds

	var parse$48 = __moduleExports$8

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

	var __moduleExports$88 = getTime

	var parse$49 = __moduleExports$8

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

	var __moduleExports$89 = getYear

	var parse$50 = __moduleExports$8

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

	var __moduleExports$90 = isAfter

	var parse$51 = __moduleExports$8

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

	var __moduleExports$91 = isBefore

	var parse$52 = __moduleExports$8

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

	var __moduleExports$92 = isEqual

	var parse$53 = __moduleExports$8

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

	var __moduleExports$93 = isFirstDayOfMonth

	var parse$54 = __moduleExports$8

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

	var __moduleExports$94 = isFriday

	var parse$55 = __moduleExports$8

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

	var __moduleExports$95 = isFuture

	var parse$56 = __moduleExports$8
	var endOfDay$2 = __moduleExports$58
	var endOfMonth$1 = __moduleExports$64

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

	var __moduleExports$96 = isLastDayOfMonth

	var parse$57 = __moduleExports$8

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

	var __moduleExports$97 = isMonday

	var parse$58 = __moduleExports$8

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

	var __moduleExports$98 = isPast

	var startOfDay$2 = __moduleExports$19

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

	var __moduleExports$99 = isSameDay

	var parse$59 = __moduleExports$8

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

	var __moduleExports$101 = startOfHour$1

	var startOfHour = __moduleExports$101

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

	var __moduleExports$100 = isSameHour

	var startOfWeek$3 = __moduleExports$15

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

	var __moduleExports$103 = isSameWeek$1

	var isSameWeek = __moduleExports$103

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

	var __moduleExports$102 = isSameISOWeek

	var startOfISOYear$4 = __moduleExports$17

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

	var __moduleExports$104 = isSameISOYear

	var parse$60 = __moduleExports$8

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

	var __moduleExports$106 = startOfMinute$1

	var startOfMinute = __moduleExports$106

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

	var __moduleExports$105 = isSameMinute

	var parse$61 = __moduleExports$8

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

	var __moduleExports$107 = isSameMonth

	var parse$62 = __moduleExports$8

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

	var __moduleExports$109 = startOfQuarter$1

	var startOfQuarter = __moduleExports$109

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

	var __moduleExports$108 = isSameQuarter

	var parse$63 = __moduleExports$8

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

	var __moduleExports$111 = startOfSecond$1

	var startOfSecond = __moduleExports$111

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

	var __moduleExports$110 = isSameSecond

	var parse$64 = __moduleExports$8

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

	var __moduleExports$112 = isSameYear

	var parse$65 = __moduleExports$8

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

	var __moduleExports$113 = isSaturday

	var parse$66 = __moduleExports$8

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

	var __moduleExports$114 = isSunday

	var isSameHour$1 = __moduleExports$100

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

	var __moduleExports$115 = isThisHour

	var isSameISOWeek$1 = __moduleExports$102

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

	var __moduleExports$116 = isThisISOWeek

	var isSameISOYear$1 = __moduleExports$104

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

	var __moduleExports$117 = isThisISOYear

	var isSameMinute$1 = __moduleExports$105

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

	var __moduleExports$118 = isThisMinute

	var isSameMonth$1 = __moduleExports$107

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

	var __moduleExports$119 = isThisMonth

	var isSameQuarter$1 = __moduleExports$108

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

	var __moduleExports$120 = isThisQuarter

	var isSameSecond$1 = __moduleExports$110

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

	var __moduleExports$121 = isThisSecond

	var isSameWeek$2 = __moduleExports$103

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

	var __moduleExports$122 = isThisWeek

	var isSameYear$1 = __moduleExports$112

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

	var __moduleExports$123 = isThisYear

	var parse$67 = __moduleExports$8

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

	var __moduleExports$124 = isThursday

	var startOfDay$3 = __moduleExports$19

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

	var __moduleExports$125 = isToday

	var startOfDay$4 = __moduleExports$19

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

	var __moduleExports$126 = isTomorrow

	var parse$68 = __moduleExports$8

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

	var __moduleExports$127 = isTuesday

	var parse$69 = __moduleExports$8

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

	var __moduleExports$128 = isWednesday

	var parse$70 = __moduleExports$8

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

	var __moduleExports$129 = isWeekend

	var parse$71 = __moduleExports$8

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

	var __moduleExports$130 = isWithinRange

	var startOfDay$5 = __moduleExports$19

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

	var __moduleExports$131 = isYesterday

	var parse$72 = __moduleExports$8

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

	var __moduleExports$133 = lastDayOfWeek$1

	var lastDayOfWeek = __moduleExports$133

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

	var __moduleExports$132 = lastDayOfISOWeek

	var getISOYear$6 = __moduleExports$13
	var startOfISOWeek$6 = __moduleExports$14

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

	var __moduleExports$134 = lastDayOfISOYear

	var parse$73 = __moduleExports$8

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

	var __moduleExports$135 = lastDayOfMonth

	var parse$74 = __moduleExports$8

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

	var __moduleExports$136 = lastDayOfQuarter

	var parse$75 = __moduleExports$8

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

	var __moduleExports$137 = lastDayOfYear

	var parse$76 = __moduleExports$8

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

	var __moduleExports$138 = max

	var parse$77 = __moduleExports$8

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

	var __moduleExports$139 = min

	var parse$78 = __moduleExports$8

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

	var __moduleExports$140 = setDate

	var parse$79 = __moduleExports$8
	var addDays$2 = __moduleExports$7

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
	function setDay (dirtyDate, dirtyDay, dirtyOptions) {
	  var weekStartsOn = dirtyOptions ? (Number(dirtyOptions.weekStartsOn) || 0) : 0
	  var date = parse$79(dirtyDate)
	  var day = Number(dirtyDay)
	  var currentDay = date.getDay()

	  var remainder = day % 7
	  var dayIndex = (remainder + 7) % 7

	  var diff = (dayIndex < weekStartsOn ? 7 : 0) + day - currentDay
	  return addDays$2(date, diff)
	}

	var __moduleExports$141 = setDay

	var parse$80 = __moduleExports$8

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

	var __moduleExports$142 = setDayOfYear

	var parse$81 = __moduleExports$8

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

	var __moduleExports$143 = setHours

	var parse$82 = __moduleExports$8
	var addDays$3 = __moduleExports$7
	var getISODay$1 = __moduleExports$81

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

	var __moduleExports$144 = setISODay

	var parse$83 = __moduleExports$8
	var getISOWeek$2 = __moduleExports$74

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

	var __moduleExports$145 = setISOWeek

	var parse$84 = __moduleExports$8

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

	var __moduleExports$146 = setMilliseconds

	var parse$85 = __moduleExports$8

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

	var __moduleExports$147 = setMinutes

	var parse$86 = __moduleExports$8
	var getDaysInMonth$2 = __moduleExports$22

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

	var __moduleExports$148 = setMonth

	var parse$87 = __moduleExports$8
	var setMonth$1 = __moduleExports$148

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

	var __moduleExports$149 = setQuarter

	var parse$88 = __moduleExports$8

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

	var __moduleExports$150 = setSeconds

	var parse$89 = __moduleExports$8

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

	var __moduleExports$151 = setYear

	var parse$90 = __moduleExports$8

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

	var __moduleExports$152 = startOfMonth

	var startOfDay$6 = __moduleExports$19

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

	var __moduleExports$153 = startOfToday

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

	var __moduleExports$154 = startOfTomorrow

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

	var __moduleExports$155 = startOfYesterday

	var addDays$4 = __moduleExports$7

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

	var __moduleExports$156 = subDays

	var addHours$1 = __moduleExports$10

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

	var __moduleExports$157 = subHours

	var addMilliseconds$4 = __moduleExports$11

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

	var __moduleExports$158 = subMilliseconds

	var addMinutes$1 = __moduleExports$20

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

	var __moduleExports$159 = subMinutes

	var addMonths$3 = __moduleExports$21

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

	var __moduleExports$160 = subMonths

	var addQuarters$1 = __moduleExports$23

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

	var __moduleExports$161 = subQuarters

	var addSeconds$1 = __moduleExports$24

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

	var __moduleExports$162 = subSeconds

	var addWeeks$2 = __moduleExports$25

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

	var __moduleExports$163 = subWeeks

	var addYears$1 = __moduleExports$26

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

	var __moduleExports$164 = subYears

	var __moduleExports$6 = {
	  addDays: __moduleExports$7,
	  addHours: __moduleExports$10,
	  addISOYears: __moduleExports$12,
	  addMilliseconds: __moduleExports$11,
	  addMinutes: __moduleExports$20,
	  addMonths: __moduleExports$21,
	  addQuarters: __moduleExports$23,
	  addSeconds: __moduleExports$24,
	  addWeeks: __moduleExports$25,
	  addYears: __moduleExports$26,
	  areRangesOverlapping: __moduleExports$27,
	  closestIndexTo: __moduleExports$28,
	  closestTo: __moduleExports$29,
	  compareAsc: __moduleExports$30,
	  compareDesc: __moduleExports$31,
	  differenceInCalendarDays: __moduleExports$18,
	  differenceInCalendarISOWeeks: __moduleExports$32,
	  differenceInCalendarISOYears: __moduleExports$33,
	  differenceInCalendarMonths: __moduleExports$34,
	  differenceInCalendarQuarters: __moduleExports$35,
	  differenceInCalendarWeeks: __moduleExports$37,
	  differenceInCalendarYears: __moduleExports$38,
	  differenceInDays: __moduleExports$39,
	  differenceInHours: __moduleExports$40,
	  differenceInISOYears: __moduleExports$42,
	  differenceInMilliseconds: __moduleExports$41,
	  differenceInMinutes: __moduleExports$44,
	  differenceInMonths: __moduleExports$45,
	  differenceInQuarters: __moduleExports$46,
	  differenceInSeconds: __moduleExports$47,
	  differenceInWeeks: __moduleExports$48,
	  differenceInYears: __moduleExports$49,
	  distanceInWords: __moduleExports$50,
	  distanceInWordsStrict: __moduleExports$55,
	  distanceInWordsToNow: __moduleExports$56,
	  eachDay: __moduleExports$57,
	  endOfDay: __moduleExports$58,
	  endOfHour: __moduleExports$59,
	  endOfISOWeek: __moduleExports$60,
	  endOfISOYear: __moduleExports$62,
	  endOfMinute: __moduleExports$63,
	  endOfMonth: __moduleExports$64,
	  endOfQuarter: __moduleExports$65,
	  endOfSecond: __moduleExports$66,
	  endOfToday: __moduleExports$67,
	  endOfTomorrow: __moduleExports$68,
	  endOfWeek: __moduleExports$61,
	  endOfYear: __moduleExports$69,
	  endOfYesterday: __moduleExports$70,
	  format: __moduleExports$71,
	  getDate: __moduleExports$76,
	  getDay: __moduleExports$77,
	  getDayOfYear: __moduleExports$72,
	  getDaysInMonth: __moduleExports$22,
	  getDaysInYear: __moduleExports$78,
	  getHours: __moduleExports$80,
	  getISODay: __moduleExports$81,
	  getISOWeek: __moduleExports$74,
	  getISOWeeksInYear: __moduleExports$82,
	  getISOYear: __moduleExports$13,
	  getMilliseconds: __moduleExports$83,
	  getMinutes: __moduleExports$84,
	  getMonth: __moduleExports$85,
	  getOverlappingDaysInRanges: __moduleExports$86,
	  getQuarter: __moduleExports$36,
	  getSeconds: __moduleExports$87,
	  getTime: __moduleExports$88,
	  getYear: __moduleExports$89,
	  isAfter: __moduleExports$90,
	  isBefore: __moduleExports$91,
	  isDate: __moduleExports$9,
	  isEqual: __moduleExports$92,
	  isFirstDayOfMonth: __moduleExports$93,
	  isFriday: __moduleExports$94,
	  isFuture: __moduleExports$95,
	  isLastDayOfMonth: __moduleExports$96,
	  isLeapYear: __moduleExports$79,
	  isMonday: __moduleExports$97,
	  isPast: __moduleExports$98,
	  isSameDay: __moduleExports$99,
	  isSameHour: __moduleExports$100,
	  isSameISOWeek: __moduleExports$102,
	  isSameISOYear: __moduleExports$104,
	  isSameMinute: __moduleExports$105,
	  isSameMonth: __moduleExports$107,
	  isSameQuarter: __moduleExports$108,
	  isSameSecond: __moduleExports$110,
	  isSameWeek: __moduleExports$103,
	  isSameYear: __moduleExports$112,
	  isSaturday: __moduleExports$113,
	  isSunday: __moduleExports$114,
	  isThisHour: __moduleExports$115,
	  isThisISOWeek: __moduleExports$116,
	  isThisISOYear: __moduleExports$117,
	  isThisMinute: __moduleExports$118,
	  isThisMonth: __moduleExports$119,
	  isThisQuarter: __moduleExports$120,
	  isThisSecond: __moduleExports$121,
	  isThisWeek: __moduleExports$122,
	  isThisYear: __moduleExports$123,
	  isThursday: __moduleExports$124,
	  isToday: __moduleExports$125,
	  isTomorrow: __moduleExports$126,
	  isTuesday: __moduleExports$127,
	  isValid: __moduleExports$75,
	  isWednesday: __moduleExports$128,
	  isWeekend: __moduleExports$129,
	  isWithinRange: __moduleExports$130,
	  isYesterday: __moduleExports$131,
	  lastDayOfISOWeek: __moduleExports$132,
	  lastDayOfISOYear: __moduleExports$134,
	  lastDayOfMonth: __moduleExports$135,
	  lastDayOfQuarter: __moduleExports$136,
	  lastDayOfWeek: __moduleExports$133,
	  lastDayOfYear: __moduleExports$137,
	  max: __moduleExports$138,
	  min: __moduleExports$139,
	  parse: __moduleExports$8,
	  setDate: __moduleExports$140,
	  setDay: __moduleExports$141,
	  setDayOfYear: __moduleExports$142,
	  setHours: __moduleExports$143,
	  setISODay: __moduleExports$144,
	  setISOWeek: __moduleExports$145,
	  setISOYear: __moduleExports$16,
	  setMilliseconds: __moduleExports$146,
	  setMinutes: __moduleExports$147,
	  setMonth: __moduleExports$148,
	  setQuarter: __moduleExports$149,
	  setSeconds: __moduleExports$150,
	  setYear: __moduleExports$151,
	  startOfDay: __moduleExports$19,
	  startOfHour: __moduleExports$101,
	  startOfISOWeek: __moduleExports$14,
	  startOfISOYear: __moduleExports$17,
	  startOfMinute: __moduleExports$106,
	  startOfMonth: __moduleExports$152,
	  startOfQuarter: __moduleExports$109,
	  startOfSecond: __moduleExports$111,
	  startOfToday: __moduleExports$153,
	  startOfTomorrow: __moduleExports$154,
	  startOfWeek: __moduleExports$15,
	  startOfYear: __moduleExports$73,
	  startOfYesterday: __moduleExports$155,
	  subDays: __moduleExports$156,
	  subHours: __moduleExports$157,
	  subISOYears: __moduleExports$43,
	  subMilliseconds: __moduleExports$158,
	  subMinutes: __moduleExports$159,
	  subMonths: __moduleExports$160,
	  subQuarters: __moduleExports$161,
	  subSeconds: __moduleExports$162,
	  subWeeks: __moduleExports$163,
	  subYears: __moduleExports$164
	}

	var __moduleExports = createCommonjsModule(function (module, exports) {
	"use strict";

	var _interopRequireDefault = __moduleExports$1;

	var _slicedToArray2 = _interopRequireDefault(__moduleExports$2);

	var _require = __moduleExports$6,
	    setDay = _require.setDay,
	    setISOWeek = _require.setISOWeek,
	    setISOYear = _require.setISOYear,
	    setYear = _require.setYear,
	    subWeeks = _require.subWeeks,
	    addWeeks = _require.addWeeks,
	    addMonths = _require.addMonths,
	    setMonth = _require.setMonth,
	    setDate = _require.setDate,
	    subMonths = _require.subMonths,
	    format = _require.format,
	    endOfMonth = _require.endOfMonth;

	var weeklyReportingPeriodFormat = 'GGGG[-W]WW';
	var bimonthlyReportingPeriodFormat = 'GGGG[-M]MM';
	var snapshotDateFormat = 'YYYY-MM-DD';

	exports.reportIdToReportingPeriodProps = function (periodType, id) {
	  switch (periodType) {
	    case 'weekly':
	      {
	        var _id$match = id.match(/:week:(([0-9]{4})-[W]([0-9]{1,2}))/),
	            _id$match2 = (0, _slicedToArray2.default)(_id$match, 4),
	            reportingPeriod = _id$match2[1],
	            year = _id$match2[2],
	            week = _id$match2[3]; // Compensate for the stock reports that have one-digit week number (2017-W5, 2017-W6)


	        if (/W[0-9]$/.test(reportingPeriod)) {
	          reportingPeriod = reportingPeriod.replace('W', 'W0');
	        }

	        return {
	          year: parseInt(year, 10),
	          week: parseInt(week, 10),
	          reportingPeriod: reportingPeriod
	        };
	      }

	    case 'bimonthly':
	      {
	        var _id$match3 = id.match(/:bimonth:(([0-9]{4})-[M]([0-9]{2}))/),
	            _id$match4 = (0, _slicedToArray2.default)(_id$match3, 4),
	            _reportingPeriod = _id$match4[1],
	            _year = _id$match4[2],
	            month = _id$match4[3];

	        return {
	          year: parseInt(_year, 10),
	          month: parseInt(month, 10),
	          reportingPeriod: _reportingPeriod
	        };
	      }

	    default:
	      throw new Error('Unkown reporting period type: ' + periodType);
	  }
	};

	exports.dateToReportingPeriod = function dateToReportingPeriod(periodType) {
	  var date = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new Date().toISOString();

	  switch (periodType) {
	    case 'weekly':
	      if (date.includes('-W')) {
	        // date is already a reporting period
	        return date;
	      }

	      return format(date, weeklyReportingPeriodFormat);

	    case 'bimonthly':
	      if (date.includes('-M')) {
	        // date is already a reporting period
	        return date;
	      }

	      var d = new Date(date);
	      var m = d.getMonth();
	      m = m - m % 2;
	      return format(setMonth(d, m), bimonthlyReportingPeriodFormat);

	    default:
	      throw new Error('Unkown reporting period type: ' + periodType);
	  }
	};

	exports.previousReportingPeriod = function previousReportingPeriod(periodType) {
	  var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
	  period = period || exports.dateToReportingPeriod(periodType);

	  switch (periodType) {
	    case 'weekly':
	      {
	        var _period$split = period.split('-W'),
	            _period$split2 = (0, _slicedToArray2.default)(_period$split, 2),
	            year = _period$split2[0],
	            week = _period$split2[1];

	        var date = setISOWeek(new Date(), parseInt(week, 10));
	        date = setISOYear(date, parseInt(year, 10));
	        var prevWeek = subWeeks(date, 1);
	        return format(prevWeek, weeklyReportingPeriodFormat);
	      }

	    case 'bimonthly':
	      {
	        var _period$split3 = period.split('-M'),
	            _period$split4 = (0, _slicedToArray2.default)(_period$split3, 2),
	            _year2 = _period$split4[0],
	            month = _period$split4[1];

	        var _date = setMonth(new Date(), parseInt(month - 1, 10));

	        _date = setYear(_date, parseInt(_year2, 10));
	        var nextBiMonth = subMonths(_date, 2);
	        return format(nextBiMonth, bimonthlyReportingPeriodFormat);
	      }

	    default:
	      throw new Error('Unkown reporting period type: ' + periodType);
	  }
	};

	exports.nextReportingPeriod = function nextReportingPeriod(periodType) {
	  var period = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
	  period = period || exports.dateToReportingPeriod(periodType);

	  switch (periodType) {
	    case 'weekly':
	      {
	        var _period$split5 = period.split('-W'),
	            _period$split6 = (0, _slicedToArray2.default)(_period$split5, 2),
	            year = _period$split6[0],
	            week = _period$split6[1];

	        var date = setISOWeek(new Date(), parseInt(week, 10));
	        date = setISOYear(date, parseInt(year, 10));
	        var nextWeek = addWeeks(date, 1);
	        return format(nextWeek, weeklyReportingPeriodFormat);
	      }

	    case 'bimonthly':
	      {
	        var _period$split7 = period.split('-M'),
	            _period$split8 = (0, _slicedToArray2.default)(_period$split7, 2),
	            _year3 = _period$split8[0],
	            month = _period$split8[1];

	        var _date2 = setMonth(new Date(), parseInt(month - 1, 10));

	        _date2 = setYear(_date2, parseInt(_year3, 10));
	        var nextBiMonth = addMonths(_date2, 2);
	        return format(nextBiMonth, bimonthlyReportingPeriodFormat);
	      }

	    default:
	      throw new Error('Unkown reporting period type: ' + periodType);
	  }
	};

	exports.reportingPeriodToDate = function reportingPeriodToDate(reportPeriod) {
	  var _reportPeriod$split = reportPeriod.split(/-(W|M)/),
	      _reportPeriod$split2 = (0, _slicedToArray2.default)(_reportPeriod$split, 3),
	      year = _reportPeriod$split2[0],
	      period = _reportPeriod$split2[1],
	      time = _reportPeriod$split2[2];

	  var date;

	  switch (period) {
	    case 'W':
	      date = setISOWeek(new Date(), parseInt(time, 10));
	      date = setISOYear(date, parseInt(year, 10)); // Week starts on Sunday in date-fns, so friday is 5
	      // https://date-fns.org/v1.29.0/docs/setDay

	      date = setDay(new Date(date), 5);
	      return format(date, snapshotDateFormat);

	    case 'M':
	      // This is a little workaround to make sure this function
	      // gives the right result in Minus (less than GMT) timezones
	      // - set date to 3, then apply month
	      // - then set date to 1
	      date = setMonth(new Date(year, 1, 3), parseInt(time - 1, 10));
	      date = setDate(date, 1);
	      return format(date, snapshotDateFormat);

	    default:
	      throw new Error('Unkown reporting period type for date: ' + reportPeriod);
	  }
	};

	exports.endOfReportingPeriodToDate = function endOfReportingPeriod(reportPeriod) {
	  var _reportPeriod$split3 = reportPeriod.split(/-(W|M)/),
	      _reportPeriod$split4 = (0, _slicedToArray2.default)(_reportPeriod$split3, 2),
	      period = _reportPeriod$split4[1];

	  if (!(period === 'W' || period === 'M')) {
	    throw new Error('Unkown reporting period type for date: ' + reportPeriod);
	  }

	  var date = exports.reportingPeriodToDate(reportPeriod); // Report end for weekly reports is Friday (not Sunday), which
	  // reportingPeriodToDate already handles

	  var endDate = date;

	  if (period === 'M') {
	    endDate = addMonths(new Date(date), 1);
	    endDate = endOfMonth(endDate);
	  }

	  return format(endDate, snapshotDateFormat);
	};
	});

	var dateUtils_1 = __moduleExports.reportIdToReportingPeriodProps;
	var dateUtils_2 = __moduleExports.dateToReportingPeriod;
	var dateUtils_3 = __moduleExports.previousReportingPeriod;
	var dateUtils_4 = __moduleExports.nextReportingPeriod;
	var dateUtils_5 = __moduleExports.reportingPeriodToDate;
	var dateUtils_6 = __moduleExports.endOfReportingPeriodToDate;

	var _interopRequireDefault$1 = __moduleExports$1;

	var _slicedToArray2$1 = _interopRequireDefault$1(__moduleExports$2);

	var __moduleExports$167 = locationIdToProperties$2;

	function locationIdToProperties$2(id) {
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

	  var _ref = id.match(/zone:([^:]+)/) || [],
	      _ref2 = (0, _slicedToArray2$1.default)(_ref, 2),
	      zone = _ref2[1];

	  var _ref3 = id.match(/state:([^:]+)/) || [],
	      _ref4 = (0, _slicedToArray2$1.default)(_ref3, 2),
	      state = _ref4[1];

	  var _ref5 = id.match(/lga:([^:]+)/) || [],
	      _ref6 = (0, _slicedToArray2$1.default)(_ref5, 2),
	      lga = _ref6[1];

	  var _ref7 = id.match(/sdp:([^:]+)/) || [],
	      _ref8 = (0, _slicedToArray2$1.default)(_ref7, 2),
	      sdp = _ref8[1];

	  var _ref9 = id.match(/name:([^:]+)/) || [],
	      _ref10 = (0, _slicedToArray2$1.default)(_ref9, 2),
	      name = _ref10[1];

	  var properties = {
	    zone: zone
	  };
	  properties.level = 'zone';
	  var locationId = "zone:".concat(zone);

	  if (state) {
	    properties.state = state;
	    properties.level = 'state';
	    locationId += ":state:".concat(state);
	  }

	  if (lga) {
	    properties.lga = lga;
	    properties.level = 'lga';
	    locationId += ":lga:".concat(lga);
	  }

	  if (sdp) {
	    properties.sdp = sdp;
	    properties.level = 'sdp';
	    locationId += ":sdp:".concat(sdp);
	  }

	  if (name) {
	    properties.name = name;
	    locationId += ":name:".concat(name);
	  }

	  return Object.assign({}, properties, {
	    id: locationId
	  });
	}

	var _interopRequireDefault = __moduleExports$1;

	var _slicedToArray2 = _interopRequireDefault(__moduleExports$2);

	var __moduleExports$166 = stockCountIdToLocationProperties$2;

	var locationIdToProperties$1 = __moduleExports$167;

	function stockCountIdToLocationProperties$2(id) {
	  if (id.startsWith('national')) {
	    return locationIdToProperties$1('national');
	  } // The id will contain a period, e.g. "week:2017-W01" somewhere and we
	  // need to remove that. The rest will be the location properties.


	  var _id$match = id.match(/^(.+)(?:(?:week|bimonth):[0-9]{4}-.[0-9]{1,2}:?)(.*)$/),
	      _id$match2 = (0, _slicedToArray2.default)(_id$match, 3),
	      part1 = _id$match2[1],
	      part2 = _id$match2[2];

	  var locationId = part1 + part2;
	  return locationIdToProperties$1(locationId);
	}

	var __moduleExports$169 = locationIdToSubmitProperties$2;

	var locationIdToProperties$3 = __moduleExports$167; // This can be removed when the information has somehow been included
	// in location docs


	function locationIdToSubmitProperties$2(locationId) {
	  var location = locationIdToProperties$3(locationId);

	  switch (location.level) {
	    case 'zone':
	    case 'national':
	      return {
	        submitsOwnReport: true,
	        submitsChildrenReport: false,
	        submitsBatchedCounts: true,
	        submitsMultiFieldCounts: false
	      };

	    case 'state':
	      return {
	        submitsOwnReport: true,
	        submitsChildrenReport: true,
	        submitsBatchedCounts: true,
	        submitsMultiFieldCounts: false
	      };

	    case 'sdp':
	      return {
	        submitsOwnReport: false,
	        submitsChildrenReport: false,
	        submitsBatchedCounts: false,
	        submitsMultiFieldCounts: true
	      };

	    default:
	      return {
	        submitsOwnReport: false,
	        submitsChildrenReport: false,
	        submitsBatchedCounts: false,
	        submitsMultiFieldCounts: false
	      };
	  }
	}

	var __moduleExports$168 = shouldTrackBatches$2;

	var locationIdToSubmitProperties$1 = __moduleExports$169;

	function shouldTrackBatches$2(params) {
	  var location = params.location,
	      _params$product = params.product,
	      product = _params$product === void 0 ? {} : _params$product;

	  if (location && !locationIdToSubmitProperties$1(location.id).submitsBatchedCounts) {
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

	var __moduleExports$170 = createCommonjsModule(function (module, exports) {
	!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?module.exports=n():"function"==typeof undefined&&undefined.amd?undefined(n):e.dlv=n()}(commonjsGlobal,function(){function e(e,n,t,o){for(o=0,n=n.split?n.split("."):n;e&&o<n.length;)e=e[n[o++]];return void 0===e?t:e}return e});
	});

	var __moduleExports$171 = {
	  NOT_STARTED: 'notStarted',
	  IN_PROGRESS: 'inProgress',
	  COMPLETE: 'complete'
	};

	var stockCountIdToLocationProperties$1 = __moduleExports$166;

	var shouldTrackBatches$1 = __moduleExports$168;

	var dlv = __moduleExports$170;

	var _require$1 = __moduleExports$171;
	var NOT_STARTED = _require$1.NOT_STARTED;
	var IN_PROGRESS = _require$1.IN_PROGRESS;
	var COMPLETE = _require$1.COMPLETE;
	var reportProgress$1 = function reportProgress(doc, relevantProducts) {
	  // report has no `stock` or `stock: {}` => hasn't been started
	  if (!(doc.stock && Object.keys(doc.stock).length)) {
	    return NOT_STARTED;
	  }

	  if (doc.submittedAt) {
	    return COMPLETE;
	  }

	  var locationId = stockCountIdToLocationProperties$1(doc._id).id; // is in progress when `stock` field contains a non empty object
	  // and one of the following is true

	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = relevantProducts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var product = _step.value;
	      var productStock = doc.stock[product._id]; // the counts for any product are missing

	      if (!productStock) {
	        return IN_PROGRESS;
	      }

	      if (!Object.keys(productStock).length) {
	        return IN_PROGRESS;
	      }

	      var isBatchTrackedForProduct = shouldTrackBatches$1({
	        product: product,
	        location: {
	          id: locationId
	        }
	      }); // is missing an `amount` for any non batch tracking product

	      if (!isBatchTrackedForProduct) {
	        if (typeof dlv(productStock, 'amount') === 'undefined') {
	          return IN_PROGRESS;
	        }

	        continue;
	      }

	      var batches = dlv(productStock, 'batches', {}); // is missing `batches` for any batch tracking product

	      if (!Object.keys(batches).length) {
	        return IN_PROGRESS;
	      } // is missing `amount` for any batch in a batch tracking product


	      var _arr = Object.keys(batches);

	      for (var _i = 0; _i < _arr.length; _i++) {
	        var batchId = _arr[_i];
	        var batch = batches[batchId];

	        if (typeof batch.amount === 'undefined') {
	          return IN_PROGRESS;
	        }
	      }
	    }
	  } catch (err) {
	    _didIteratorError = true;
	    _iteratorError = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion && _iterator.return != null) {
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

	var __moduleExports$165 = reportProgress$1;

	var __moduleExports$173 = createCommonjsModule(function (module, exports) {
	/**
	 * lodash (Custom Build) <https://lodash.com/>
	 * Build: `lodash modularize exports="npm" -o ./`
	 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
	 * Released under MIT license <https://lodash.com/license>
	 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	 */

	/** Used as the size to enable large array optimizations. */
	var LARGE_ARRAY_SIZE = 200;

	/** Used to stand-in for `undefined` hash values. */
	var HASH_UNDEFINED = '__lodash_hash_undefined__';

	/** Used as references for various `Number` constants. */
	var MAX_SAFE_INTEGER = 9007199254740991;

	/** `Object#toString` result references. */
	var argsTag = '[object Arguments]',
	    arrayTag = '[object Array]',
	    boolTag = '[object Boolean]',
	    dateTag = '[object Date]',
	    errorTag = '[object Error]',
	    funcTag = '[object Function]',
	    genTag = '[object GeneratorFunction]',
	    mapTag = '[object Map]',
	    numberTag = '[object Number]',
	    objectTag = '[object Object]',
	    promiseTag = '[object Promise]',
	    regexpTag = '[object RegExp]',
	    setTag = '[object Set]',
	    stringTag = '[object String]',
	    symbolTag = '[object Symbol]',
	    weakMapTag = '[object WeakMap]';

	var arrayBufferTag = '[object ArrayBuffer]',
	    dataViewTag = '[object DataView]',
	    float32Tag = '[object Float32Array]',
	    float64Tag = '[object Float64Array]',
	    int8Tag = '[object Int8Array]',
	    int16Tag = '[object Int16Array]',
	    int32Tag = '[object Int32Array]',
	    uint8Tag = '[object Uint8Array]',
	    uint8ClampedTag = '[object Uint8ClampedArray]',
	    uint16Tag = '[object Uint16Array]',
	    uint32Tag = '[object Uint32Array]';

	/**
	 * Used to match `RegExp`
	 * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
	 */
	var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

	/** Used to match `RegExp` flags from their coerced string values. */
	var reFlags = /\w*$/;

	/** Used to detect host constructors (Safari). */
	var reIsHostCtor = /^\[object .+?Constructor\]$/;

	/** Used to detect unsigned integer values. */
	var reIsUint = /^(?:0|[1-9]\d*)$/;

	/** Used to identify `toStringTag` values supported by `_.clone`. */
	var cloneableTags = {};
	cloneableTags[argsTag] = cloneableTags[arrayTag] =
	cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] =
	cloneableTags[boolTag] = cloneableTags[dateTag] =
	cloneableTags[float32Tag] = cloneableTags[float64Tag] =
	cloneableTags[int8Tag] = cloneableTags[int16Tag] =
	cloneableTags[int32Tag] = cloneableTags[mapTag] =
	cloneableTags[numberTag] = cloneableTags[objectTag] =
	cloneableTags[regexpTag] = cloneableTags[setTag] =
	cloneableTags[stringTag] = cloneableTags[symbolTag] =
	cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] =
	cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
	cloneableTags[errorTag] = cloneableTags[funcTag] =
	cloneableTags[weakMapTag] = false;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Detect free variable `exports`. */
	var freeExports = typeof exports == 'object' && exports && !exports.nodeType && exports;

	/** Detect free variable `module`. */
	var freeModule = freeExports && typeof module == 'object' && module && !module.nodeType && module;

	/** Detect the popular CommonJS extension `module.exports`. */
	var moduleExports = freeModule && freeModule.exports === freeExports;

	/**
	 * Adds the key-value `pair` to `map`.
	 *
	 * @private
	 * @param {Object} map The map to modify.
	 * @param {Array} pair The key-value pair to add.
	 * @returns {Object} Returns `map`.
	 */
	function addMapEntry(map, pair) {
	  // Don't return `map.set` because it's not chainable in IE 11.
	  map.set(pair[0], pair[1]);
	  return map;
	}

	/**
	 * Adds `value` to `set`.
	 *
	 * @private
	 * @param {Object} set The set to modify.
	 * @param {*} value The value to add.
	 * @returns {Object} Returns `set`.
	 */
	function addSetEntry(set, value) {
	  // Don't return `set.add` because it's not chainable in IE 11.
	  set.add(value);
	  return set;
	}

	/**
	 * A specialized version of `_.forEach` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns `array`.
	 */
	function arrayEach(array, iteratee) {
	  var index = -1,
	      length = array ? array.length : 0;

	  while (++index < length) {
	    if (iteratee(array[index], index, array) === false) {
	      break;
	    }
	  }
	  return array;
	}

	/**
	 * Appends the elements of `values` to `array`.
	 *
	 * @private
	 * @param {Array} array The array to modify.
	 * @param {Array} values The values to append.
	 * @returns {Array} Returns `array`.
	 */
	function arrayPush(array, values) {
	  var index = -1,
	      length = values.length,
	      offset = array.length;

	  while (++index < length) {
	    array[offset + index] = values[index];
	  }
	  return array;
	}

	/**
	 * A specialized version of `_.reduce` for arrays without support for
	 * iteratee shorthands.
	 *
	 * @private
	 * @param {Array} [array] The array to iterate over.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @param {*} [accumulator] The initial value.
	 * @param {boolean} [initAccum] Specify using the first element of `array` as
	 *  the initial value.
	 * @returns {*} Returns the accumulated value.
	 */
	function arrayReduce(array, iteratee, accumulator, initAccum) {
	  var index = -1,
	      length = array ? array.length : 0;

	  if (initAccum && length) {
	    accumulator = array[++index];
	  }
	  while (++index < length) {
	    accumulator = iteratee(accumulator, array[index], index, array);
	  }
	  return accumulator;
	}

	/**
	 * The base implementation of `_.times` without support for iteratee shorthands
	 * or max array length checks.
	 *
	 * @private
	 * @param {number} n The number of times to invoke `iteratee`.
	 * @param {Function} iteratee The function invoked per iteration.
	 * @returns {Array} Returns the array of results.
	 */
	function baseTimes(n, iteratee) {
	  var index = -1,
	      result = Array(n);

	  while (++index < n) {
	    result[index] = iteratee(index);
	  }
	  return result;
	}

	/**
	 * Gets the value at `key` of `object`.
	 *
	 * @private
	 * @param {Object} [object] The object to query.
	 * @param {string} key The key of the property to get.
	 * @returns {*} Returns the property value.
	 */
	function getValue(object, key) {
	  return object == null ? undefined : object[key];
	}

	/**
	 * Checks if `value` is a host object in IE < 9.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
	 */
	function isHostObject(value) {
	  // Many host objects are `Object` objects that can coerce to strings
	  // despite having improperly defined `toString` methods.
	  var result = false;
	  if (value != null && typeof value.toString != 'function') {
	    try {
	      result = !!(value + '');
	    } catch (e) {}
	  }
	  return result;
	}

	/**
	 * Converts `map` to its key-value pairs.
	 *
	 * @private
	 * @param {Object} map The map to convert.
	 * @returns {Array} Returns the key-value pairs.
	 */
	function mapToArray(map) {
	  var index = -1,
	      result = Array(map.size);

	  map.forEach(function(value, key) {
	    result[++index] = [key, value];
	  });
	  return result;
	}

	/**
	 * Creates a unary function that invokes `func` with its argument transformed.
	 *
	 * @private
	 * @param {Function} func The function to wrap.
	 * @param {Function} transform The argument transform.
	 * @returns {Function} Returns the new function.
	 */
	function overArg(func, transform) {
	  return function(arg) {
	    return func(transform(arg));
	  };
	}

	/**
	 * Converts `set` to an array of its values.
	 *
	 * @private
	 * @param {Object} set The set to convert.
	 * @returns {Array} Returns the values.
	 */
	function setToArray(set) {
	  var index = -1,
	      result = Array(set.size);

	  set.forEach(function(value) {
	    result[++index] = value;
	  });
	  return result;
	}

	/** Used for built-in method references. */
	var arrayProto = Array.prototype,
	    funcProto = Function.prototype,
	    objectProto = Object.prototype;

	/** Used to detect overreaching core-js shims. */
	var coreJsData = root['__core-js_shared__'];

	/** Used to detect methods masquerading as native. */
	var maskSrcKey = (function() {
	  var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
	  return uid ? ('Symbol(src)_1.' + uid) : '';
	}());

	/** Used to resolve the decompiled source of functions. */
	var funcToString = funcProto.toString;

	/** Used to check objects for own properties. */
	var hasOwnProperty = objectProto.hasOwnProperty;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/** Used to detect if a method is native. */
	var reIsNative = RegExp('^' +
	  funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
	  .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
	);

	/** Built-in value references. */
	var Buffer = moduleExports ? root.Buffer : undefined,
	    Symbol = root.Symbol,
	    Uint8Array = root.Uint8Array,
	    getPrototype = overArg(Object.getPrototypeOf, Object),
	    objectCreate = Object.create,
	    propertyIsEnumerable = objectProto.propertyIsEnumerable,
	    splice = arrayProto.splice;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeGetSymbols = Object.getOwnPropertySymbols,
	    nativeIsBuffer = Buffer ? Buffer.isBuffer : undefined,
	    nativeKeys = overArg(Object.keys, Object);

	/* Built-in method references that are verified to be native. */
	var DataView = getNative(root, 'DataView'),
	    Map = getNative(root, 'Map'),
	    Promise = getNative(root, 'Promise'),
	    Set = getNative(root, 'Set'),
	    WeakMap = getNative(root, 'WeakMap'),
	    nativeCreate = getNative(Object, 'create');

	/** Used to detect maps, sets, and weakmaps. */
	var dataViewCtorString = toSource(DataView),
	    mapCtorString = toSource(Map),
	    promiseCtorString = toSource(Promise),
	    setCtorString = toSource(Set),
	    weakMapCtorString = toSource(WeakMap);

	/** Used to convert symbols to primitives and strings. */
	var symbolProto = Symbol ? Symbol.prototype : undefined,
	    symbolValueOf = symbolProto ? symbolProto.valueOf : undefined;

	/**
	 * Creates a hash object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Hash(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the hash.
	 *
	 * @private
	 * @name clear
	 * @memberOf Hash
	 */
	function hashClear() {
	  this.__data__ = nativeCreate ? nativeCreate(null) : {};
	}

	/**
	 * Removes `key` and its value from the hash.
	 *
	 * @private
	 * @name delete
	 * @memberOf Hash
	 * @param {Object} hash The hash to modify.
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function hashDelete(key) {
	  return this.has(key) && delete this.__data__[key];
	}

	/**
	 * Gets the hash value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Hash
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function hashGet(key) {
	  var data = this.__data__;
	  if (nativeCreate) {
	    var result = data[key];
	    return result === HASH_UNDEFINED ? undefined : result;
	  }
	  return hasOwnProperty.call(data, key) ? data[key] : undefined;
	}

	/**
	 * Checks if a hash value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Hash
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function hashHas(key) {
	  var data = this.__data__;
	  return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
	}

	/**
	 * Sets the hash `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Hash
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the hash instance.
	 */
	function hashSet(key, value) {
	  var data = this.__data__;
	  data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
	  return this;
	}

	// Add methods to `Hash`.
	Hash.prototype.clear = hashClear;
	Hash.prototype['delete'] = hashDelete;
	Hash.prototype.get = hashGet;
	Hash.prototype.has = hashHas;
	Hash.prototype.set = hashSet;

	/**
	 * Creates an list cache object.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function ListCache(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the list cache.
	 *
	 * @private
	 * @name clear
	 * @memberOf ListCache
	 */
	function listCacheClear() {
	  this.__data__ = [];
	}

	/**
	 * Removes `key` and its value from the list cache.
	 *
	 * @private
	 * @name delete
	 * @memberOf ListCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function listCacheDelete(key) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  if (index < 0) {
	    return false;
	  }
	  var lastIndex = data.length - 1;
	  if (index == lastIndex) {
	    data.pop();
	  } else {
	    splice.call(data, index, 1);
	  }
	  return true;
	}

	/**
	 * Gets the list cache value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf ListCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function listCacheGet(key) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  return index < 0 ? undefined : data[index][1];
	}

	/**
	 * Checks if a list cache value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf ListCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function listCacheHas(key) {
	  return assocIndexOf(this.__data__, key) > -1;
	}

	/**
	 * Sets the list cache `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf ListCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the list cache instance.
	 */
	function listCacheSet(key, value) {
	  var data = this.__data__,
	      index = assocIndexOf(data, key);

	  if (index < 0) {
	    data.push([key, value]);
	  } else {
	    data[index][1] = value;
	  }
	  return this;
	}

	// Add methods to `ListCache`.
	ListCache.prototype.clear = listCacheClear;
	ListCache.prototype['delete'] = listCacheDelete;
	ListCache.prototype.get = listCacheGet;
	ListCache.prototype.has = listCacheHas;
	ListCache.prototype.set = listCacheSet;

	/**
	 * Creates a map cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function MapCache(entries) {
	  var index = -1,
	      length = entries ? entries.length : 0;

	  this.clear();
	  while (++index < length) {
	    var entry = entries[index];
	    this.set(entry[0], entry[1]);
	  }
	}

	/**
	 * Removes all key-value entries from the map.
	 *
	 * @private
	 * @name clear
	 * @memberOf MapCache
	 */
	function mapCacheClear() {
	  this.__data__ = {
	    'hash': new Hash,
	    'map': new (Map || ListCache),
	    'string': new Hash
	  };
	}

	/**
	 * Removes `key` and its value from the map.
	 *
	 * @private
	 * @name delete
	 * @memberOf MapCache
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function mapCacheDelete(key) {
	  return getMapData(this, key)['delete'](key);
	}

	/**
	 * Gets the map value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf MapCache
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function mapCacheGet(key) {
	  return getMapData(this, key).get(key);
	}

	/**
	 * Checks if a map value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf MapCache
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function mapCacheHas(key) {
	  return getMapData(this, key).has(key);
	}

	/**
	 * Sets the map `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf MapCache
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the map cache instance.
	 */
	function mapCacheSet(key, value) {
	  getMapData(this, key).set(key, value);
	  return this;
	}

	// Add methods to `MapCache`.
	MapCache.prototype.clear = mapCacheClear;
	MapCache.prototype['delete'] = mapCacheDelete;
	MapCache.prototype.get = mapCacheGet;
	MapCache.prototype.has = mapCacheHas;
	MapCache.prototype.set = mapCacheSet;

	/**
	 * Creates a stack cache object to store key-value pairs.
	 *
	 * @private
	 * @constructor
	 * @param {Array} [entries] The key-value pairs to cache.
	 */
	function Stack(entries) {
	  this.__data__ = new ListCache(entries);
	}

	/**
	 * Removes all key-value entries from the stack.
	 *
	 * @private
	 * @name clear
	 * @memberOf Stack
	 */
	function stackClear() {
	  this.__data__ = new ListCache;
	}

	/**
	 * Removes `key` and its value from the stack.
	 *
	 * @private
	 * @name delete
	 * @memberOf Stack
	 * @param {string} key The key of the value to remove.
	 * @returns {boolean} Returns `true` if the entry was removed, else `false`.
	 */
	function stackDelete(key) {
	  return this.__data__['delete'](key);
	}

	/**
	 * Gets the stack value for `key`.
	 *
	 * @private
	 * @name get
	 * @memberOf Stack
	 * @param {string} key The key of the value to get.
	 * @returns {*} Returns the entry value.
	 */
	function stackGet(key) {
	  return this.__data__.get(key);
	}

	/**
	 * Checks if a stack value for `key` exists.
	 *
	 * @private
	 * @name has
	 * @memberOf Stack
	 * @param {string} key The key of the entry to check.
	 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
	 */
	function stackHas(key) {
	  return this.__data__.has(key);
	}

	/**
	 * Sets the stack `key` to `value`.
	 *
	 * @private
	 * @name set
	 * @memberOf Stack
	 * @param {string} key The key of the value to set.
	 * @param {*} value The value to set.
	 * @returns {Object} Returns the stack cache instance.
	 */
	function stackSet(key, value) {
	  var cache = this.__data__;
	  if (cache instanceof ListCache) {
	    var pairs = cache.__data__;
	    if (!Map || (pairs.length < LARGE_ARRAY_SIZE - 1)) {
	      pairs.push([key, value]);
	      return this;
	    }
	    cache = this.__data__ = new MapCache(pairs);
	  }
	  cache.set(key, value);
	  return this;
	}

	// Add methods to `Stack`.
	Stack.prototype.clear = stackClear;
	Stack.prototype['delete'] = stackDelete;
	Stack.prototype.get = stackGet;
	Stack.prototype.has = stackHas;
	Stack.prototype.set = stackSet;

	/**
	 * Creates an array of the enumerable property names of the array-like `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @param {boolean} inherited Specify returning inherited property names.
	 * @returns {Array} Returns the array of property names.
	 */
	function arrayLikeKeys(value, inherited) {
	  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
	  // Safari 9 makes `arguments.length` enumerable in strict mode.
	  var result = (isArray(value) || isArguments(value))
	    ? baseTimes(value.length, String)
	    : [];

	  var length = result.length,
	      skipIndexes = !!length;

	  for (var key in value) {
	    if ((inherited || hasOwnProperty.call(value, key)) &&
	        !(skipIndexes && (key == 'length' || isIndex(key, length)))) {
	      result.push(key);
	    }
	  }
	  return result;
	}

	/**
	 * Assigns `value` to `key` of `object` if the existing value is not equivalent
	 * using [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * for equality comparisons.
	 *
	 * @private
	 * @param {Object} object The object to modify.
	 * @param {string} key The key of the property to assign.
	 * @param {*} value The value to assign.
	 */
	function assignValue(object, key, value) {
	  var objValue = object[key];
	  if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) ||
	      (value === undefined && !(key in object))) {
	    object[key] = value;
	  }
	}

	/**
	 * Gets the index at which the `key` is found in `array` of key-value pairs.
	 *
	 * @private
	 * @param {Array} array The array to inspect.
	 * @param {*} key The key to search for.
	 * @returns {number} Returns the index of the matched value, else `-1`.
	 */
	function assocIndexOf(array, key) {
	  var length = array.length;
	  while (length--) {
	    if (eq(array[length][0], key)) {
	      return length;
	    }
	  }
	  return -1;
	}

	/**
	 * The base implementation of `_.assign` without support for multiple sources
	 * or `customizer` functions.
	 *
	 * @private
	 * @param {Object} object The destination object.
	 * @param {Object} source The source object.
	 * @returns {Object} Returns `object`.
	 */
	function baseAssign(object, source) {
	  return object && copyObject(source, keys(source), object);
	}

	/**
	 * The base implementation of `_.clone` and `_.cloneDeep` which tracks
	 * traversed objects.
	 *
	 * @private
	 * @param {*} value The value to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @param {boolean} [isFull] Specify a clone including symbols.
	 * @param {Function} [customizer] The function to customize cloning.
	 * @param {string} [key] The key of `value`.
	 * @param {Object} [object] The parent object of `value`.
	 * @param {Object} [stack] Tracks traversed objects and their clone counterparts.
	 * @returns {*} Returns the cloned value.
	 */
	function baseClone(value, isDeep, isFull, customizer, key, object, stack) {
	  var result;
	  if (customizer) {
	    result = object ? customizer(value, key, object, stack) : customizer(value);
	  }
	  if (result !== undefined) {
	    return result;
	  }
	  if (!isObject(value)) {
	    return value;
	  }
	  var isArr = isArray(value);
	  if (isArr) {
	    result = initCloneArray(value);
	    if (!isDeep) {
	      return copyArray(value, result);
	    }
	  } else {
	    var tag = getTag(value),
	        isFunc = tag == funcTag || tag == genTag;

	    if (isBuffer(value)) {
	      return cloneBuffer(value, isDeep);
	    }
	    if (tag == objectTag || tag == argsTag || (isFunc && !object)) {
	      if (isHostObject(value)) {
	        return object ? value : {};
	      }
	      result = initCloneObject(isFunc ? {} : value);
	      if (!isDeep) {
	        return copySymbols(value, baseAssign(result, value));
	      }
	    } else {
	      if (!cloneableTags[tag]) {
	        return object ? value : {};
	      }
	      result = initCloneByTag(value, tag, baseClone, isDeep);
	    }
	  }
	  // Check for circular references and return its corresponding clone.
	  stack || (stack = new Stack);
	  var stacked = stack.get(value);
	  if (stacked) {
	    return stacked;
	  }
	  stack.set(value, result);

	  if (!isArr) {
	    var props = isFull ? getAllKeys(value) : keys(value);
	  }
	  arrayEach(props || value, function(subValue, key) {
	    if (props) {
	      key = subValue;
	      subValue = value[key];
	    }
	    // Recursively populate clone (susceptible to call stack limits).
	    assignValue(result, key, baseClone(subValue, isDeep, isFull, customizer, key, value, stack));
	  });
	  return result;
	}

	/**
	 * The base implementation of `_.create` without support for assigning
	 * properties to the created object.
	 *
	 * @private
	 * @param {Object} prototype The object to inherit from.
	 * @returns {Object} Returns the new object.
	 */
	function baseCreate(proto) {
	  return isObject(proto) ? objectCreate(proto) : {};
	}

	/**
	 * The base implementation of `getAllKeys` and `getAllKeysIn` which uses
	 * `keysFunc` and `symbolsFunc` to get the enumerable property names and
	 * symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {Function} keysFunc The function to get the keys of `object`.
	 * @param {Function} symbolsFunc The function to get the symbols of `object`.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function baseGetAllKeys(object, keysFunc, symbolsFunc) {
	  var result = keysFunc(object);
	  return isArray(object) ? result : arrayPush(result, symbolsFunc(object));
	}

	/**
	 * The base implementation of `getTag`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	function baseGetTag(value) {
	  return objectToString.call(value);
	}

	/**
	 * The base implementation of `_.isNative` without bad shim checks.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a native function,
	 *  else `false`.
	 */
	function baseIsNative(value) {
	  if (!isObject(value) || isMasked(value)) {
	    return false;
	  }
	  var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
	  return pattern.test(toSource(value));
	}

	/**
	 * The base implementation of `_.keys` which doesn't treat sparse arrays as dense.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 */
	function baseKeys(object) {
	  if (!isPrototype(object)) {
	    return nativeKeys(object);
	  }
	  var result = [];
	  for (var key in Object(object)) {
	    if (hasOwnProperty.call(object, key) && key != 'constructor') {
	      result.push(key);
	    }
	  }
	  return result;
	}

	/**
	 * Creates a clone of  `buffer`.
	 *
	 * @private
	 * @param {Buffer} buffer The buffer to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Buffer} Returns the cloned buffer.
	 */
	function cloneBuffer(buffer, isDeep) {
	  if (isDeep) {
	    return buffer.slice();
	  }
	  var result = new buffer.constructor(buffer.length);
	  buffer.copy(result);
	  return result;
	}

	/**
	 * Creates a clone of `arrayBuffer`.
	 *
	 * @private
	 * @param {ArrayBuffer} arrayBuffer The array buffer to clone.
	 * @returns {ArrayBuffer} Returns the cloned array buffer.
	 */
	function cloneArrayBuffer(arrayBuffer) {
	  var result = new arrayBuffer.constructor(arrayBuffer.byteLength);
	  new Uint8Array(result).set(new Uint8Array(arrayBuffer));
	  return result;
	}

	/**
	 * Creates a clone of `dataView`.
	 *
	 * @private
	 * @param {Object} dataView The data view to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned data view.
	 */
	function cloneDataView(dataView, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
	  return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
	}

	/**
	 * Creates a clone of `map`.
	 *
	 * @private
	 * @param {Object} map The map to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned map.
	 */
	function cloneMap(map, isDeep, cloneFunc) {
	  var array = isDeep ? cloneFunc(mapToArray(map), true) : mapToArray(map);
	  return arrayReduce(array, addMapEntry, new map.constructor);
	}

	/**
	 * Creates a clone of `regexp`.
	 *
	 * @private
	 * @param {Object} regexp The regexp to clone.
	 * @returns {Object} Returns the cloned regexp.
	 */
	function cloneRegExp(regexp) {
	  var result = new regexp.constructor(regexp.source, reFlags.exec(regexp));
	  result.lastIndex = regexp.lastIndex;
	  return result;
	}

	/**
	 * Creates a clone of `set`.
	 *
	 * @private
	 * @param {Object} set The set to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned set.
	 */
	function cloneSet(set, isDeep, cloneFunc) {
	  var array = isDeep ? cloneFunc(setToArray(set), true) : setToArray(set);
	  return arrayReduce(array, addSetEntry, new set.constructor);
	}

	/**
	 * Creates a clone of the `symbol` object.
	 *
	 * @private
	 * @param {Object} symbol The symbol object to clone.
	 * @returns {Object} Returns the cloned symbol object.
	 */
	function cloneSymbol(symbol) {
	  return symbolValueOf ? Object(symbolValueOf.call(symbol)) : {};
	}

	/**
	 * Creates a clone of `typedArray`.
	 *
	 * @private
	 * @param {Object} typedArray The typed array to clone.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the cloned typed array.
	 */
	function cloneTypedArray(typedArray, isDeep) {
	  var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
	  return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
	}

	/**
	 * Copies the values of `source` to `array`.
	 *
	 * @private
	 * @param {Array} source The array to copy values from.
	 * @param {Array} [array=[]] The array to copy values to.
	 * @returns {Array} Returns `array`.
	 */
	function copyArray(source, array) {
	  var index = -1,
	      length = source.length;

	  array || (array = Array(length));
	  while (++index < length) {
	    array[index] = source[index];
	  }
	  return array;
	}

	/**
	 * Copies properties of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy properties from.
	 * @param {Array} props The property identifiers to copy.
	 * @param {Object} [object={}] The object to copy properties to.
	 * @param {Function} [customizer] The function to customize copied values.
	 * @returns {Object} Returns `object`.
	 */
	function copyObject(source, props, object, customizer) {
	  object || (object = {});

	  var index = -1,
	      length = props.length;

	  while (++index < length) {
	    var key = props[index];

	    var newValue = customizer
	      ? customizer(object[key], source[key], key, object, source)
	      : undefined;

	    assignValue(object, key, newValue === undefined ? source[key] : newValue);
	  }
	  return object;
	}

	/**
	 * Copies own symbol properties of `source` to `object`.
	 *
	 * @private
	 * @param {Object} source The object to copy symbols from.
	 * @param {Object} [object={}] The object to copy symbols to.
	 * @returns {Object} Returns `object`.
	 */
	function copySymbols(source, object) {
	  return copyObject(source, getSymbols(source), object);
	}

	/**
	 * Creates an array of own enumerable property names and symbols of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names and symbols.
	 */
	function getAllKeys(object) {
	  return baseGetAllKeys(object, keys, getSymbols);
	}

	/**
	 * Gets the data for `map`.
	 *
	 * @private
	 * @param {Object} map The map to query.
	 * @param {string} key The reference key.
	 * @returns {*} Returns the map data.
	 */
	function getMapData(map, key) {
	  var data = map.__data__;
	  return isKeyable(key)
	    ? data[typeof key == 'string' ? 'string' : 'hash']
	    : data.map;
	}

	/**
	 * Gets the native function at `key` of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @param {string} key The key of the method to get.
	 * @returns {*} Returns the function if it's native, else `undefined`.
	 */
	function getNative(object, key) {
	  var value = getValue(object, key);
	  return baseIsNative(value) ? value : undefined;
	}

	/**
	 * Creates an array of the own enumerable symbol properties of `object`.
	 *
	 * @private
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of symbols.
	 */
	var getSymbols = nativeGetSymbols ? overArg(nativeGetSymbols, Object) : stubArray;

	/**
	 * Gets the `toStringTag` of `value`.
	 *
	 * @private
	 * @param {*} value The value to query.
	 * @returns {string} Returns the `toStringTag`.
	 */
	var getTag = baseGetTag;

	// Fallback for data views, maps, sets, and weak maps in IE 11,
	// for data views in Edge < 14, and promises in Node.js.
	if ((DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag) ||
	    (Map && getTag(new Map) != mapTag) ||
	    (Promise && getTag(Promise.resolve()) != promiseTag) ||
	    (Set && getTag(new Set) != setTag) ||
	    (WeakMap && getTag(new WeakMap) != weakMapTag)) {
	  getTag = function(value) {
	    var result = objectToString.call(value),
	        Ctor = result == objectTag ? value.constructor : undefined,
	        ctorString = Ctor ? toSource(Ctor) : undefined;

	    if (ctorString) {
	      switch (ctorString) {
	        case dataViewCtorString: return dataViewTag;
	        case mapCtorString: return mapTag;
	        case promiseCtorString: return promiseTag;
	        case setCtorString: return setTag;
	        case weakMapCtorString: return weakMapTag;
	      }
	    }
	    return result;
	  };
	}

	/**
	 * Initializes an array clone.
	 *
	 * @private
	 * @param {Array} array The array to clone.
	 * @returns {Array} Returns the initialized clone.
	 */
	function initCloneArray(array) {
	  var length = array.length,
	      result = array.constructor(length);

	  // Add properties assigned by `RegExp#exec`.
	  if (length && typeof array[0] == 'string' && hasOwnProperty.call(array, 'index')) {
	    result.index = array.index;
	    result.input = array.input;
	  }
	  return result;
	}

	/**
	 * Initializes an object clone.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneObject(object) {
	  return (typeof object.constructor == 'function' && !isPrototype(object))
	    ? baseCreate(getPrototype(object))
	    : {};
	}

	/**
	 * Initializes an object clone based on its `toStringTag`.
	 *
	 * **Note:** This function only supports cloning values with tags of
	 * `Boolean`, `Date`, `Error`, `Number`, `RegExp`, or `String`.
	 *
	 * @private
	 * @param {Object} object The object to clone.
	 * @param {string} tag The `toStringTag` of the object to clone.
	 * @param {Function} cloneFunc The function to clone values.
	 * @param {boolean} [isDeep] Specify a deep clone.
	 * @returns {Object} Returns the initialized clone.
	 */
	function initCloneByTag(object, tag, cloneFunc, isDeep) {
	  var Ctor = object.constructor;
	  switch (tag) {
	    case arrayBufferTag:
	      return cloneArrayBuffer(object);

	    case boolTag:
	    case dateTag:
	      return new Ctor(+object);

	    case dataViewTag:
	      return cloneDataView(object, isDeep);

	    case float32Tag: case float64Tag:
	    case int8Tag: case int16Tag: case int32Tag:
	    case uint8Tag: case uint8ClampedTag: case uint16Tag: case uint32Tag:
	      return cloneTypedArray(object, isDeep);

	    case mapTag:
	      return cloneMap(object, isDeep, cloneFunc);

	    case numberTag:
	    case stringTag:
	      return new Ctor(object);

	    case regexpTag:
	      return cloneRegExp(object);

	    case setTag:
	      return cloneSet(object, isDeep, cloneFunc);

	    case symbolTag:
	      return cloneSymbol(object);
	  }
	}

	/**
	 * Checks if `value` is a valid array-like index.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @param {number} [length=MAX_SAFE_INTEGER] The upper bounds of a valid index.
	 * @returns {boolean} Returns `true` if `value` is a valid index, else `false`.
	 */
	function isIndex(value, length) {
	  length = length == null ? MAX_SAFE_INTEGER : length;
	  return !!length &&
	    (typeof value == 'number' || reIsUint.test(value)) &&
	    (value > -1 && value % 1 == 0 && value < length);
	}

	/**
	 * Checks if `value` is suitable for use as unique object key.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
	 */
	function isKeyable(value) {
	  var type = typeof value;
	  return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
	    ? (value !== '__proto__')
	    : (value === null);
	}

	/**
	 * Checks if `func` has its source masked.
	 *
	 * @private
	 * @param {Function} func The function to check.
	 * @returns {boolean} Returns `true` if `func` is masked, else `false`.
	 */
	function isMasked(func) {
	  return !!maskSrcKey && (maskSrcKey in func);
	}

	/**
	 * Checks if `value` is likely a prototype object.
	 *
	 * @private
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a prototype, else `false`.
	 */
	function isPrototype(value) {
	  var Ctor = value && value.constructor,
	      proto = (typeof Ctor == 'function' && Ctor.prototype) || objectProto;

	  return value === proto;
	}

	/**
	 * Converts `func` to its source code.
	 *
	 * @private
	 * @param {Function} func The function to process.
	 * @returns {string} Returns the source code.
	 */
	function toSource(func) {
	  if (func != null) {
	    try {
	      return funcToString.call(func);
	    } catch (e) {}
	    try {
	      return (func + '');
	    } catch (e) {}
	  }
	  return '';
	}

	/**
	 * This method is like `_.clone` except that it recursively clones `value`.
	 *
	 * @static
	 * @memberOf _
	 * @since 1.0.0
	 * @category Lang
	 * @param {*} value The value to recursively clone.
	 * @returns {*} Returns the deep cloned value.
	 * @see _.clone
	 * @example
	 *
	 * var objects = [{ 'a': 1 }, { 'b': 2 }];
	 *
	 * var deep = _.cloneDeep(objects);
	 * console.log(deep[0] === objects[0]);
	 * // => false
	 */
	function cloneDeep(value) {
	  return baseClone(value, true, true);
	}

	/**
	 * Performs a
	 * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
	 * comparison between two values to determine if they are equivalent.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to compare.
	 * @param {*} other The other value to compare.
	 * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
	 * @example
	 *
	 * var object = { 'a': 1 };
	 * var other = { 'a': 1 };
	 *
	 * _.eq(object, object);
	 * // => true
	 *
	 * _.eq(object, other);
	 * // => false
	 *
	 * _.eq('a', 'a');
	 * // => true
	 *
	 * _.eq('a', Object('a'));
	 * // => false
	 *
	 * _.eq(NaN, NaN);
	 * // => true
	 */
	function eq(value, other) {
	  return value === other || (value !== value && other !== other);
	}

	/**
	 * Checks if `value` is likely an `arguments` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an `arguments` object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArguments(function() { return arguments; }());
	 * // => true
	 *
	 * _.isArguments([1, 2, 3]);
	 * // => false
	 */
	function isArguments(value) {
	  // Safari 8.1 makes `arguments.callee` enumerable in strict mode.
	  return isArrayLikeObject(value) && hasOwnProperty.call(value, 'callee') &&
	    (!propertyIsEnumerable.call(value, 'callee') || objectToString.call(value) == argsTag);
	}

	/**
	 * Checks if `value` is classified as an `Array` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array, else `false`.
	 * @example
	 *
	 * _.isArray([1, 2, 3]);
	 * // => true
	 *
	 * _.isArray(document.body.children);
	 * // => false
	 *
	 * _.isArray('abc');
	 * // => false
	 *
	 * _.isArray(_.noop);
	 * // => false
	 */
	var isArray = Array.isArray;

	/**
	 * Checks if `value` is array-like. A value is considered array-like if it's
	 * not a function and has a `value.length` that's an integer greater than or
	 * equal to `0` and less than or equal to `Number.MAX_SAFE_INTEGER`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is array-like, else `false`.
	 * @example
	 *
	 * _.isArrayLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLike(document.body.children);
	 * // => true
	 *
	 * _.isArrayLike('abc');
	 * // => true
	 *
	 * _.isArrayLike(_.noop);
	 * // => false
	 */
	function isArrayLike(value) {
	  return value != null && isLength(value.length) && !isFunction(value);
	}

	/**
	 * This method is like `_.isArrayLike` except that it also checks if `value`
	 * is an object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an array-like object,
	 *  else `false`.
	 * @example
	 *
	 * _.isArrayLikeObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isArrayLikeObject(document.body.children);
	 * // => true
	 *
	 * _.isArrayLikeObject('abc');
	 * // => false
	 *
	 * _.isArrayLikeObject(_.noop);
	 * // => false
	 */
	function isArrayLikeObject(value) {
	  return isObjectLike(value) && isArrayLike(value);
	}

	/**
	 * Checks if `value` is a buffer.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.3.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a buffer, else `false`.
	 * @example
	 *
	 * _.isBuffer(new Buffer(2));
	 * // => true
	 *
	 * _.isBuffer(new Uint8Array(2));
	 * // => false
	 */
	var isBuffer = nativeIsBuffer || stubFalse;

	/**
	 * Checks if `value` is classified as a `Function` object.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a function, else `false`.
	 * @example
	 *
	 * _.isFunction(_);
	 * // => true
	 *
	 * _.isFunction(/abc/);
	 * // => false
	 */
	function isFunction(value) {
	  // The use of `Object#toString` avoids issues with the `typeof` operator
	  // in Safari 8-9 which returns 'object' for typed array and other constructors.
	  var tag = isObject(value) ? objectToString.call(value) : '';
	  return tag == funcTag || tag == genTag;
	}

	/**
	 * Checks if `value` is a valid array-like length.
	 *
	 * **Note:** This method is loosely based on
	 * [`ToLength`](http://ecma-international.org/ecma-262/7.0/#sec-tolength).
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a valid length, else `false`.
	 * @example
	 *
	 * _.isLength(3);
	 * // => true
	 *
	 * _.isLength(Number.MIN_VALUE);
	 * // => false
	 *
	 * _.isLength(Infinity);
	 * // => false
	 *
	 * _.isLength('3');
	 * // => false
	 */
	function isLength(value) {
	  return typeof value == 'number' &&
	    value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value;
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && typeof value == 'object';
	}

	/**
	 * Creates an array of the own enumerable property names of `object`.
	 *
	 * **Note:** Non-object values are coerced to objects. See the
	 * [ES spec](http://ecma-international.org/ecma-262/7.0/#sec-object.keys)
	 * for more details.
	 *
	 * @static
	 * @since 0.1.0
	 * @memberOf _
	 * @category Object
	 * @param {Object} object The object to query.
	 * @returns {Array} Returns the array of property names.
	 * @example
	 *
	 * function Foo() {
	 *   this.a = 1;
	 *   this.b = 2;
	 * }
	 *
	 * Foo.prototype.c = 3;
	 *
	 * _.keys(new Foo);
	 * // => ['a', 'b'] (iteration order is not guaranteed)
	 *
	 * _.keys('hi');
	 * // => ['0', '1']
	 */
	function keys(object) {
	  return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
	}

	/**
	 * This method returns a new empty array.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {Array} Returns the new empty array.
	 * @example
	 *
	 * var arrays = _.times(2, _.stubArray);
	 *
	 * console.log(arrays);
	 * // => [[], []]
	 *
	 * console.log(arrays[0] === arrays[1]);
	 * // => false
	 */
	function stubArray() {
	  return [];
	}

	/**
	 * This method returns `false`.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.13.0
	 * @category Util
	 * @returns {boolean} Returns `false`.
	 * @example
	 *
	 * _.times(2, _.stubFalse);
	 * // => [false, false]
	 */
	function stubFalse() {
	  return false;
	}

	module.exports = cloneDeep;
	});

	var __moduleExports$174 = applyCalculatedField$1;

	function applyCalculatedField$1(stock, fieldDefinitions) {
	  if (!stock) {
	    return;
	  }

	  if (!fieldDefinitions) {
	    return stock;
	  }

	  var calculatedStock = Object.keys(stock).reduce(function (acc, productId) {
	    var fields = stock[productId].fields;

	    if (!fields) {
	      acc[productId] = stock[productId];
	      return acc;
	    }

	    var newFields = fieldDefinitions.reduce(function (acc, field) {
	      if (field.fieldType === 'calculated') {
	        var amount = field.func(fields); // Only apply the field if successfully calculated

	        if (typeof amount === 'number') {
	          acc[field.id] = {
	            amount: amount
	          };
	        } else {
	          // Leave an empty object so the object structure can be read reliably
	          acc[field.id] = {};
	        }
	      }

	      return acc;
	    }, {});
	    acc[productId] = Object.assign({
	      fields: Object.assign(fields, newFields)
	    }, stock[productId]);
	    return acc;
	  }, {});
	  return calculatedStock;
	}

	var __moduleExports$175 = {
	  getCommitsTotal: getCommitsTotal
	};

	function getCommitsTotal() {
	  var commits = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	  if (Object.keys(commits).length === 0) {
	    return 0;
	  } // commits can sometimes look like this: { commits: { campaign:sia: {} } }


	  return Object.keys(commits).reduce(function (total, key) {
	    var amount = commits[key].amount || 0;
	    return total + amount;
	  }, 0);
	}

	var __moduleExports$172 = createCommonjsModule(function (module) {
	"use strict";

	module.exports = docToStockCountRecord;
	var ONLY_MISSING_PRODUCTS = module.exports.ONLY_MISSING_PRODUCTS = 'products';

	var cloneDeep = __moduleExports$173;

	var stockCountIdToLocationProperties = __moduleExports$166;

	var locationIdToSubmitProperties = __moduleExports$169;

	var shouldTrackBatches = __moduleExports$168;

	var reportProgress = __moduleExports$165;

	var applyCalculatedFields = __moduleExports$174;

	var dlv = __moduleExports$170;

	var _require = __moduleExports,
	    reportIdToReportingPeriodProps = _require.reportIdToReportingPeriodProps;

	var _require2 = __moduleExports$175,
	    getCommitsTotal = _require2.getCommitsTotal;

	var addUpBatchQuantities = function addUpBatchQuantities(batches) {
	  var countAll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;
	  return Object.keys(batches).reduce(function (total, batchId) {
	    var amount = dlv(batches[batchId], 'fields.field:standard-physical-count.amount');

	    if (countAll && typeof amount === 'number') {
	      return total + amount;
	    }

	    return total;
	  }, 0);
	};
	/*
	 * set all fields amount that isNaN to 0
	 * exclude all remark fields
	*/


	var sanitizeBatchFieldsAmounts = function sanitizeBatchFieldsAmounts(batches) {
	  var putZero = function putZero(fields) {
	    if (!fields) {
	      return;
	    } // look for any null or empty amount and put 0 there


	    return Object.keys(fields).reduce(function (acc, fieldId) {
	      acc[fieldId] = Object.assign({}, fields[fieldId]);

	      if (isNaN(acc[fieldId].amount) || acc[fieldId].amount === null) {
	        acc[fieldId].amount = 0;
	      }

	      return acc;
	    }, {});
	  };

	  return Object.keys(batches).reduce(function (batchAccumulator, batchId) {
	    batches[batchId].fields = putZero(batches[batchId].fields);
	    batchAccumulator[batchId] = batches[batchId];
	    return batchAccumulator;
	  }, {});
	};

	var stockWithAmounts = function stockWithAmounts(serviceId, stock) {
	  return Object.keys(stock).reduce(function (withAmounts, productId) {
	    if (!stock[productId].batches) {
	      // unbatched product
	      withAmounts[productId] = stock[productId]; // VAN requires an extra amount field for unbatched products

	      var amount = dlv(stock[productId], 'fields.field:standard-physical-count.amount');

	      if (typeof amount === 'undefined') {
	        // Check for a special case where the stock count has no
	        // `fields.field:standard-physical-count.amount`, but an `amount` property.
	        // This happens when we translate version 1 stock counts which cannot have fields,
	        // but will have an `amount` after conversion.
	        amount = stock[productId].amount;
	      }

	      if (typeof amount !== 'undefined') {
	        withAmounts[productId].amount = amount;
	      }

	      return withAmounts;
	    }

	    var batches = stock[productId].batches ? sanitizeBatchFieldsAmounts(stock[productId].batches) : undefined;
	    withAmounts[productId] = {
	      amount: addUpBatchQuantities(batches),
	      batches: batches
	    };

	    if (stock[productId].commits) {
	      withAmounts[productId].commits = stock[productId].commits;
	    }

	    return withAmounts;
	  }, {});
	};
	/*
	 * Mutates the passed in object
	 * create a deprecation warning on 'available' prop to use availableTotal
	 * makes sure the 2 props are always in sync
	 */
	// Make this global scope, to not spew warnings everywhere


	var _warnFirstTime = function warnFirstTime() {
	  console.log('Stock Count Record: "available" is deprecated, use availableTotal to match ledger balance'); // Make it noop now, so we only warn once

	  _warnFirstTime = function warnFirstTime() {};
	};

	var setAvailable = function setAvailable(object, amount) {
	  var available = amount;
	  Object.defineProperty(object, 'available', {
	    configurable: false,
	    enumerable: true,
	    get: function get() {
	      _warnFirstTime();

	      return available;
	    },
	    set: function set(newVal) {
	      _warnFirstTime();

	      available = newVal;
	    }
	  });
	  Object.defineProperty(object, 'availableTotal', {
	    configurable: false,
	    enumerable: true,
	    get: function get() {
	      return available;
	    },
	    set: function set(newVal) {
	      available = newVal;
	    }
	  });
	};

	var stockWithAvailable = function stockWithAvailable(sourceStock) {
	  return Object.keys(sourceStock).reduce(function (stock, productId) {
	    stock[productId] = cloneDeep(sourceStock[productId]);
	    var product = stock[productId];

	    if (typeof product.amount === 'undefined') {
	      return stock;
	    }

	    var commits = product.commits;

	    if (!commits || Object.keys(commits).length === 0) {
	      setAvailable(product, product.amount);
	      return stock;
	    }

	    var total = getCommitsTotal(commits);
	    setAvailable(product, product.amount - total);
	    return stock;
	  }, {});
	};
	/*
	 * This function has changed to just make sure all products
	 * that are passed in are available on the stock object
	 */


	var addMissingProductsToStock = function addMissingProductsToStock(doc, service, addMissingStockLevel, products) {
	  var stockWithMissingProducts = function stockWithMissingProducts() {
	    var stock = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	    var service = arguments.length > 1 ? arguments[1] : undefined;
	    var locationId = arguments.length > 2 ? arguments[2] : undefined;
	    var products = arguments.length > 3 ? arguments[3] : undefined;
	    return products.reduce(function (withProducts, product) {
	      var setProductStockAndReturn = function setProductStockAndReturn(productStock) {
	        withProducts[product._id] = Object.assign({}, productStock);
	        return withProducts;
	      };

	      var productStock = stock[product._id];
	      var areBatchesTracked = shouldTrackBatches({
	        service: service,
	        product: product,
	        location: {
	          id: locationId
	        }
	      });
	      var isMultiFieldStockCount = locationIdToSubmitProperties(locationId).submitsMultiFieldCounts; // if the current report already have stock for that product don't do anything

	      var isStockAvailable = typeof dlv(productStock, 'fields.field:standard-physical-count.amount') !== 'undefined';

	      if (areBatchesTracked) {
	        isStockAvailable = productStock && productStock.batches && Object.keys(productStock.batches).length;
	      }

	      if (isMultiFieldStockCount) {
	        isStockAvailable = productStock && productStock.fields && Object.keys(productStock.fields).length;
	      }

	      if (isStockAvailable) {
	        return setProductStockAndReturn(productStock);
	      } // ...current report has no stock for that product


	      var defaultStock = areBatchesTracked ? {
	        batches: {}
	      } : {}; // If level ONLY_MISSING_PRODUCTS: just add a default for the missing product

	      return setProductStockAndReturn(Object.assign({}, defaultStock, productStock));
	    }, {});
	  };

	  if (addMissingStockLevel !== ONLY_MISSING_PRODUCTS) {
	    return doc;
	  }

	  var locationProps = stockCountIdToLocationProperties(doc._id);
	  var locationId = locationProps.id;
	  doc.stock = stockWithMissingProducts(doc.stock, service, locationId, products);
	  return doc;
	};

	function docToStockCountRecord(doc, service) {
	  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	  var products = opts.products;

	  if (opts.addProgress && products) {
	    doc.progress = {
	      status: reportProgress(doc, products)
	    };
	  }

	  if (opts.addMissingStock && opts.addMissingStock !== ONLY_MISSING_PRODUCTS) {
	    throw new Error('Param addMissingStock: "' + opts.addMissingStock + '" is deprecated, use "products" or getLedgerBalance instead');
	  }

	  if (opts.addMissingStock && products) {
	    addMissingProductsToStock(doc, service, opts.addMissingStock, products);
	  }

	  var _id = doc._id,
	      version = doc.version,
	      serviceId = doc.serviceId,
	      stock = doc.stock,
	      createdAt = doc.createdAt,
	      updatedAt = doc.updatedAt,
	      updatedBy = doc.updatedBy,
	      createdBy = doc.createdBy,
	      submittedAt = doc.submittedAt,
	      progress = doc.progress;
	  var stockCount = Object.assign({}, {
	    _id: _id,
	    location: stockCountIdToLocationProperties(_id),
	    date: reportIdToReportingPeriodProps(service.program.reportingPeriod, _id)
	  });

	  if (version) {
	    stockCount.version = version;
	  }

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
	    stockCount.stock = stockWithAvailable(stockWithAmounts(service.id, stock));
	  }

	  if (typeof progress !== 'undefined') {
	    stockCount.progress = progress;
	  }

	  if (opts.addSubmitConfig) {
	    stockCount.submitConfig = locationIdToSubmitProperties(stockCount.location.id);
	  }

	  stockCount.serviceId = serviceId || service.id;

	  if (opts.fields) {
	    // apply calculated fields
	    var withCalculatedField = applyCalculatedFields(stockCount.stock, opts.fields);

	    if (withCalculatedField) {
	      stockCount.stock = withCalculatedField;
	    }
	  }

	  return stockCount;
	}
	});

	var docToStockCountRecord_2 = __moduleExports$172.ONLY_MISSING_PRODUCTS;

	var __moduleExports$177 = toStockCountId$2;

	var locationIdToProperties$4 = __moduleExports$167;

	function toStockCountId$2(params) {
	  var location = params.location,
	      service = params.service,
	      reportingPeriod = params.reportingPeriod;
	  /* istanbul ignore if */

	  if (!location) {
	    throw new Error('location parameter is required');
	  }

	  if (!service) {
	    throw new Error('service parameter is required');
	  }

	  if (!reportingPeriod) {
	    throw new Error('reportingPeriod parameter is required');
	  }

	  var locationProps = locationIdToProperties$4(location);
	  var periodPrefix;

	  switch (service.program.reportingPeriod) {
	    case 'weekly':
	      periodPrefix = 'week';
	      break;

	    case 'bimonthly':
	      periodPrefix = 'bimonth';
	      break;

	    default:
	      throw new Error('Unsupported reporting period type: ', service.program.reportingPeriod);
	  }

	  if (service.id !== 'program:immunization:service:immunization') {
	    return "".concat(location, ":").concat(periodPrefix, ":").concat(reportingPeriod, ":").concat(service.id);
	  } // Immunization has a special id format where zone and state come before
	  // the date-period and lga, sdp, and name come after the date-period in the id.


	  var joinParts = function joinParts() {
	    for (var _len = arguments.length, parts = new Array(_len), _key = 0; _key < _len; _key++) {
	      parts[_key] = arguments[_key];
	    }

	    return parts.filter(function (p) {
	      return !!p;
	    }).join(':');
	  };

	  var periodPart = "".concat(periodPrefix, ":").concat(reportingPeriod);
	  var namePart = !!locationProps.name && "name:".concat(locationProps.name);

	  switch (locationProps.level) {
	    case 'national':
	      return joinParts('national', periodPart, namePart);

	    case 'zone':
	      return joinParts("zone:".concat(locationProps.zone), periodPart, namePart);

	    case 'state':
	      return joinParts("zone:".concat(locationProps.zone, ":state:").concat(locationProps.state), periodPart, namePart);

	    case 'lga':
	      return joinParts("zone:".concat(locationProps.zone, ":state:").concat(locationProps.state), periodPart, "lga:".concat(locationProps.lga), namePart);

	    case 'sdp':
	      return joinParts("zone:".concat(locationProps.zone, ":state:").concat(locationProps.state), periodPart, "lga:".concat(locationProps.lga, ":sdp:").concat(locationProps.lga), namePart);
	  }
	}

	var __moduleExports$176 = generateReportIds$1;

	var toStockCountId$1 = __moduleExports$177;

	var _require$2 = __moduleExports;
	var dateToReportingPeriod$1 = _require$2.dateToReportingPeriod;
	var previousReportingPeriod$1 = _require$2.previousReportingPeriod;
	var DEFAULT_SINCE = '2018-01-01T00:00:00.000Z';

	function generateReportIds$1(location, service) {
	  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
	      _ref$since = _ref.since,
	      since = _ref$since === void 0 ? DEFAULT_SINCE : _ref$since,
	      till = _ref.till;

	  var periodType = service.program.reportingPeriod;
	  var sinceReportingPeriod = dateToReportingPeriod$1(periodType, since);
	  var tillReportingPeriod = dateToReportingPeriod$1(periodType, till);
	  var prevReportingPeriod = tillReportingPeriod;
	  var ids = [];

	  while (prevReportingPeriod >= sinceReportingPeriod) {
	    ids.push(toStockCountId$1({
	      location: location,
	      reportingPeriod: prevReportingPeriod,
	      service: service
	    }));
	    prevReportingPeriod = previousReportingPeriod$1(periodType, prevReportingPeriod);
	  }

	  return ids;
	}

	var __moduleExports$178 = locationIdToParent$1;

	var locationIdToProperties$5 = __moduleExports$167;

	function locationIdToParent$1(locationId) {
	  var location = locationIdToProperties$5(locationId);

	  switch (location.level) {
	    case 'lga':
	      return "zone:".concat(location.zone, ":state:").concat(location.state);

	    case 'state':
	      return "zone:".concat(location.zone);

	    case 'zone':
	      return 'national';

	    case 'national':
	      return 'country';
	  }
	}

	var __moduleExports$179 = pickLastSubmittedReport$1;

	var stockCountIdToLocationProperties$3 = __moduleExports$166;

	var shouldTrackBatches$3 = __moduleExports$168;

	var byReportingPeriodDesc = function byReportingPeriodDesc(a, b) {
	  if (a._id < b._id) {
	    return 1;
	  }
	  /* istanbul ignore else */


	  if (a._id > b._id) {
	    return -1;
	  } // next line not relevant for istanbul since we'll never get the same report twice

	  /* istanbul ignore next */


	  return 0;
	};

	function pickLastSubmittedReport$1(reports) {
	  reports.sort(byReportingPeriodDesc);
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = reports[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var report = _step.value;

	      // Not submitted (draft) reports are ignored
	      if (!report.submittedAt) {
	        continue;
	      } // Reports without stock are also ignored because they're not useful to know what's the initial stock


	      var hasStock = report.stock && Object.keys(report.stock).length;

	      if (!hasStock) {
	        continue;
	      }

	      var location = stockCountIdToLocationProperties$3(report._id);
	      var isLocationTrackingBatches = shouldTrackBatches$3({
	        location: location
	      }); // For locations that don't track batches we just need to last submitted report

	      if (!isLocationTrackingBatches) {
	        return report;
	      } // For locations that track batches we search for the last submitted batched reports
	      // If we find a non batched report we can return undefined, since no batched report
	      // comes before an unbatched one


	      var _arr = Object.keys(report.stock);

	      for (var _i = 0; _i < _arr.length; _i++) {
	        var productId = _arr[_i];
	        // We don't have product definitions so we can't know which products should track batches
	        // as a rough way of checking if this is a batch stock count we just require that _any_
	        // product has batches
	        var productStock = report.stock[productId];

	        if (productStock.batches) {
	          return report;
	        }
	      }

	      return;
	    }
	  } catch (err) {
	    _didIteratorError = true;
	    _iteratorError = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion && _iterator.return != null) {
	        _iterator.return();
	      }
	    } finally {
	      if (_didIteratorError) {
	        throw _iteratorError;
	      }
	    }
	  }
	}

	var __moduleExports$180 = isShipmentRelevant$1; // See spec doc: https://github.com/fielded/van-orga/issues/1482

	function isShipmentRelevant$1(params) {
	  var shipment = params.shipment,
	      location = params.location,
	      startDate = params.startDate,
	      endDate = params.endDate,
	      includeScheduledOutbound = params.includeScheduledOutbound;
	  var status = shipment.status,
	      origin = shipment.origin,
	      destination = shipment.destination,
	      snapshotDates = shipment.snapshotDates; // If it's not to me or from me forget it.

	  var isRelevantLocation = origin.id === location.id || destination.id === location.id;
	  if (!isRelevantLocation) return false; // Never include scheduled external arrivals in ledger calculations.

	  if (status === 'pre-advice') return false; // Don't include scheduled distributions (unless this 'include' flag is set)

	  if (!includeScheduledOutbound && status === 'new') return false; // If we are to include scheduled distributions, don't include inbound ones

	  if (includeScheduledOutbound && status === 'new' && destination.id === location.id) {
	    return false;
	  } // Reminder: new < sent < arrived < received


	  var shipmentDate;

	  if (includeScheduledOutbound) {
	    // If including scheduled distributions, a shipment is relevant from its earlist date
	    shipmentDate = snapshotDates.new || snapshotDates.sent || snapshotDates.arrived || snapshotDates.received;
	  } else if (origin.id === location.id) {
	    // If at origin, it has to at least be sent.
	    shipmentDate = snapshotDates.sent || snapshotDates.arrived || snapshotDates.received; // If at destination, it has to be fully received.
	  } else {
	    shipmentDate = snapshotDates.received;
	  }

	  if (!shipmentDate) return false; // If there never has been a stock count at this location:

	  if (!startDate) return shipmentDate <= endDate;
	  return startDate <= shipmentDate && shipmentDate <= endDate;
	}

	var __moduleExports$181 = translateReport$1;

	var docToStockCountRecord$1 = __moduleExports$172;

	var dlv$1 = __moduleExports$170;

	var toOldFormatUnbatchedStock = function toOldFormatUnbatchedStock(stock) {
	  return Object.keys(stock).reduce(function (unbatched, productId) {
	    unbatched[productId] = stock[productId].available || stock[productId].amount;
	    return unbatched;
	  }, {});
	};

	var toNewFormatUnbatchedStock = function toNewFormatUnbatchedStock(stock) {
	  return Object.keys(stock).reduce(function (unbatched, productId) {
	    var value = stock[productId]; // PSM and new VAN stock counts

	    if (value && value.fields) {
	      unbatched[productId] = value;
	    } else {
	      // old NAV stock counts
	      unbatched[productId] = {
	        amount: stock[productId]
	      };
	    }

	    return unbatched;
	  }, {});
	};

	var VAN_SERVICE = {
	  id: 'program:immunization:service:immunization',
	  program: {
	    reportingPeriod: 'weekly'
	  }
	};

	var getService = function getService(serviceId) {
	  // Old van stock counts that don't have a service id
	  if (!serviceId || serviceId === VAN_SERVICE.id) {
	    return VAN_SERVICE;
	  } // Create mock PSM Service


	  return {
	    id: serviceId,
	    program: {
	      reportingPeriod: 'bimonthly'
	    }
	  };
	};

	function translateReport$1(report, version) {
	  var reportVersion = dlv$1(report, 'version');
	  var service = getService(report.serviceId);
	  var translateToNAV = reportVersion === '2.0.0' && version === '1.0.0';
	  var PSM = service.id !== VAN_SERVICE.id; // Heads up! This is for converting a PSM '1.0.0' stock count
	  // into the OLD NAV format!

	  if (reportVersion === '1.0.0' && version === '1.0.0' && PSM) {
	    translateToNAV = true;
	  }

	  if (translateToNAV) {
	    var stockCount = docToStockCountRecord$1(report, service);
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
	      version: version,
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
	    } // Always add a Service ID so we can recognize different stock counts
	    // even though it's not there on original NAV counts


	    oldVersion.serviceId = service.id;
	    return oldVersion;
	  } // Either PSM report, that just needs to be to have the new version
	  // or an old NAV report, that needs some more work


	  if (version === '2.0.0' && reportVersion !== '2.0.0') {
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
	      serviceId: service.id,
	      stock: toNewFormatUnbatchedStock(_stock)
	    };

	    if (_submittedAt) {
	      newVersion.submittedAt = _submittedAt;
	    } // This is used in many places to mark the report as complete
	    // Important for example for the ledger balance


	    if (!_submittedAt && reportVersion === undefined) {
	      newVersion.submittedAt = report.updatedAt;
	    }

	    return newVersion;
	  }

	  return report;
	}

	var toDraft$1 = function (id) {
	  return '_local/' + id;
	};

	var isDraft = function (id) {
	  return id.startsWith('_local/');
	};

	var fromDraft = function (id) {
	  return id.replace(/^_local\//, '');
	};

	var __moduleExports$183 = {
		toDraft: toDraft$1,
		isDraft: isDraft,
		fromDraft: fromDraft
	};

	var __moduleExports$182 = toDraftStockCountId$1;

	var toStockCountId$3 = __moduleExports$177;

	var _require$3 = __moduleExports$183;
	var toDraft = _require$3.toDraft;
	function toDraftStockCountId$1(params) {
	  var stockCountId = toStockCountId$3(params);
	  return toDraft(stockCountId);
	}

	var __moduleExports$184 = draftLocationIdToProperties$1;

	var locationIdToProperties$6 = __moduleExports$167;

	var _require$4 = __moduleExports$183;
	var toDraft$2 = _require$4.toDraft;
	var fromDraft$1 = _require$4.fromDraft;
	function draftLocationIdToProperties$1(draftId) {
	  var id = fromDraft$1(draftId);
	  var properties = locationIdToProperties$6(id);
	  return Object.assign({}, properties, {
	    id: toDraft$2(properties.id)
	  });
	}

	var __moduleExports$185 = draftStockCountIdToLocationProperties$1;

	var _require$5 = __moduleExports$183;
	var toDraft$3 = _require$5.toDraft;
	var fromDraft$2 = _require$5.fromDraft;
	var stockCountIdToLocationProperties$4 = __moduleExports$166;

	function draftStockCountIdToLocationProperties$1(draftId) {
	  var id = fromDraft$2(draftId);
	  var locationProperties = stockCountIdToLocationProperties$4(id);
	  return Object.assign({}, locationProperties, {
	    id: toDraft$3(locationProperties.id)
	  });
	}

	var __moduleExports$187 = createCommonjsModule(function (module, exports) {
	!function(n,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof undefined&&undefined.amd?undefined(["exports"],e):e(n.smartId={})}(commonjsGlobal,function(n){var e=function(n,e){return n.split(e).map(function(n){var e=n.split("?");return""!==e[0]?{key:n,isOptional:!1}:{key:e[1],isOptional:!0}})},t=function(n){return void 0!==n&&null!==n&&""!==n};n.parse=function(n,e){void 0===e&&(e=":");var t=n.split(e);return t.reduce(function(n,e,i){return i%2!=0?n:(n[e]=t[i+1],n)},{})},n.idify=function(n,i,r){return void 0===r&&(r=":"),n&&i?e(i,r).reduce(function(e,i){var o=n[i.key];if(o&&t(o))return e+(e.length?r+i.key:i.key)+r+o;if(!i.isOptional)throw new Error("could not generate id, missing field "+i.key);return e},""):""}});
	});

	var REPORT_BALANCE_FIELD_SHORT = 'field:standard-physical-count';
	var REPORT_BALANCE_FIELD$1 = 'fields.field:standard-physical-count.amount';
	var REPORT_CAMPAIGN_BALANCE_FIELD = 'campaign:sia.amount';

	var __moduleExports$188 = {
		REPORT_BALANCE_FIELD_SHORT: REPORT_BALANCE_FIELD_SHORT,
		REPORT_BALANCE_FIELD: REPORT_BALANCE_FIELD$1,
		REPORT_CAMPAIGN_BALANCE_FIELD: REPORT_CAMPAIGN_BALANCE_FIELD
	};

	var __moduleExports$186 = {
	  getLedgerBalance: getLedgerBalance$1,
	  // for tests
	  getLatestReport: getLatestReport,
	  getLedgerFromReport: getLedgerFromReport,
	  getLedgerFromShipments: getLedgerFromShipments,
	  getShipmentTotalsByProduct: getShipmentTotalsByProduct
	};

	var _require$6 = __moduleExports$187;
	var parse$91 = _require$6.parse;
	var dlv$2 = __moduleExports$170;

	var cloneDeep = __moduleExports$173;

	var shouldTrackBatches$4 = __moduleExports$168;

	var translateReport$2 = __moduleExports$181;

	var isShipmentRelevant$2 = __moduleExports$180;

	var _require2$1 = __moduleExports$175;
	var getCommitsTotal$1 = _require2$1.getCommitsTotal;
	var _require3$1 = __moduleExports$188;
	var REPORT_BALANCE_FIELD = _require3$1.REPORT_BALANCE_FIELD;
	function getLedgerBalance$1(params) {
	  var location = params.location,
	      date = params.date,
	      products = params.products,
	      reports = params.reports,
	      shipments = params.shipments,
	      includeScheduledOutbound = params.includeScheduledOutbound;
	  var latestReport = getLatestReport(reports, date);
	  var ledgerFromReport = getLedgerFromReport(products, latestReport, location);
	  var lastReportDate = dlv$2(latestReport, 'submittedAt');
	  var ledger = getLedgerFromShipments({
	    location: location,
	    date: date,
	    shipments: shipments,
	    ledgerFromReport: ledgerFromReport,
	    lastReportDate: lastReportDate,
	    products: products,
	    includeScheduledOutbound: includeScheduledOutbound
	  });
	  return withoutZeroBatches(ledger);
	}

	function getLatestReport(reports, date) {
	  if (!reports) return null;
	  var sorted = reports.filter(function (r) {
	    return r.submittedAt && r.submittedAt <= date;
	  }).sort(function (a, b) {
	    return a.submittedAt < b.submittedAt ? -1 : a.submittedAt > b.submittedAt ? 1 : 0;
	  });
	  return sorted.length ? sorted[sorted.length - 1] : null;
	}

	function getLedgerFromReport(products, latestReport, location) {
	  var report = latestReport ? translateReport$2(latestReport, '2.0.0') : {
	    stock: {}
	  };
	  var ledger = {}; // Only use products that were listed by the MD API

	  Object.keys(products).forEach(function (productId) {
	    var tracksBatches = shouldTrackBatches$4({
	      product: products[productId],
	      location: location
	    });
	    ledger[productId] = getProductBalance(productId, report, tracksBatches);

	    if (report.stock[productId] && report.stock[productId].commits) {
	      var commits = cloneDeep(report.stock[productId].commits);
	      var commitTotal = getCommitsTotal$1(commits);
	      ledger[productId].commits = commits;
	      ledger[productId].availableTotal = ledger[productId].total - commitTotal;
	    }
	  });
	  return ledger;
	}

	function getProductBalance(productId, report, tracksBatches) {
	  var reportProduct = report.stock[productId];

	  if (!reportProduct) {
	    return tracksBatches ? {
	      total: 0,
	      availableTotal: 0,
	      batches: {}
	    } : {
	      total: 0,
	      availableTotal: 0
	    };
	  }

	  var total = 0;
	  var batches = {};

	  for (var batchId in reportProduct.batches) {
	    var amount = dlv$2(reportProduct.batches[batchId], REPORT_BALANCE_FIELD, 0);
	    total += amount;
	    batches[batchId] = amount;
	  } // Check report.batches instead of tracksBatches for VAN 1.0 reports
	  // with non-batched counts on batched products


	  if (!reportProduct.batches) {
	    total = reportProduct.fields ? dlv$2(reportProduct, REPORT_BALANCE_FIELD, 0) : dlv$2(reportProduct, 'amount', 0);
	  }

	  var productBalance = {
	    total: total,
	    availableTotal: total
	  };

	  if (tracksBatches) {
	    productBalance.batches = batches;
	  }

	  return productBalance;
	}

	function getLedgerFromShipments(params) {
	  var location = params.location,
	      date = params.date,
	      shipments = params.shipments,
	      ledgerFromReport = params.ledgerFromReport,
	      lastReportDate = params.lastReportDate,
	      products = params.products,
	      includeScheduledOutbound = params.includeScheduledOutbound;
	  var relevantShipments = shipments.filter(function (shipment) {
	    return isShipmentRelevant$2({
	      shipment: shipment,
	      location: location,
	      endDate: date,
	      startDate: lastReportDate,
	      includeScheduledOutbound: includeScheduledOutbound
	    });
	  });
	  if (!relevantShipments.length) return ledgerFromReport;
	  var shipmentProducts = getShipmentTotalsByProduct(relevantShipments, location);
	  var ledger = {};

	  for (var productId in ledgerFromReport) {
	    ledger[productId] = Object.assign({}, ledgerFromReport[productId]);

	    if (shipmentProducts[productId]) {
	      // Note these shipment totals are already * -1 if location is origin
	      ledger[productId].total += shipmentProducts[productId].total;
	      ledger[productId].availableTotal += shipmentProducts[productId].total;

	      for (var commitType in shipmentProducts[productId].commits) {
	        ledger[productId].commits = ledger[productId].commits || {};
	        ledger[productId].commits[commitType] = ledger[productId].commits[commitType] || {
	          amount: 0
	        };
	        ledger[productId].commits[commitType].amount += shipmentProducts[productId].commits[commitType];
	        ledger[productId].availableTotal -= shipmentProducts[productId].commits[commitType];
	      } // Shipments store unbatched products on virtual batches (`batchNo:unknown`).
	      // These are included in the total but should not be listed in batches.


	      var tracksBatches = shouldTrackBatches$4({
	        product: products[productId],
	        location: location
	      });

	      if (tracksBatches) {
	        for (var batchId in shipmentProducts[productId].batches) {
	          ledger[productId].batches[batchId] = ledger[productId].batches[batchId] || 0;
	          ledger[productId].batches[batchId] += shipmentProducts[productId].batches[batchId];
	        }
	      }
	    }
	  }

	  return ledger;
	} // Shipment counts will always be the winning snapshot counts per van-store-api,
	// so received > arrived > sent from spec.


	function getShipmentTotalsByProduct(shipments, location) {
	  var totals = {};
	  shipments.forEach(function (shipment) {
	    for (var batchId in shipment.counts) {
	      var _parse = parse$91(batchId),
	          product = _parse.product;

	      var productId = "product:".concat(product);
	      var absoluteQuantity = shipment.counts[batchId].quantity;
	      var batchQuantity = shipment.origin.id === location.id ? absoluteQuantity * -1 : absoluteQuantity;
	      totals[productId] = totals[productId] || {
	        total: 0,
	        batches: {},
	        commits: {}
	      };
	      totals[productId].batches[batchId] = totals[productId].batches[batchId] || 0;
	      totals[productId].batches[batchId] += batchQuantity;
	      totals[productId].total += batchQuantity;

	      if (shipment.shipmentType && shipment.shipmentType.id !== 'routine') {
	        totals[productId].commits[shipment.shipmentType.id] = totals[productId].commits[shipment.shipmentType.id] || 0;
	        totals[productId].commits[shipment.shipmentType.id] += batchQuantity;
	      }
	    }
	  });
	  return totals;
	}

	function withoutZeroBatches(ledger) {
	  for (var productId in ledger) {
	    for (var batchId in ledger[productId].batches) {
	      if (ledger[productId].batches[batchId] === 0) {
	        delete ledger[productId].batches[batchId];
	      }
	    }
	  }

	  return ledger;
	}

	function _defineProperty(obj, key, value) {
	  if (key in obj) {
	    Object.defineProperty(obj, key, {
	      value: value,
	      enumerable: true,
	      configurable: true,
	      writable: true
	    });
	  } else {
	    obj[key] = value;
	  }

	  return obj;
	}

	var __moduleExports$190 = _defineProperty;

	var VERSIONS$1 = {
	  'program:immunization:service:immunization': {
	    current: '2.0.0'
	  }
	};
	var DEFAULT_VERSION$1 = '1.0.0';

	var __moduleExports$191 = {
		VERSIONS: VERSIONS$1,
		DEFAULT_VERSION: DEFAULT_VERSION$1
	};

	var _interopRequireDefault$2 = __moduleExports$1;

	var _defineProperty2 = _interopRequireDefault$2(__moduleExports$190);

	var __moduleExports$189 = {
	  ledgerBalanceToReport: ledgerBalanceToReport$1
	};

	var cloneDeep$1 = __moduleExports$173;

	var _require$7 = __moduleExports$188;
	var REPORT_BALANCE_FIELD_SHORT$1 = _require$7.REPORT_BALANCE_FIELD_SHORT;
	var _require2$2 = __moduleExports$191;
	var VERSIONS = _require2$2.VERSIONS;
	var DEFAULT_VERSION = _require2$2.DEFAULT_VERSION;
	var toStockCountId$4 = __moduleExports$177;

	var docToStockCountRecord$2 = __moduleExports$172;

	var _require3$2 = __moduleExports;
	var dateToReportingPeriod$2 = _require3$2.dateToReportingPeriod;
	var shouldTrackBatches$5 = __moduleExports$168;

	function ledgerBalanceToReport$1(params) {
	  var ledger = params.ledger,
	      location = params.location,
	      service = params.service,
	      date = params.date,
	      user = params.user,
	      products = params.products;
	  var reportingPeriod = dateToReportingPeriod$2(service.program.reportingPeriod, date);

	  var _id = toStockCountId$4({
	    location: location.id,
	    service: service,
	    reportingPeriod: reportingPeriod
	  });

	  var version = VERSIONS[service.id] ? VERSIONS[service.id].current : DEFAULT_VERSION;
	  var stock = getStockReportStock(ledger, location, service, products);
	  var timestamp = new Date().toISOString();
	  var report = {
	    _id: _id,
	    version: version,
	    stock: stock,
	    type: 'stockCount',
	    serviceId: service.id,
	    createdAt: timestamp,
	    createdBy: user.name,
	    updatedAt: timestamp,
	    updatedBy: user.name,
	    submittedAt: timestamp
	  };
	  return docToStockCountRecord$2(report, service);
	}

	function getStockReportStock(ledger, location, service, products) {
	  // These are already the relevant products for our location:service.
	  return Object.keys(ledger).reduce(function (memo, productId) {
	    var _ledger$productId = ledger[productId],
	        batches = _ledger$productId.batches,
	        total = _ledger$productId.total,
	        commits = _ledger$productId.commits;
	    var product = products[productId];
	    var areBatchesTracked = shouldTrackBatches$5({
	      service: service,
	      product: product,
	      location: location
	    });

	    if (areBatchesTracked) {
	      memo[productId] = {
	        batches: {}
	      };

	      for (var batchId in batches) {
	        var batchTotal = batches[batchId];
	        memo[productId].batches[batchId] = {
	          fields: (0, _defineProperty2.default)({}, REPORT_BALANCE_FIELD_SHORT$1, {
	            amount: batchTotal
	          })
	        };
	      }
	    } else {
	      memo[productId] = {
	        fields: (0, _defineProperty2.default)({}, REPORT_BALANCE_FIELD_SHORT$1, {
	          amount: total
	        })
	      };
	    }

	    if (commits) {
	      memo[productId].commits = cloneDeep$1(commits);
	    }

	    return memo;
	  }, {});
	}

	var __moduleExports$194 = toLocationProperties$2;

	/** Convert dash seperated location id string to location object
	 *
	 * Shipment origin and destination location id strings use only
	 * dashes to seperate key/value pairs. There are three ways location
	 * ids can be encoded:
	 * 1. colon seperated key/value pairs: 'zone:nc:state:kano:lga:yagba-west'
	 * 2. dash seperated: 'zone-nc-state-kano-lga-yagba-west'
	 * 3. as objects: {zone: 'nc', state: 'kano', lga: 'yagba-west'}
	 * This function converts from the second representation to the third.
	 * It should be noted though, that dash seperated id strings should
	 * be avoided where possible, because they are more error prone
	 * to parse.
	 */
	function toLocationProperties$2(id) {
	  if (id === 'national') {
	    return {
	      national: 'national',
	      id: id
	    };
	  }

	  if (id === 'country') {
	    return {
	      country: 'country',
	      id: id
	    };
	  }

	  // Parse the hyphen seperated id and create a colon seperate id from it
	  // while also collecting the key/value pairs as object properties.
	  var props = {};
	  var parts = id.split('-');
	  var key = '';
	  var value = '';
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    for (var _iterator = parts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      var str = _step.value;

	      if (['zone', 'state', 'lga', 'name'].includes(str)) {
	        if (value) {
	          props[key] = value;
	          props.id = props.id != null ? props.id + ':' + key + ':' + value : key + ':' + value;
	        }
	        key = str;
	        value = '';
	      } else {
	        value = value ? value + '-' + str : str;
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

	  if (value) {
	    props[key] = value;
	    props.id = props.id != null ? props.id + ':' + key + ':' + value : key + ':' + value;
	  }
	  return props;
	}

	var __moduleExports$196 = {
	  getUnknownBatchID: getUnknownBatchID$1,
	  getTBDBatchID: getTBDBatchID$1
	};

	function getUnknownBatchID$1(productId) {
	  return productId + ":manufacturer:unknown:batchNo:unknown";
	}

	function getTBDBatchID$1(productId) {
	  return productId + ":manufacturer:tbd:batchNo:tbd";
	}

	var isArray = Array.isArray;
	var keyList = Object.keys;
	var hasProp = Object.prototype.hasOwnProperty;

	var __moduleExports$201 = function equal(a, b) {
	  if (a === b) return true;

	  if (a && b && typeof a == 'object' && typeof b == 'object') {
	    var arrA = isArray(a)
	      , arrB = isArray(b)
	      , i
	      , length
	      , key;

	    if (arrA && arrB) {
	      length = a.length;
	      if (length != b.length) return false;
	      for (i = length; i-- !== 0;)
	        if (!equal(a[i], b[i])) return false;
	      return true;
	    }

	    if (arrA != arrB) return false;

	    var dateA = a instanceof Date
	      , dateB = b instanceof Date;
	    if (dateA != dateB) return false;
	    if (dateA && dateB) return a.getTime() == b.getTime();

	    var regexpA = a instanceof RegExp
	      , regexpB = b instanceof RegExp;
	    if (regexpA != regexpB) return false;
	    if (regexpA && regexpB) return a.toString() == b.toString();

	    var keys = keyList(a);
	    length = keys.length;

	    if (length !== keyList(b).length)
	      return false;

	    for (i = length; i-- !== 0;)
	      if (!hasProp.call(b, keys[i])) return false;

	    for (i = length; i-- !== 0;) {
	      key = keys[i];
	      if (!equal(a[key], b[key])) return false;
	    }

	    return true;
	  }

	  return a!==a && b!==b;
	};

	// https://mathiasbynens.be/notes/javascript-encoding
	// https://github.com/bestiejs/punycode.js - punycode.ucs2.decode
	var __moduleExports$202 = function ucs2length(str) {
	  var length = 0
	    , len = str.length
	    , pos = 0
	    , value;
	  while (pos < len) {
	    length++;
	    value = str.charCodeAt(pos++);
	    if (value >= 0xD800 && value <= 0xDBFF && pos < len) {
	      // high surrogate, and there is a next character
	      value = str.charCodeAt(pos);
	      if ((value & 0xFC00) == 0xDC00) pos++; // low surrogate
	    }
	  }
	  return length;
	};

	var __moduleExports$200 = {
	  copy: copy,
	  checkDataType: checkDataType,
	  checkDataTypes: checkDataTypes,
	  coerceToTypes: coerceToTypes,
	  toHash: toHash,
	  getProperty: getProperty,
	  escapeQuotes: escapeQuotes,
	  equal: __moduleExports$201,
	  ucs2length: __moduleExports$202,
	  varOccurences: varOccurences,
	  varReplace: varReplace,
	  cleanUpCode: cleanUpCode,
	  finalCleanUpCode: finalCleanUpCode,
	  schemaHasRules: schemaHasRules,
	  schemaHasRulesExcept: schemaHasRulesExcept,
	  toQuotedString: toQuotedString,
	  getPathExpr: getPathExpr,
	  getPath: getPath,
	  getData: getData,
	  unescapeFragment: unescapeFragment,
	  unescapeJsonPointer: unescapeJsonPointer,
	  escapeFragment: escapeFragment,
	  escapeJsonPointer: escapeJsonPointer
	};


	function copy(o, to) {
	  to = to || {};
	  for (var key in o) to[key] = o[key];
	  return to;
	}


	function checkDataType(dataType, data, negate) {
	  var EQUAL = negate ? ' !== ' : ' === '
	    , AND = negate ? ' || ' : ' && '
	    , OK = negate ? '!' : ''
	    , NOT = negate ? '' : '!';
	  switch (dataType) {
	    case 'null': return data + EQUAL + 'null';
	    case 'array': return OK + 'Array.isArray(' + data + ')';
	    case 'object': return '(' + OK + data + AND +
	                          'typeof ' + data + EQUAL + '"object"' + AND +
	                          NOT + 'Array.isArray(' + data + '))';
	    case 'integer': return '(typeof ' + data + EQUAL + '"number"' + AND +
	                           NOT + '(' + data + ' % 1)' +
	                           AND + data + EQUAL + data + ')';
	    default: return 'typeof ' + data + EQUAL + '"' + dataType + '"';
	  }
	}


	function checkDataTypes(dataTypes, data) {
	  switch (dataTypes.length) {
	    case 1: return checkDataType(dataTypes[0], data, true);
	    default:
	      var code = '';
	      var types = toHash(dataTypes);
	      if (types.array && types.object) {
	        code = types.null ? '(': '(!' + data + ' || ';
	        code += 'typeof ' + data + ' !== "object")';
	        delete types.null;
	        delete types.array;
	        delete types.object;
	      }
	      if (types.number) delete types.integer;
	      for (var t in types)
	        code += (code ? ' && ' : '' ) + checkDataType(t, data, true);

	      return code;
	  }
	}


	var COERCE_TO_TYPES = toHash([ 'string', 'number', 'integer', 'boolean', 'null' ]);
	function coerceToTypes(optionCoerceTypes, dataTypes) {
	  if (Array.isArray(dataTypes)) {
	    var types = [];
	    for (var i=0; i<dataTypes.length; i++) {
	      var t = dataTypes[i];
	      if (COERCE_TO_TYPES[t]) types[types.length] = t;
	      else if (optionCoerceTypes === 'array' && t === 'array') types[types.length] = t;
	    }
	    if (types.length) return types;
	  } else if (COERCE_TO_TYPES[dataTypes]) {
	    return [dataTypes];
	  } else if (optionCoerceTypes === 'array' && dataTypes === 'array') {
	    return ['array'];
	  }
	}


	function toHash(arr) {
	  var hash = {};
	  for (var i=0; i<arr.length; i++) hash[arr[i]] = true;
	  return hash;
	}


	var IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
	var SINGLE_QUOTE = /'|\\/g;
	function getProperty(key) {
	  return typeof key == 'number'
	          ? '[' + key + ']'
	          : IDENTIFIER.test(key)
	            ? '.' + key
	            : "['" + escapeQuotes(key) + "']";
	}


	function escapeQuotes(str) {
	  return str.replace(SINGLE_QUOTE, '\\$&')
	            .replace(/\n/g, '\\n')
	            .replace(/\r/g, '\\r')
	            .replace(/\f/g, '\\f')
	            .replace(/\t/g, '\\t');
	}


	function varOccurences(str, dataVar) {
	  dataVar += '[^0-9]';
	  var matches = str.match(new RegExp(dataVar, 'g'));
	  return matches ? matches.length : 0;
	}


	function varReplace(str, dataVar, expr) {
	  dataVar += '([^0-9])';
	  expr = expr.replace(/\$/g, '$$$$');
	  return str.replace(new RegExp(dataVar, 'g'), expr + '$1');
	}


	var EMPTY_ELSE = /else\s*{\s*}/g;
	var EMPTY_IF_NO_ELSE = /if\s*\([^)]+\)\s*\{\s*\}(?!\s*else)/g;
	var EMPTY_IF_WITH_ELSE = /if\s*\(([^)]+)\)\s*\{\s*\}\s*else(?!\s*if)/g;
	function cleanUpCode(out) {
	  return out.replace(EMPTY_ELSE, '')
	            .replace(EMPTY_IF_NO_ELSE, '')
	            .replace(EMPTY_IF_WITH_ELSE, 'if (!($1))');
	}


	var ERRORS_REGEXP = /[^v.]errors/g;
	var REMOVE_ERRORS = /var errors = 0;|var vErrors = null;|validate.errors = vErrors;/g;
	var REMOVE_ERRORS_ASYNC = /var errors = 0;|var vErrors = null;/g;
	var RETURN_VALID = 'return errors === 0;';
	var RETURN_TRUE = 'validate.errors = null; return true;';
	var RETURN_ASYNC = /if \(errors === 0\) return data;\s*else throw new ValidationError\(vErrors\);/;
	var RETURN_DATA_ASYNC = 'return data;';
	var ROOTDATA_REGEXP = /[^A-Za-z_$]rootData[^A-Za-z0-9_$]/g;
	var REMOVE_ROOTDATA = /if \(rootData === undefined\) rootData = data;/;
	function finalCleanUpCode(out, async) {
	  var matches = out.match(ERRORS_REGEXP);
	  if (matches && matches.length == 2) {
	    out = async
	          ? out.replace(REMOVE_ERRORS_ASYNC, '')
	               .replace(RETURN_ASYNC, RETURN_DATA_ASYNC)
	          : out.replace(REMOVE_ERRORS, '')
	               .replace(RETURN_VALID, RETURN_TRUE);
	  }

	  matches = out.match(ROOTDATA_REGEXP);
	  if (!matches || matches.length !== 3) return out;
	  return out.replace(REMOVE_ROOTDATA, '');
	}


	function schemaHasRules(schema, rules) {
	  if (typeof schema == 'boolean') return !schema;
	  for (var key in schema) if (rules[key]) return true;
	}


	function schemaHasRulesExcept(schema, rules, exceptKeyword) {
	  if (typeof schema == 'boolean') return !schema && exceptKeyword != 'not';
	  for (var key in schema) if (key != exceptKeyword && rules[key]) return true;
	}


	function toQuotedString(str) {
	  return '\'' + escapeQuotes(str) + '\'';
	}


	function getPathExpr(currentPath, expr, jsonPointers, isNumber) {
	  var path = jsonPointers // false by default
	              ? '\'/\' + ' + expr + (isNumber ? '' : '.replace(/~/g, \'~0\').replace(/\\//g, \'~1\')')
	              : (isNumber ? '\'[\' + ' + expr + ' + \']\'' : '\'[\\\'\' + ' + expr + ' + \'\\\']\'');
	  return joinPaths(currentPath, path);
	}


	function getPath(currentPath, prop, jsonPointers) {
	  var path = jsonPointers // false by default
	              ? toQuotedString('/' + escapeJsonPointer(prop))
	              : toQuotedString(getProperty(prop));
	  return joinPaths(currentPath, path);
	}


	var JSON_POINTER$1 = /^\/(?:[^~]|~0|~1)*$/;
	var RELATIVE_JSON_POINTER$1 = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
	function getData($data, lvl, paths) {
	  var up, jsonPointer, data, matches;
	  if ($data === '') return 'rootData';
	  if ($data[0] == '/') {
	    if (!JSON_POINTER$1.test($data)) throw new Error('Invalid JSON-pointer: ' + $data);
	    jsonPointer = $data;
	    data = 'rootData';
	  } else {
	    matches = $data.match(RELATIVE_JSON_POINTER$1);
	    if (!matches) throw new Error('Invalid JSON-pointer: ' + $data);
	    up = +matches[1];
	    jsonPointer = matches[2];
	    if (jsonPointer == '#') {
	      if (up >= lvl) throw new Error('Cannot access property/index ' + up + ' levels up, current level is ' + lvl);
	      return paths[lvl - up];
	    }

	    if (up > lvl) throw new Error('Cannot access data ' + up + ' levels up, current level is ' + lvl);
	    data = 'data' + ((lvl - up) || '');
	    if (!jsonPointer) return data;
	  }

	  var expr = data;
	  var segments = jsonPointer.split('/');
	  for (var i=0; i<segments.length; i++) {
	    var segment = segments[i];
	    if (segment) {
	      data += getProperty(unescapeJsonPointer(segment));
	      expr += ' && ' + data;
	    }
	  }
	  return expr;
	}


	function joinPaths (a, b) {
	  if (a == '""') return b;
	  return (a + ' + ' + b).replace(/' \+ '/g, '');
	}


	function unescapeFragment(str) {
	  return unescapeJsonPointer(decodeURIComponent(str));
	}


	function escapeFragment(str) {
	  return encodeURIComponent(escapeJsonPointer(str));
	}


	function escapeJsonPointer(str) {
	  return str.replace(/~/g, '~0').replace(/\//g, '~1');
	}


	function unescapeJsonPointer(str) {
	  return str.replace(/~1/g, '/').replace(/~0/g, '~');
	}

	var util = __moduleExports$200;

	var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
	var DAYS = [0,31,28,31,30,31,30,31,31,30,31,30,31];
	var TIME = /^(\d\d):(\d\d):(\d\d)(\.\d+)?(z|[+-]\d\d:\d\d)?$/i;
	var HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*$/i;
	var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
	var URIREF = /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
	// uri-template: https://tools.ietf.org/html/rfc6570
	var URITEMPLATE = /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i;
	// For the source: https://gist.github.com/dperini/729294
	// For test cases: https://mathiasbynens.be/demo/url-regex
	// @todo Delete current URL in favour of the commented out URL rule when this issue is fixed https://github.com/eslint/eslint/issues/7983.
	// var URL = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!10(?:\.\d{1,3}){3})(?!127(?:\.\d{1,3}){3})(?!169\.254(?:\.\d{1,3}){2})(?!192\.168(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)(?:\.(?:[a-z\u{00a1}-\u{ffff}0-9]+-?)*[a-z\u{00a1}-\u{ffff}0-9]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu;
	var URL = /^(?:(?:http[s\u017F]?|ftp):\/\/)(?:(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+(?::(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?@)?(?:(?!10(?:\.[0-9]{1,3}){3})(?!127(?:\.[0-9]{1,3}){3})(?!169\.254(?:\.[0-9]{1,3}){2})(?!192\.168(?:\.[0-9]{1,3}){2})(?!172\.(?:1[6-9]|2[0-9]|3[01])(?:\.[0-9]{1,3}){2})(?:[1-9][0-9]?|1[0-9][0-9]|2[01][0-9]|22[0-3])(?:\.(?:1?[0-9]{1,2}|2[0-4][0-9]|25[0-5])){2}(?:\.(?:[1-9][0-9]?|1[0-9][0-9]|2[0-4][0-9]|25[0-4]))|(?:(?:(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-?)*(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)(?:\.(?:(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+-?)*(?:[0-9KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])+)*(?:\.(?:(?:[KSa-z\xA1-\uD7FF\uE000-\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]){2,})))(?::[0-9]{2,5})?(?:\/(?:[\0-\x08\x0E-\x1F!-\x9F\xA1-\u167F\u1681-\u1FFF\u200B-\u2027\u202A-\u202E\u2030-\u205E\u2060-\u2FFF\u3001-\uD7FF\uE000-\uFEFE\uFF00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF])*)?$/i;
	var UUID = /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
	var JSON_POINTER = /^(?:\/(?:[^~/]|~0|~1)*)*$/;
	var JSON_POINTER_URI_FRAGMENT = /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i;
	var RELATIVE_JSON_POINTER = /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/;


	var __moduleExports$199 = formats$1;

	function formats$1(mode) {
	  mode = mode == 'full' ? 'full' : 'fast';
	  return util.copy(formats$1[mode]);
	}


	formats$1.fast = {
	  // date: http://tools.ietf.org/html/rfc3339#section-5.6
	  date: /^\d\d\d\d-[0-1]\d-[0-3]\d$/,
	  // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
	  time: /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d:\d\d)?$/i,
	  'date-time': /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d:\d\d)$/i,
	  // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
	  uri: /^(?:[a-z][a-z0-9+-.]*:)(?:\/?\/)?[^\s]*$/i,
	  'uri-reference': /^(?:(?:[a-z][a-z0-9+-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
	  'uri-template': URITEMPLATE,
	  url: URL,
	  // email (sources from jsen validator):
	  // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
	  // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'willful violation')
	  email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
	  hostname: HOSTNAME,
	  // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
	  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
	  // optimized http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
	  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
	  regex: regex,
	  // uuid: http://tools.ietf.org/html/rfc4122
	  uuid: UUID,
	  // JSON-pointer: https://tools.ietf.org/html/rfc6901
	  // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
	  'json-pointer': JSON_POINTER,
	  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
	  // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
	  'relative-json-pointer': RELATIVE_JSON_POINTER
	};


	formats$1.full = {
	  date: date,
	  time: time,
	  'date-time': date_time,
	  uri: uri,
	  'uri-reference': URIREF,
	  'uri-template': URITEMPLATE,
	  url: URL,
	  email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&''*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
	  hostname: hostname,
	  ipv4: /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
	  ipv6: /^\s*(?:(?:(?:[0-9a-f]{1,4}:){7}(?:[0-9a-f]{1,4}|:))|(?:(?:[0-9a-f]{1,4}:){6}(?::[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){5}(?:(?:(?::[0-9a-f]{1,4}){1,2})|:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(?:(?:[0-9a-f]{1,4}:){4}(?:(?:(?::[0-9a-f]{1,4}){1,3})|(?:(?::[0-9a-f]{1,4})?:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){3}(?:(?:(?::[0-9a-f]{1,4}){1,4})|(?:(?::[0-9a-f]{1,4}){0,2}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){2}(?:(?:(?::[0-9a-f]{1,4}){1,5})|(?:(?::[0-9a-f]{1,4}){0,3}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?:(?:[0-9a-f]{1,4}:){1}(?:(?:(?::[0-9a-f]{1,4}){1,6})|(?:(?::[0-9a-f]{1,4}){0,4}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(?::(?:(?:(?::[0-9a-f]{1,4}){1,7})|(?:(?::[0-9a-f]{1,4}){0,5}:(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(?:%.+)?\s*$/i,
	  regex: regex,
	  uuid: UUID,
	  'json-pointer': JSON_POINTER,
	  'json-pointer-uri-fragment': JSON_POINTER_URI_FRAGMENT,
	  'relative-json-pointer': RELATIVE_JSON_POINTER
	};


	function isLeapYear$2(year) {
	  // https://tools.ietf.org/html/rfc3339#appendix-C
	  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
	}


	function date(str) {
	  // full-date from http://tools.ietf.org/html/rfc3339#section-5.6
	  var matches = str.match(DATE);
	  if (!matches) return false;

	  var year = +matches[1];
	  var month = +matches[2];
	  var day = +matches[3];

	  return month >= 1 && month <= 12 && day >= 1 &&
	          day <= (month == 2 && isLeapYear$2(year) ? 29 : DAYS[month]);
	}


	function time(str, full) {
	  var matches = str.match(TIME);
	  if (!matches) return false;

	  var hour = matches[1];
	  var minute = matches[2];
	  var second = matches[3];
	  var timeZone = matches[5];
	  return ((hour <= 23 && minute <= 59 && second <= 59) ||
	          (hour == 23 && minute == 59 && second == 60)) &&
	         (!full || timeZone);
	}


	var DATE_TIME_SEPARATOR = /t|\s/i;
	function date_time(str) {
	  // http://tools.ietf.org/html/rfc3339#section-5.6
	  var dateTime = str.split(DATE_TIME_SEPARATOR);
	  return dateTime.length == 2 && date(dateTime[0]) && time(dateTime[1], true);
	}


	function hostname(str) {
	  // https://tools.ietf.org/html/rfc1034#section-3.5
	  // https://tools.ietf.org/html/rfc1123#section-2
	  return str.length <= 255 && HOSTNAME.test(str);
	}


	var NOT_URI_FRAGMENT = /\/|:/;
	function uri(str) {
	  // http://jmrware.com/articles/2009/uri_regexp/URI_regex.html + optional protocol + required "."
	  return NOT_URI_FRAGMENT.test(str) && URI.test(str);
	}


	var Z_ANCHOR = /[^\\]\\Z/;
	function regex(str) {
	  if (Z_ANCHOR.test(str)) return false;
	  try {
	    new RegExp(str);
	    return true;
	  } catch(e) {
	    return false;
	  }
	}

	var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var formats = __moduleExports$199();
	var validate = function () {
	  var refVal = [];
	  return function validate(data, dataPath, parentData, parentDataProperty, rootData) {
	    'use strict'; /*# sourceURL=https://schema.field.partners/1.0/get-ledger-balance-params# */

	    var vErrors = null;
	    var errors = 0;
	    if (data && (typeof data === 'undefined' ? 'undefined' : _typeof$1(data)) === "object" && !Array.isArray(data)) {
	      if (true) {
	        var errs__0 = errors;
	        var valid1 = true;
	        for (var key0 in data) {
	          var isAdditional0 = !(false || key0 == 'ledger' || key0 == 'batches' || key0 == 'shoppingList' || key0 == 'products' || key0 == 'expiresAfter');
	          if (isAdditional0) {
	            valid1 = false;
	            validate.errors = [{
	              keyword: 'additionalProperties',
	              dataPath: (dataPath || '') + "",
	              schemaPath: '#/additionalProperties',
	              params: {
	                additionalProperty: '' + key0 + ''
	              },
	              message: 'should NOT have additional properties'
	            }];
	            return false;
	            break;
	          }
	        }
	        if (valid1) {
	          var data1 = data.ledger;
	          if (data1 === undefined) {
	            valid1 = false;
	            validate.errors = [{
	              keyword: 'required',
	              dataPath: (dataPath || '') + "",
	              schemaPath: '#/required',
	              params: {
	                missingProperty: 'ledger'
	              },
	              message: 'should have required property \'ledger\''
	            }];
	            return false;
	          } else {
	            var errs_1 = errors;
	            if (!data1 || (typeof data1 === 'undefined' ? 'undefined' : _typeof$1(data1)) !== "object" || Array.isArray(data1)) {
	              validate.errors = [{
	                keyword: 'type',
	                dataPath: (dataPath || '') + '.ledger',
	                schemaPath: '#/properties/ledger/type',
	                params: {
	                  type: 'object'
	                },
	                message: 'should be object'
	              }];
	              return false;
	            }
	            var valid1 = errors === errs_1;
	          }
	          if (valid1) {
	            var data1 = data.batches;
	            if (data1 === undefined) {
	              valid1 = false;
	              validate.errors = [{
	                keyword: 'required',
	                dataPath: (dataPath || '') + "",
	                schemaPath: '#/required',
	                params: {
	                  missingProperty: 'batches'
	                },
	                message: 'should have required property \'batches\''
	              }];
	              return false;
	            } else {
	              var errs_1 = errors;
	              if (!data1 || (typeof data1 === 'undefined' ? 'undefined' : _typeof$1(data1)) !== "object" || Array.isArray(data1)) {
	                validate.errors = [{
	                  keyword: 'type',
	                  dataPath: (dataPath || '') + '.batches',
	                  schemaPath: '#/properties/batches/type',
	                  params: {
	                    type: 'object'
	                  },
	                  message: 'should be object'
	                }];
	                return false;
	              }
	              var valid1 = errors === errs_1;
	            }
	            if (valid1) {
	              var data1 = data.shoppingList;
	              if (data1 === undefined) {
	                valid1 = false;
	                validate.errors = [{
	                  keyword: 'required',
	                  dataPath: (dataPath || '') + "",
	                  schemaPath: '#/required',
	                  params: {
	                    missingProperty: 'shoppingList'
	                  },
	                  message: 'should have required property \'shoppingList\''
	                }];
	                return false;
	              } else {
	                var errs_1 = errors;
	                if (!data1 || (typeof data1 === 'undefined' ? 'undefined' : _typeof$1(data1)) !== "object" || Array.isArray(data1)) {
	                  validate.errors = [{
	                    keyword: 'type',
	                    dataPath: (dataPath || '') + '.shoppingList',
	                    schemaPath: '#/properties/shoppingList/type',
	                    params: {
	                      type: 'object'
	                    },
	                    message: 'should be object'
	                  }];
	                  return false;
	                }
	                var valid1 = errors === errs_1;
	              }
	              if (valid1) {
	                var data1 = data.products;
	                if (data1 === undefined) {
	                  valid1 = false;
	                  validate.errors = [{
	                    keyword: 'required',
	                    dataPath: (dataPath || '') + "",
	                    schemaPath: '#/required',
	                    params: {
	                      missingProperty: 'products'
	                    },
	                    message: 'should have required property \'products\''
	                  }];
	                  return false;
	                } else {
	                  var errs_1 = errors;
	                  if (!data1 || (typeof data1 === 'undefined' ? 'undefined' : _typeof$1(data1)) !== "object" || Array.isArray(data1)) {
	                    validate.errors = [{
	                      keyword: 'type',
	                      dataPath: (dataPath || '') + '.products',
	                      schemaPath: '#/properties/products/type',
	                      params: {
	                        type: 'object'
	                      },
	                      message: 'should be object'
	                    }];
	                    return false;
	                  }
	                  var valid1 = errors === errs_1;
	                }
	                if (valid1) {
	                  var data1 = data.expiresAfter;
	                  if (data1 === undefined) {
	                    valid1 = true;
	                  } else {
	                    var errs_1 = errors;
	                    if (errors === errs_1) {
	                      if (typeof data1 === "string") {
	                        if (!formats['date-time'].test(data1)) {
	                          validate.errors = [{
	                            keyword: 'format',
	                            dataPath: (dataPath || '') + '.expiresAfter',
	                            schemaPath: '#/properties/expiresAfter/format',
	                            params: {
	                              format: 'date-time'
	                            },
	                            message: 'should match format "date-time"'
	                          }];
	                          return false;
	                        }
	                      } else {
	                        validate.errors = [{
	                          keyword: 'type',
	                          dataPath: (dataPath || '') + '.expiresAfter',
	                          schemaPath: '#/properties/expiresAfter/type',
	                          params: {
	                            type: 'string'
	                          },
	                          message: 'should be string'
	                        }];
	                        return false;
	                      }
	                    }
	                    var valid1 = errors === errs_1;
	                  }
	                }
	              }
	            }
	          }
	        }
	      }
	    } else {
	      validate.errors = [{
	        keyword: 'type',
	        dataPath: (dataPath || '') + "",
	        schemaPath: '#/type',
	        params: {
	          type: 'object'
	        },
	        message: 'should be object'
	      }];
	      return false;
	    }
	    validate.errors = vErrors;
	    return errors === 0;
	  };
	}();
	validate.schema = {
	  "$id": "https://schema.field.partners/1.0/get-ledger-balance-params#",
	  "$schema": "http://json-schema.org/draft-07/schema#",
	  "title": "suggestBatches parameters",
	  "type": "object",
	  "properties": {
	    "ledger": {
	      "type": "object"
	    },
	    "batches": {
	      "type": "object"
	    },
	    "shoppingList": {
	      "type": "object"
	    },
	    "products": {
	      "type": "object"
	    },
	    "expiresAfter": {
	      "type": "string",
	      "format": "date-time"
	    }
	  },
	  "required": ["ledger", "batches", "products", "shoppingList"],
	  "additionalProperties": false
	};
	validate.errors = null;
	var __moduleExports$198 = validate;

	var __moduleExports$197 = {
	  validateSuggestBatchesParams: validateSuggestBatchesParams$1
	};

	var validator = __moduleExports$198;

	function validateSuggestBatchesParams$1(params) {
	  var valid = validator(params);

	  if (valid) {
	    return null;
	  }

	  return validator.errors;
	}

	function _defineProperty$1(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

	var __moduleExports$195 = { suggestBatches: suggestBatches$1, sortFEFO: sortFEFO };

	var _require$10 = __moduleExports$196;
	var getUnknownBatchID = _require$10.getUnknownBatchID;
	var getTBDBatchID = _require$10.getTBDBatchID;
	var _require2$5 = __moduleExports$197;
	var validateSuggestBatchesParams = _require2$5.validateSuggestBatchesParams;
	function suggestBatches$1(params) {
	  var ledger = params.ledger,
	      batches = params.batches,
	      shoppingList = params.shoppingList,
	      products = params.products,
	      expiresAfter = params.expiresAfter;

	  var expiresAfterDate = expiresAfter || new Date().toJSON();
	  var usageErrors = validateSuggestBatchesParams(params);
	  if (usageErrors) {
	    throw new Error(usageErrors[0].message);
	  }

	  return Object.keys(shoppingList).reduce(function (memo, productId) {
	    var productBatches = forProduct(productId, shoppingList[productId], products, batches, ledger, expiresAfterDate);
	    return Object.assign(memo, productBatches);
	  }, {});
	}

	function forProduct(productId, rawDesiredQuantity, products, expiryMap, ledger, expiresAfter) {
	  var presentation = parseInt(products[productId].presentation, 10);
	  var desiredQuantity = roundToPresentation(rawDesiredQuantity, presentation);

	  // Unbatched product
	  if (!ledger[productId].batches) {
	    return _defineProperty$1({}, getUnknownBatchID(productId), {
	      quantity: desiredQuantity
	    });
	  }

	  var productBatches = {};
	  var fefoBatches = sortFEFO(ledger[productId].batches, expiryMap, expiresAfter);
	  var batch = void 0;
	  var remainingQuantity = desiredQuantity;

	  for (var i = 0; i < fefoBatches.length; i++) {
	    batch = fefoBatches[i];
	    if (batch.quantity <= 0) continue;

	    var quantity = batch.quantity >= remainingQuantity ? remainingQuantity : batch.quantity;
	    productBatches[batch.id] = { quantity: quantity };
	    remainingQuantity -= quantity;

	    if (remainingQuantity <= 0) {
	      break;
	    }
	  }

	  if (remainingQuantity) {
	    productBatches[getTBDBatchID(productId)] = { quantity: remainingQuantity };
	  }

	  return productBatches;
	}

	// Using '' for missing expiration to sort it first before existing expirations.
	function sortFEFO(ledgerBatches, expiryMap, expiresAfter) {
	  return Object.keys(ledgerBatches).map(function (id) {
	    return {
	      id: id,
	      quantity: ledgerBatches[id],
	      expiry: expiryMap[id] ? expiryMap[id].expiry : ''
	    };
	  }).sort(sortByExpiry).filter(function (batch) {
	    return filterByExpiry(batch, expiresAfter);
	  });
	}

	function roundToPresentation(value, presentation) {
	  return presentation * Math.ceil(value / presentation);
	}

	function sortByExpiry(a, b) {
	  if (!a.expiry) {
	    return -1;
	  }
	  if (!b.expiry) {
	    return 1;
	  }
	  if (a.expiry < b.expiry) {
	    return -1;
	  }
	  if (a.expiry > b.expiry) {
	    return 1;
	  }
	  return 0;
	}

	function filterByExpiry(batch, expiresAfter) {
	  if (!batch.expiry) {
	    return true;
	  }
	  return batch.expiry > expiresAfter;
	}

	var __moduleExports$203 = getLocationRank$1;

	var locationRanks = {
	  lga: 0,
	  state: 1,
	  zone: 2,
	  national: 3,
	  country: 4
	};

	function getLocationRank$1() {
	  var location = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	  if (location.lga) {
	    return locationRanks.lga;
	  }
	  if (location.state) {
	    return locationRanks.state;
	  }
	  if (location.zone) {
	    return locationRanks.zone;
	  }
	  if (location.id === 'national') {
	    return locationRanks.national;
	  }
	  if (location.id === 'country') {
	    return locationRanks.country;
	  }

	  throw new Error('Unknown location');
	}

	var __moduleExports$204 = docsToSentReceivedSurveys$1;

	var _require$11 = __moduleExports$187;
	var parse$93 = _require$11.parse;
	// comparing survey ids:
	// snId:batchId:survey:2001-01-01T000000 > snId:batchId:survey:2000-01-01T000001


	function docsToSentReceivedSurveys$1() {
	  var docs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

	  return docs.reduce(function (memo, doc) {
	    var _parse = parse$93(doc._id),
	        status = _parse.status;

	    var key = status === 'arrived' || status === 'received' ? 'receivedSurveys' : 'sentSurveys';

	    // If we don't have a survey for this batch, add it.
	    // OR, if we already have a survey for this batch, maybe replace it with a later survey.
	    if (!memo[key][doc.batchId] || memo[key][doc.batchId]._id < doc._id) {
	      memo[key][doc.batchId] = doc;
	    }

	    return memo;
	  }, { sentSurveys: {}, receivedSurveys: {} });
	}

	var __moduleExports$205 = { getShipmentTypes: getShipmentTypes$1 };

	function getShipmentTypes$1() {
	  return {
	    routine: {
	      id: 'routine',
	      name: 'Routine',
	      abbreviation: 'RI'
	    },
	    'campaign:sia': {
	      id: 'campaign:sia',
	      name: 'Campaign',
	      abbreviation: 'SIA'
	    }
	  };
	}

	var generateUnknownBatchForProduct = function generateUnknownBatchForProduct(productId) {
	  return productId + ':manufacturer:unknown:batchNo:unknown';
	};

	var batchIdToProductId = function batchIdToProductId(batchId) {
	  return batchId.split(':').slice(0, 2).join(':');
	};

	var isBatchId = function isBatchId(id) {
	  return id.indexOf(':manufacturer:') !== -1 && id.indexOf(':batchNo:') !== -1;
	};

	var isSnapshotId = function isSnapshotId(id) {
	  return id.indexOf(':agent:') > id.indexOf(':status:');
	};

	var __moduleExports$207 = {
	  generateUnknownBatchForProduct: generateUnknownBatchForProduct,
	  batchIdToProductId: batchIdToProductId,
	  isBatchId: isBatchId,
	  isSnapshotId: isSnapshotId
	};

	var batchToProduct = __moduleExports$207.batchIdToProductId;

	var __moduleExports$206 = shipmentByProduct;

	function shipmentByProduct(shipments, params) {
	  var ignoreUnchecked = (params || {}).ignoreUnchecked;

	  if (!Array.isArray(shipments)) {
	    shipments = [shipments];
	  }

	  return shipments.reduce(function (acc, shipment) {
	    // See fixtures/van-shipments for example of how an incoming shipment looks
	    Object.keys(shipment.counts).forEach(function (key) {
	      // We get a batch id on the shipment doc
	      var productId = batchToProduct(key);
	      acc[productId] = acc[productId] || 0;

	      if (!ignoreUnchecked || shipment.counts[key].checked) {
	        acc[productId] += shipment.counts[key].quantity;
	      }
	    });

	    return acc;
	  }, {});
	}

	var toLocationProperties$1 = __moduleExports$194;

	var _require$9 = __moduleExports$195;
	var suggestBatches = _require$9.suggestBatches;
	var getLocationRank = __moduleExports$203;
	var docsToSentReceivedSurveys = __moduleExports$204;

	var _require2$4 = __moduleExports$205;
	var getShipmentTypes = _require2$4.getShipmentTypes;
	var sumShipmentsByProduct = __moduleExports$206;

	// not all functions are called through index.js in tests so istanbul complains
	/* istanbul ignore next */
	var __moduleExports$193 = {
	  toLocationProperties: toLocationProperties$1,
	  suggestBatches: suggestBatches,
	  getLocationRank: getLocationRank,
	  docsToSentReceivedSurveys: docsToSentReceivedSurveys,
	  getShipmentTypes: getShipmentTypes,
	  sumShipmentsByProduct: sumShipmentsByProduct
	};

	var __moduleExports$192 = {
	  docRequiresNavSync: docRequiresNavSync$1,
	  getLedgerParams: getLedgerParams,
	  translateAndNormalise: translateAndNormalise
	};

	var _require$8 = __moduleExports$187;
	var parse$92 = _require$8.parse;
	var _require2$3 = __moduleExports$193;
	var toLocationProperties = _require2$3.toLocationProperties;
	var translateReport$3 = __moduleExports$181;

	var stockCountIdToLocationProperties$5 = __moduleExports$166; // Takes any document and returns whether or not it requires
	// syncing the latest ledger balance to the legacy NAV database.


	function docRequiresNavSync$1(doc) {
	  if (!doc) return false;
	  if (doc.type === 'stockCount' && doc.submittedAt && doc.version === '2.0.0') return true;

	  if (doc.type === 'snapshot') {
	    var _parse = parse$92(doc._id),
	        status = _parse.status;

	    return status !== 'new' && status !== 'pre-advice';
	  }

	  return false;
	}

	function getLedgerParams(service, doc) {
	  if (doc.type === 'stockCount') {
	    var location = stockCountIdToLocationProperties$5(doc._id);
	    var date = doc.submittedAt;
	    return [{
	      service: service,
	      location: location,
	      date: date
	    }];
	  }

	  if (doc.type === 'snapshot') {
	    var ledgerParams = [];
	    var _date = doc.createdAt;

	    var _parse2 = parse$92(doc._id),
	        origin = _parse2.origin,
	        destination = _parse2.destination,
	        status = _parse2.status; // It needs to be received for it to count at the destination


	    if (status === 'received') {
	      var destinationLocation = toLocationProperties(destination);
	      ledgerParams.push({
	        service: service,
	        location: destinationLocation,
	        date: _date
	      });
	    }

	    if (origin !== 'country') {
	      var originLocation = toLocationProperties(origin);
	      ledgerParams.push({
	        service: service,
	        location: originLocation,
	        date: _date
	      });
	    }

	    return ledgerParams;
	  }

	  return [];
	} // NAV does not track batches and findReport moves the sum of batched products
	// or the caclulated availability of unbatched products to `virtualTotal`. We
	// need this on `amount` instead before converting the stock count from v2 to
	// v1.
	//
	// See: https://github.com/fielded/van-stock-count-api#with-the-addmissingstock-option
	// See: https://github.com/fielded/van-stock-count-api-tools/issues/8
	// See: https://github.com/fielded/van-stock-count-api-tools/pull/27


	function normaliseStock(report) {
	  if (!report.stock) {
	    return {};
	  }

	  var stock = Object.keys(report.stock).reduce(function (acc, productId) {
	    var product = report.stock[productId];
	    var normalisedProduct = {
	      amount: product.amount || 0
	    };

	    if (product.available) {
	      // amount: confirmed and submitted physical count
	      // virtualTotal: amount + shipments since last submitted count
	      //
	      // Give precedence to virtualTotal thereby showing the "live" counts in
	      // NAV.
	      normalisedProduct.amount = product.available;
	    }

	    acc[productId] = normalisedProduct;
	    return acc;
	  }, {});
	  return stock;
	}

	function normaliseReport() {
	  var report = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  var stock = normaliseStock(report);
	  var normalisedReport = {
	    stock: stock,
	    // A stock count report is not a stock count doc, but it's required for
	    // translateReport
	    type: 'stockCount',
	    // Required to show in NAV national tables, see:
	    // https://github.com/fielded/nav-integrated-state-dashboard/blob/8c8fa21e8db66d67587cf520485599a34ba57108/src/app/common/stock/stock.service.js#L288-L293
	    submittedAt: report.submittedAt || report.createdAt || new Date().toISOString()
	  };
	  return Object.assign({}, normalisedReport, report);
	}

	function translateAndNormalise() {
	  var report = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  var normalisedReport = normaliseReport(report);
	  return translateReport$3(normalisedReport, '1.0.0');
	}

	var __moduleExports$208 = {
	  getLedgerRows: getLedgerRows,
	  decorateWithMasterData: decorateWithMasterData,
	  applyFilters: applyFilters
	};

	var dlv$3 = __moduleExports$170;

	var _require$12 = __moduleExports$187;
	var parse$94 = _require$12.parse;
	var isShipmentRelevant$3 = __moduleExports$180;

	var _require2$6 = __moduleExports$188;
	var REPORT_CAMPAIGN_BALANCE_FIELD$1 = _require2$6.REPORT_CAMPAIGN_BALANCE_FIELD;
	var REPORT_BALANCE_FIELD$2 = _require2$6.REPORT_BALANCE_FIELD;
	function getLedgerRows(_ref) {
	  var productId = _ref.productId,
	      locationId = _ref.locationId,
	      reports = _ref.reports,
	      shipments = _ref.shipments,
	      ledger = _ref.ledger;
	  // Heads up: `ledgerDate` is different from the stock count / shipment `date`.
	  // ledgerDate is what we consider the actual time of change in stock at a store.
	  var preppedReports = reports.filter(function (r) {
	    return r.stock[productId] && r.submittedAt;
	  }).map(function (report) {
	    return Object.assign({}, report, {
	      type: 'stockCount',
	      ledgerDate: report.submittedAt
	    });
	  });
	  var preppedShipments = shipments.filter(function (s) {
	    return isShipmentRelevantEver(s, locationId);
	  }).map(function (s) {
	    return prepShipment(s, locationId);
	  });
	  var both = preppedReports.concat(preppedShipments);
	  var rowsWithoutQuantities = getRows(both, productId, locationId);
	  var rows = addResultingQuantities(rowsWithoutQuantities);
	  var balances = getBalances(ledger[productId]);
	  return {
	    rows: rows,
	    balances: balances
	  };
	} // isShipmentRelevant in get-ledger-balance filters out shipments prior to
	// the latest stock count. We want  of them for ledger rows.


	function isShipmentRelevantEver(shipment, locationId) {
	  var lastReportDate = '0000-00-00';
	  var date = '9999-00-00';
	  var location = {
	    id: locationId
	  };
	  return isShipmentRelevant$3({
	    shipment: shipment,
	    location: location,
	    startDate: lastReportDate,
	    endDate: date
	  });
	} // Heads up: these decorators only work if applied to shipments already run through
	// isShipmentRelevant to a location (i.e. this wouldn't work in store-api's doc-to-van-record)


	function prepShipment(shipment, locationId) {
	  var destination = shipment.destination,
	      snapshotDates = shipment.snapshotDates;
	  var isReceive = locationId === destination.id;
	  var ledgerDate = isReceive ? snapshotDates.received : snapshotDates.sent || snapshotDates.received; // unrecorded arrival

	  var isUnrecordedArrival = !isReceive && !snapshotDates.sent;
	  var type = 'shipment';
	  return Object.assign({}, shipment, {
	    isReceive: isReceive,
	    isUnrecordedArrival: isUnrecordedArrival,
	    ledgerDate: ledgerDate,
	    type: type
	  });
	}

	function getRows(shipmentsAndStockCounts, productId, locationId) {
	  // Be sure the oldest entity is first to check for batches missing in stock counts.
	  // We'll need to insert rows to represent they were "deleted" after this.
	  var sortedEntities = shipmentsAndStockCounts.sort(oldestFirst);
	  var runningBatchBalances = {};
	  return sortedEntities.reduce(function (memo, entity) {
	    if (entity.type === 'stockCount') {
	      var stockCountRows = getRowsFromStockCount(entity, productId, runningBatchBalances);
	      runningBatchBalances = updateBatchBalances(runningBatchBalances, stockCountRows);
	      return memo.concat(stockCountRows);
	    }

	    var shortProductID = parse$94(productId).product;
	    var shipmentRows = getRowsFromShipment(entity, shortProductID, locationId);
	    runningBatchBalances = updateBatchBalances(runningBatchBalances, shipmentRows);
	    return memo.concat(shipmentRows);
	  }, []);
	}

	function oldestFirst(a, b) {
	  if (!a.ledgerDate) {
	    return -1;
	  } else if (!b.ledgerDate) {
	    return 1;
	  } else {
	    return a.ledgerDate < b.ledgerDate ? -1 : a.ledgerDate > b.ledgerDate ? 1 : 0;
	  }
	}

	function getRowsFromStockCount(stockCount, productId, priorBatchTotals) {
	  // Unbatched stock count
	  if (!stockCount.stock[productId].batches) {
	    // need a batch ID for shipments mingling later
	    var unknownBatchId = "".concat(productId, ":manufacturer:unknown:batchNo:unknown");
	    var unbatchedRow = makeReportRow(stockCount, unknownBatchId, stockCount.stock[productId].amount || 0);
	    return [unbatchedRow];
	  } // Batched


	  var rows = Object.keys(stockCount.stock[productId].batches).reduce(function (memo, batchId) {
	    var quantity = Number(dlv$3(stockCount.stock[productId].batches[batchId], REPORT_BALANCE_FIELD$2, 0));
	    var row = makeReportRow(stockCount, batchId, quantity);
	    return memo.concat([row]);
	  }, []); // Find any batches we have a balance for that aren't in this stock count
	  // and add rows that 'delete' them with a negative `change` and 0 batch balance

	  var zerodRows = Object.keys(priorBatchTotals).reduce(function (memo, batchId) {
	    if (!stockCount.stock[productId].batches[batchId]) {
	      var removedRow = makeReportRow(stockCount, batchId, 0);
	      return memo.concat([removedRow]);
	    }

	    return memo;
	  }, []);
	  return rows.concat(zerodRows);
	}

	function getRowsFromShipment(shipment, shortProductID, locationId) {
	  return Object.keys(shipment.counts).reduce(function (memo, batchId) {
	    var _parse = parse$94(batchId),
	        product = _parse.product;

	    if (product !== shortProductID) {
	      return memo;
	    }

	    var quantity = shipment.counts[batchId].quantity;
	    var batchQuantity = shipment.isReceive ? quantity : -1 * quantity;
	    var shipmentRow = makeShipmentRow(shipment, batchId, batchQuantity, locationId);
	    return memo.concat([shipmentRow]);
	  }, []);
	}

	function updateBatchBalances(currentBatches, rows, isStockCount) {
	  var batchesInRows = new Set();
	  var updatedBatches = rows.reduce(function (memo, _ref2) {
	    var batchId = _ref2.batchId,
	        quantity = _ref2.quantity;
	    batchesInRows.add(batchId);
	    memo[batchId] = memo[batchId] ? memo[batchId] + quantity : quantity;
	    return memo;
	  }, Object.assign({}, currentBatches));

	  if (!isStockCount) {
	    return updatedBatches;
	  } // we need to zero out any batches not on the stock count


	  for (var batchId in updatedBatches) {
	    if (!batchesInRows.has(batchId)) {
	      updatedBatches[batchId] = 0;
	    }
	  }

	  return updatedBatches;
	}

	function makeReportRow(_ref3, batchId, quantity) {
	  var _id = _ref3._id,
	      ledgerDate = _ref3.ledgerDate;

	  var _parse2 = parse$94(batchId),
	      batchNo = _parse2.batchNo,
	      manufacturer = _parse2.manufacturer;

	  return {
	    type: 'stockCount',
	    _id: _id,
	    ledgerDate: ledgerDate,
	    batchId: batchId,
	    batchNo: batchNo,
	    manufacturer: manufacturer,
	    quantity: quantity
	  };
	}

	function makeShipmentRow(shipment, batchId, quantity, locationId) {
	  var id = shipment.id,
	      snapshotId = shipment.snapshotId,
	      ledgerDate = shipment.ledgerDate,
	      origin = shipment.origin,
	      destination = shipment.destination,
	      isReceive = shipment.isReceive,
	      isUnrecordedArrival = shipment.isUnrecordedArrival;

	  var _parse3 = parse$94(batchId),
	      batchNo = _parse3.batchNo,
	      manufacturer = _parse3.manufacturer;

	  var discrepancy = getBatchDiscrepancies(shipment, batchId);
	  return {
	    type: 'shipment',
	    _id: id,
	    ledgerDate: ledgerDate,
	    snapshotId: snapshotId,
	    otherLocationId: isReceive ? origin.id : destination.id,
	    origin: origin,
	    destination: destination,
	    batchNo: batchNo,
	    manufacturer: manufacturer,
	    batchId: batchId,
	    quantity: quantity,
	    hasDiscrepancy: !!discrepancy,
	    isReceive: isReceive,
	    discrepancy: discrepancy,
	    isUnrecordedArrival: isUnrecordedArrival
	  };
	}

	var getBatchDiscrepancies = function getBatchDiscrepancies(shipment, batchId) {
	  var snapshots = Object.keys(shipment.history);
	  var sentSnapshotId = snapshots.find(function (id) {
	    return id.includes(':sent:');
	  });
	  var receivedSnapshotId = snapshots.find(function (id) {
	    return id.includes(':received:');
	  });
	  if (!sentSnapshotId || !receivedSnapshotId) return 0;
	  var sentQuantity = dlv$3(shipment.history[sentSnapshotId].counts, "".concat(batchId, ".quantity"), 0);
	  var receivedQuantity = dlv$3(shipment.history[receivedSnapshotId].counts, "".concat(batchId, ".quantity"), 0);
	  return receivedQuantity - sentQuantity;
	};

	function getBalances(ledgerProduct) {
	  var _ref4 = ledgerProduct || {},
	      commits = _ref4.commits,
	      total = _ref4.total,
	      availableTotal = _ref4.availableTotal;

	  return {
	    routineStockBalance: availableTotal,
	    campaignStockBalance: dlv$3(commits, REPORT_CAMPAIGN_BALANCE_FIELD$1, 0),
	    overallBalance: total
	  };
	}

	function addResultingQuantities(rows) {
	  var total = 0;
	  var lastBatch = {};
	  var withQuantities = rows.sort(oldestFirst).map(function (row) {
	    var previousBatchQuantity = lastBatch[row.batchId] ? lastBatch[row.batchId] : 0;
	    var change;

	    if (row.type === 'stockCount') {
	      change = lastBatch[row.batchId] ? row.quantity - lastBatch[row.batchId] : row.quantity;
	      total += change;
	      lastBatch[row.batchId] = row.quantity;
	    } else {
	      change = row.quantity;
	      lastBatch[row.batchId] = lastBatch[row.batchId] || 0;
	      lastBatch[row.batchId] += row.quantity;
	      total += change;
	    }

	    return Object.assign({}, row, {
	      change: change,
	      previousBatchQuantity: previousBatchQuantity,
	      balance: total
	    });
	  }).filter(function (row) {
	    return row.change;
	  });
	  withQuantities.reverse();
	  return withQuantities;
	}

	function decorateWithMasterData(rows) {
	  var locationsById = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	  var batchesById = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
	  return rows.map(function (row) {
	    var expiry = getExpiry(batchesById, row.batchId);

	    if (row.type === 'stockCount') {
	      return Object.assign({}, row, {
	        expiry: expiry
	      });
	    }

	    var origin = Object.assign({}, row.origin, getLocationNameObject(locationsById, row.origin.id));
	    var destination = Object.assign({}, row.destination, getLocationNameObject(locationsById, row.destination.id));
	    return Object.assign({}, row, {
	      expiry: expiry,
	      origin: origin,
	      destination: destination
	    });
	  });
	}

	function getExpiry() {
	  var batchesById = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  var batchId = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	  var batch = batchesById[batchId.toLowerCase()];
	  return batch ? batch.expiry : '';
	}

	function getLocationNameObject() {
	  var locationsById = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	  var id = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';
	  var loc = locationsById[id];
	  var name = loc ? loc.name : '';
	  return {
	    name: name
	  };
	} // Pass in full list of unfiltered rows, current balances, and row filters
	// (The two row filteres in use are batchNo and otherLocationId)


	function applyFilters(filters, unfilteredBalances, unfilteredRows) {
	  if (!filters || !Object.keys(filters).length) {
	    return {
	      rows: unfilteredRows,
	      balances: unfilteredBalances
	    };
	  }

	  var filteredRows = unfilteredRows.filter(function (row) {
	    return Object.keys(filters).every(function (filterKey) {
	      return row[filterKey] === filters[filterKey];
	    });
	  });
	  var rows = addResultingQuantities(filteredRows);
	  var finalBalance = rows.length ? rows[0].balance : 0;
	  var balances = {
	    routineStockBalance: finalBalance,
	    campaignStockBalance: 0,
	    overallBalance: finalBalance
	  };
	  return {
	    rows: rows,
	    balances: balances
	  };
	}

	var _require = __moduleExports;
	var dateToReportingPeriod = _require.dateToReportingPeriod;
	var previousReportingPeriod = _require.previousReportingPeriod;
	var nextReportingPeriod = _require.nextReportingPeriod;
	var reportingPeriodToDate = _require.reportingPeriodToDate;
	var endOfReportingPeriodToDate = _require.endOfReportingPeriodToDate;
	var reportProgress = __moduleExports$165;

	var docToStockCountRecord = __moduleExports$172;

	var generateReportIds = __moduleExports$176;

	var locationIdToParent = __moduleExports$178;

	var locationIdToProperties = __moduleExports$167;

	var locationIdToSubmitProperties = __moduleExports$169;

	var pickLastSubmittedReport = __moduleExports$179;

	var shouldTrackBatches = __moduleExports$168;

	var isShipmentRelevant = __moduleExports$180;

	var stockCountIdToLocationProperties = __moduleExports$166;

	var toStockCountId = __moduleExports$177;

	var translateReport = __moduleExports$181;

	var toDraftStockCountId = __moduleExports$182;

	var draftLocationIdToProperties = __moduleExports$184;

	var draftStockCountIdToLocationProperties = __moduleExports$185;

	var applyCalculatedField = __moduleExports$174;

	var _require2 = __moduleExports$186;
	var getLedgerBalance = _require2.getLedgerBalance;
	var _require3 = __moduleExports$189;
	var ledgerBalanceToReport = _require3.ledgerBalanceToReport;
	var _require4 = __moduleExports$192;
	var docRequiresNavSync = _require4.docRequiresNavSync;
	var ledgerRowTools = __moduleExports$208; // not all functions are called through index.js in tests so istanbul complains

	/* istanbul ignore next */


	var index = {
	  dateToReportingPeriod: dateToReportingPeriod,
	  previousReportingPeriod: previousReportingPeriod,
	  nextReportingPeriod: nextReportingPeriod,
	  reportProgress: reportProgress,
	  docToStockCountRecord: docToStockCountRecord,
	  generateReportIds: generateReportIds,
	  locationIdToParent: locationIdToParent,
	  locationIdToProperties: locationIdToProperties,
	  locationIdToSubmitProperties: locationIdToSubmitProperties,
	  pickLastSubmittedReport: pickLastSubmittedReport,
	  shouldTrackBatches: shouldTrackBatches,
	  stockCountIdToLocationProperties: stockCountIdToLocationProperties,
	  toStockCountId: toStockCountId,
	  translateReport: translateReport,
	  reportingPeriodToDate: reportingPeriodToDate,
	  toDraftStockCountId: toDraftStockCountId,
	  draftLocationIdToProperties: draftLocationIdToProperties,
	  draftStockCountIdToLocationProperties: draftStockCountIdToLocationProperties,
	  getLedgerBalance: getLedgerBalance,
	  ledgerBalanceToReport: ledgerBalanceToReport,
	  endOfReportingPeriodToDate: endOfReportingPeriodToDate,
	  docRequiresNavSync: docRequiresNavSync,
	  applyCalculatedField: applyCalculatedField,
	  ledgerRowTools: ledgerRowTools,
	  isShipmentRelevant: isShipmentRelevant
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