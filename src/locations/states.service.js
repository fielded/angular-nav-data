class StatesService {
  constructor ($q, smartId, locationsService, angularNavDataUtilsService) {
    this.cachedStatesByZone = {}
    this.defaultZone
    this.registeredOnCacheUpdatedCallbacks = {}

    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService
    this.utils = angularNavDataUtilsService

    // For the state dashboard:
    // locations are replicated and the zone and state are set by default
    const onReplicationComplete = this.byZone.bind(this, { bustCache: true })
    this.locationsService.callOnReplicationComplete('states-service', onReplicationComplete)
  }

  registerOnCacheUpdatedCallback (id, callback) {
    if (!this.registeredOnCacheUpdatedCallbacks[id]) {
      this.registeredOnCacheUpdatedCallbacks[id] = callback
    }
  }

  unregisterOnCacheUpdatedCallback (id) {
    delete this.registeredOnCacheUpdatedCallbacks[id]
  }

  queryAndUpdateCache (options) {
    const addId = (state) => {
      state.id = this.smartId.parse(state._id).state
      return state
    }

    const query = (options) => {
      const queryOptions = {
        'include_docs': true,
        ascending: true
      }

      // For state dashboard (querying local PouchDB) prefer the more
      // performant `allDocs` instead of a view
      if (options.zone) {
        queryOptions.startkey = 'zone:' + options.zone + ':'
        queryOptions.endkey = 'zone:' + options.zone + ':\uffff'

        return this.locationsService.allDocs(queryOptions)
      }

      // For national dashboard
      queryOptions.key = 'state'
      return this.locationsService.query('locations/by-level', queryOptions)
    }

    const updateCache = (zone, docs) => {
      const withIds = docs.map(addId)
      if (zone) {
        this.cachedStatesByZone[zone] = withIds
      } else {
        this.cachedStatesByZone = this.utils.groupByLevel(withIds, 'zone')
      }
      // This makes the assumption that the cache only contains an empty list
      // of states when the replication is not yet done
      if (!this.utils.isIndexedCacheEmpty(this.cachedStatesByZone, zone)) {
        this.utils.callEach(this.registeredOnCacheUpdatedCallbacks)
      }
    }

    return query(options)
      .then(updateCache.bind(null, options.zone))
  }

  byZone (options = {}) {
    const onlyId = (doc) => doc.id

    const prepareRes = () => {
      let res = angular.copy(this.cachedStatesByZone)

      if (options.onlyIds) {
        Object.keys(res).forEach((key) => {
          res[key] = res[key].map(onlyId)
        })
      }

      if (options.zone) {
        res = res[options.zone]
      }

      if (options.asArray) {
        res = this.utils.toArray(res)
      }

      return res
    }

    options.zone = options.zone || this.defaultZone

    if (!options.bustCache && !this.utils.isIndexedCacheEmpty(this.cachedStatesByZone, options.zone)) {
      return this.$q.when(prepareRes())
    }

    return this.queryAndUpdateCache(options)
      .then(prepareRes)
  }

  idsByZone (options = {}) {
    options.onlyIds = true
    return this.byZone(options)
  }

  list (options = {}) {
    options.asArray = true
    return this.byZone(options)
  }

  setZone (zone) {
    this.defaultZone = zone
    this.byZone({ bustCache: true })
  }

  get (stateId) {
    // Why is this not working?
    // const findState = (states) => states.find(state => (state._id === stateId))

    const findState = (states) => {
      for (const state of states) {
        if (state._id === stateId) {
          return state
        }
      }
    }

    const zone = this.smartId.parse(stateId).zone
    return this.byZone({ zone: zone }).then(findState)
  }
}

StatesService.$inject = ['$q', 'smartId', 'locationsService', 'angularNavDataUtilsService']

export default StatesService
