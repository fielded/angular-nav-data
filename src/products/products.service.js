const registerCallback = (replicationFrom, callback) => {
  replicationFrom.then(callback)
}

class ProductsService {
  constructor ($injector, pouchDB, angularNavDataUtilsService) {
    this.pouchDB = pouchDB
    this.angularNavDataUtilsService = angularNavDataUtilsService

    this.remoteDB
    this.replicationFrom
    this.localDB
    this.registeredOnReplicationCompleteCallbackIds = []
    this.callbacksPendingRegistration = []

    let dataModuleRemoteDB
    try {
      dataModuleRemoteDB = $injector.get('dataModuleRemoteDB')
      this.remoteDB = this.pouchDB(dataModuleRemoteDB)
    } catch (e) {
      if (console && console.log) {
        console.log('AngularNavData error: dataModuleRemoteDB should be set')
      }
    }
  }

  startReplication (zone, state) {
    if (!this.remoteDB) { return }

    var options = {
      filter: 'products/all'
    }

    this.localDB = this.pouchDB('navIntProductsDB')
    this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)

    while (this.callbacksPendingRegistration.length) {
      let callback = this.callbacksPendingRegistration.shift()
      registerCallback(this.replicationFrom, callback)
    }
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

ProductsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService']

export default ProductsService
