class ZonesService {
  constructor ($q, smartId, locationsService) {
    this.cachedZones = []
    this.$q = $q
    this.smartId = smartId
    this.locationsService = locationsService
  }

  queryAndUpdateCache (options) {
    const addId = (zone) => {
      zone.id = this.smartId.parse(zone._id).zone
      return zone
    }

    const query = (options) => {
      const queryOptions = {
        'include_docs': true,
        ascending: true,
        key: 'zone'
      }

      return this.locationsService.query('locations/by-level', queryOptions)
    }

    const updateCache = (docs) => {
      const withIds = docs.map(addId)
      this.cachedZones = withIds
    }

    return query(options)
      .then(updateCache)
  }

  all (options = {}) {
    const onlyId = (doc) => doc.id

    const prepareRes = () => {
      let res = angular.copy(this.cachedZones)

      if (options.onlyIds) {
        Object.keys(res).forEach((key) => {
          res[key] = res[key].map(onlyId)
        })
      }

      return res
    }

    if (!options.bustCache && this.cachedZones.length) {
      return this.$q.when(prepareRes())
    }

    return this.queryAndUpdateCache(options)
      .then(prepareRes)
  }

  ids (options = {}) {
    options.onlyIds = true
    return this.all(options)
  }

  list (options = {}) {
    return this.all(options)
  }

  get (zoneId) {
    const findZone = (zones) => {
      for (const zone of zones) {
        if (zone._id === zoneId) {
          return zone
        }
      }
    }

    return this.all().then(findZone)
  }
}

ZonesService.$inject = ['$q', 'smartId', 'locationsService']

export default ZonesService
