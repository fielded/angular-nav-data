import { bulkForceInsert } from '../utils'

const registerCallback = (replicationFrom, callback) => {
  replicationFrom.then(callback)
}

class ProductsService {
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
    this.onReplicationCompleteCallbacks = {}
  }

  startReplication (zone, state) {
    this.localDB = this.pouchDB('navIntProductsDB')
    return bulkForceInsert(this.localDB, this.remoteDB, 'product:')
  }

  callOnReplicationComplete (id, callback) {
    if (this.onReplicationCompleteCallbacks[id]) {
      return
    }
    this.onReplicationCompleteCallbacks[id] = callback
    if (this.replicationFrom) {
      registerCallback(this.replicationFrom, callback)
    }
  }

  allDocs (options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.allDocs(db, options)
  }
}

ProductsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService']

export default ProductsService
