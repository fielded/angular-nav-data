export default class StatesService {
  constructor ($q, smartId, locationsService) {
    this.cachedStatesByZone = {}
    this.cachedStateIdsByZone = {}
    this.defaultZone

    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService

    // For the state dashboard:
    // locations are replicated and the zone and state are set by default
    this.locationsService.callOnReplicationComplete('states-service', this.byZone.bind(this))
    this.byZone()
  }

  queryAndUpdateCache (zone) {
    const onlyId = (state) => {
      return state.id
    }

    const addId = (state) => {
      state.id = this.smartId.parse(state._id).state
      return state
    }

    const filterStates = (docs) => {
      return docs.filter(doc => doc.level === 'state')
    }

    const query = (zone) => {
      var options = {
        'include_docs': true,
        ascending: true,
        startkey: 'zone:' + zone + ':',
        endkey: 'zone:' + zone + ':\uffff'
      }

      return this.locationsService.allDocs(options).then(filterStates)
    }

    const updateCache = (zone, docs) => {
      this.cachedStatesByZone[zone] = docs.map(addId)
      this.cachedStateIdsByZone[zone] = this.cachedStatesByZone[zone].map(onlyId)
    }

    return query(zone)
      .then(updateCache.bind(null, zone))
  }

  byZone (zone) {
    zone = zone || this.defaultZone
    if (!this.cachedStatesByZone[zone]) {
      return this.queryAndUpdateCache(zone)
              .then(function () { return this.cachedStatesByZone[zone] }.bind(this))
    }
    return this.$q.when(this.cachedStatesByZone[zone])
  }

  idsByZone (zone) {
    zone = zone || this.defaultZone
    if (!this.cachedStatesByZone[zone]) {
      return this.queryAndUpdateCache(zone)
              .then(function () { return this.cachedStateIdsByZone[zone] }.bind(this))
    }
    return this.$q.when(this.cachedStateIdsByZone[zone])
  }

  setZone (zone) {
    this.defaultZone = zone
  }
}
