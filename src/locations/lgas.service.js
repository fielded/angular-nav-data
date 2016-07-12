class LgasService {
  constructor ($q, smartId, locationsService, statesService, productListService, angularNavDataUtilsService) {
    this.cachedLgasByState = {}
    this.defaultZone
    this.defaultState
    this.registeredOnCacheUpdatedCallbacks = {}

    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService
    this.statesService = statesService
    this.productListService = productListService
    this.utils = angularNavDataUtilsService

    // For the state dashboard:
    // locations are replicated and the zone and state are set by default
    // with `setState`
    const onReplicationComplete = this.bustCache.bind(this)
    this.locationsService.callOnReplicationComplete('lgas-service', onReplicationComplete)
  }

  registerOnCacheUpdatedCallback (id, callback) {
    if (!this.registeredOnCacheUpdatedCallbacks[id]) {
      this.registeredOnCacheUpdatedCallbacks[id] = callback
    }
  }

  unregisterOnCacheUpdatedCallback (id) {
    delete this.registeredOnCacheUpdatedCallbacks[id]
  }

  bustCache () {
    this.byState({ bustCache: true })
    this.setDefaultStateRelevantProducts()
  }

  setDefaultStateRelevantProducts () {
    const setRelevantProducts = (stateConfig) => {
      this.productListService.setRelevant(stateConfig.products)
    }

    const configId = 'configuration:' + this.smartId.idify({ zone: this.defaultZone, state: this.defaultState }, 'zone:state')
    this.locationsService
      .get(configId)
      .then(setRelevantProducts)
  }

  queryAndUpdateCache (options) {
    const addId = (lga) => {
      lga.id = this.smartId.parse(lga._id).lga
      return lga
    }

    const query = (options) => {
      const queryOptions = {
        'include_docs': true,
        ascending: true
      }

      // For state dashboard (querying local PouchDB) prefer the more
      // performant `allDocs` instead of a view
      if (options.zone && options.state) {
        queryOptions.startkey = 'zone:' + options.zone + ':state:' + options.state + ':'
        queryOptions.endkey = 'zone:' + options.zone + ':state:' + options.state + ':\uffff'

        return this.locationsService.allDocs(queryOptions)
      }

      // For national dashboard
      queryOptions.key = 'lga'
      return this.locationsService.query('locations/by-level', queryOptions)
    }

    const updateCache = (state, docs) => {
      const withIds = docs.map(addId)
      if (state) {
        this.cachedLgasByState[state] = withIds
      } else {
        this.cachedLgasByState = withIds
      }
      // This makes the assumption that the cache only contains an empty list
      // of lgas when the replication is not yet done
      if (!this.utils.isIndexedCacheEmpty(this.cachedLgasByState, state)) {
        this.utils.callEach(this.registeredOnCacheUpdatedCallbacks)
      }
    }

    return query(options)
      .then(updateCache.bind(null, options.state))
  }

  byState (options = {}) {
    const onlyId = (doc) => doc.id

    const prepareRes = () => {
      let res = angular.copy(this.cachedLgasByState)

      if (options.onlyIds) {
        Object.keys(res).forEach((key) => {
          res[key] = res[key].map(onlyId)
        })
      }

      if (options.zone && options.state) {
        res = res[options.state]
      }


      return res
    }

    options.zone = options.zone || this.defaultZone
    options.state = options.state || this.defaultState

    if (!options.bustCache && !this.utils.isIndexedCacheEmpty(this.cachedLgasByState, options.state)) {
      return this.$q.when(prepareRes())
    }

    return this.queryAndUpdateCache(options)
      .then(prepareRes)
  }

  idsByState (options = {}) {
    options.onlyIds = true
    return this.byState(options)
  }

  setState (zone, state) {
    this.defaultZone = zone
    this.defaultState = state
    this.statesService.setZone(this.defaultZone)
    this.bustCache()
  }

  get (lgaId) {
    const findLga = (lgas) => {
      for (const lga of lgas) {
        if (lga._id === lgaId) {
          return lga
        }
      }
    }

    const state = this.smartId.parse(lgaId).state
    const zone = this.smartId.parse(lgaId).zone
    return this.byState({ zone: zone, state: state }).then(findLga)
  }
}

LgasService.$inject = ['$q', 'smartId', 'locationsService', 'statesService', 'productListService', 'angularNavDataUtilsService']

export default LgasService
