const registerCallback = (replicationFrom, callback) => {
  replicationFrom.then(callback)
}

class LocationsService {
  constructor ($injector, pouchDB, angularNavDataUtilsService) {
    let dataModuleRemoteDB

    try {
      dataModuleRemoteDB = $injector.get('dataModuleRemoteDB')
    } catch (e) {
      throw new Error('dataModuleRemoteDB should be provided in the data module configuration')
    }

    this.pouchDB = pouchDB
    this.angularNavDataUtilsService = angularNavDataUtilsService

    this.remoteDB = this.pouchDB(dataModuleRemoteDB)
    this.replicationFrom
    this.localDB
    this.registeredOnReplicationCompleteCallbackIds = []
    this.callbacksPendingRegistration = {}
  }

  startReplication (zone, state) {
    var options = {
      filter: 'locationsByState/locationsByState',
      query_params: {
        zone: zone,
        state: state
      }
    }

    this.localDB = this.pouchDB('navIntLocationsDB')
    this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)

    Object.keys(this.callbacksPendingRegistration, (callbackId) => {
      registerCallback(this.replicationFrom, this.callbacksPendingRegistration[callbackId])
      delete this.callbacksPendingRegistration[callbackId]
    })
  }

  registerOnReplicationCompleteCallback (callbackId, callback) {
    if (this.registeredOnReplicationCompleteCallbackIds.indexOf(callbackId) === -1) {
      this.registeredOnReplicationCompleteCallbackIds.push(callbackId)
      if (this.replicationFrom) {
        registerCallback(this.replicationFrom, callback)
      } else { // in case the registration happens before starting the replication
        this.callbacksPendingRegistration[callbackId] = callback
      }
    }
  }

  unregisterOnReplicationCompleteCallback (callbackId) {
    const index = this.registeredOnReplicationCompleteCallbackIds.indexOf(callbackId)
    if (index) {
      this.registeredOnReplicationCompleteCallbackIds.splice(index, 1)
      if (this.callbacksPendingRegistration[callbackId]) {
        delete this.callbacksPendingRegistration[callbackId]
      }
    }
  }

  allDocs (options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.allDocs(db, options)
  }
}

LocationsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService']

export default LocationsService
