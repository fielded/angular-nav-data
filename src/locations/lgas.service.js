class LgasService {
  constructor ($q, smartId, locationsService, statesService) {
    this.cachedLgasByState = {}
    this.cachedLgaIdsByState = {}
    this.defaultZone
    this.defaultState

    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService
    this.statesService = statesService

    // For the state dashboard:
    // locations are replicated and the zone and state are set by default
    // with `setState`
    this.locationsService.callOnReplicationComplete('lgas-service', this.byState.bind(this))
  }

  queryAndUpdateCache (zone, state) {
    const onlyId = (lga) => {
      return lga.id
    }

    const addId = (lga) => {
      lga.id = this.smartId.parse(lga._id).lga
      return lga
    }

    const query = (zone, state) => {
      var options = {
        'include_docs': true,
        ascending: true,
        startkey: 'zone:' + zone + ':state:' + state + ':',
        endkey: 'zone:' + zone + ':state:' + state + ':\uffff'
      }

      return this.locationsService.allDocs(options)
    }

    const updateCache = (state, docs) => {
      this.cachedLgasByState[state] = docs.map(addId)
      this.cachedLgaIdsByState[state] = this.cachedLgasByState[state].map(onlyId)
    }

    return query(zone, state)
      .then(updateCache.bind(null, state))
  }

  byState (zone, state) {
    zone = zone || this.defaultZone
    state = state || this.defaultState
    if (!this.cachedLgasByState[state]) {
      return this.queryAndUpdateCache(zone, state)
              .then(function () { return this.cachedLgasByState[state] }.bind(this))
    }
    return this.$q.when(this.cachedLgasByState[state])
  }

  idsByState (zone, state) {
    zone = zone || this.defaultZone
    state = state || this.defaultState
    if (!this.cachedLgasByState[state]) {
      return this.queryAndUpdateCache(zone, state)
              .then(function () { return this.cachedLgaIdsByState[state] }.bind(this))
    }
    return this.$q.when(this.cachedLgaIdsByState[state])
  }

  setState (zone, state) {
    this.defaultZone = zone
    this.defaultState = state

    // Set or update the default zone on the zone service
    this.statesService.setZone(this.defaultZone)
    // Call this.byState to update the cache with the default state data
    this.byState()
  }

  get (lgaId) {
    // Why is this not working?
    // const findLga = (lgas) => lgas.find(lga => (lga._id === lgaId))

    const findLga = (lgas) => {
      for (const lga of lgas) {
        if (lga._id === lgaId) {
          return lga
        }
      }
    }

    const state = this.smartId.parse(lgaId).state
    const zone = this.smartId.parse(lgaId).zone
    return this.byState(zone, state).then(findLga)
  }
}

LgasService.$inject = ['$q', 'smartId', 'locationsService', 'statesService']

export default LgasService
