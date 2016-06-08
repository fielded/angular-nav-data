const registerCallback = (replicationFrom, callback) => {
  replicationFrom.then(callback)
}

export default class ProductsService {
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
    this.callbacksPendingRegistration = []
  }

  startReplication (zone, state) {
    var options = {
      filter: 'products/products'
    }

    this.localDB = this.pouchDB('navIntProductsDB')
    this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)
    this.callbacksPendingRegistration.forEach(registerCallback.bind(null, this.replicationFrom))
  }

  callOnReplicationComplete (callbackId, callback) {
    if (this.registeredOnReplicationCompleteCallbackIds.indexOf(callbackId) === -1) {
      this.registeredOnReplicationCompleteCallbackIds.push(callbackId)
      if (this.replicationFrom) {
        registerCallback(this.replicationFrom, callback)
      } else { // in case the registration happens before starting the replication
        this.callbacksPendingRegistration.push(callback)
      }
    }
  }

  allDocs (options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.allDocs(db, options)
  }
}
