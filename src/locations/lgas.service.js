export default class LgasService {
  constructor ($q, smartId, locationsService) {
    this.cachedLgasByState = {}
    this.cachedLgaIdsByState = {}
    this.defaultZone
    this.defaultState

    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService

    // For the state dashboard:
    // locations are replicated and the zone and state are set by default
    // with `setState`
    this.locationsService.callOnReplicationComplete('lgas-service', this.byState.bind(this))
    this.byState()
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
              .then(function () { return this.cachedLgasByState[state] })
    }
    return this.$q.when(this.cachedLgasByState[state])
  }

  idsByState (zone, state) {
    zone = zone || this.defaultZone
    state = state || this.defaultState
    if (!this.cachedLgasByState[state]) {
      return this.queryAndUpdateCache(zone, state)
              .then(function () { return this.cachedLgaIdsByState[state] })
    }
    return this.$q.when(this.cachedLgaIdsByState[state])
  }

  setState (zone, state) {
    this.defaultZone = zone
    this.defaultState = state
  }
}
