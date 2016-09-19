import { replication as replicationConfig } from '../config.json'

const registerCallback = (replicationFrom, callback) => {
  replicationFrom.then(callback)
}

class ProductsService {
  constructor ($injector, pouchDB, angularNavDataUtilsService) {
    let dataModuleRemoteDB

    const pouchDBOptions = {
      ajax: {
        timeout: replicationConfig.timeout
      },
      skip_setup: true
    }

    try {
      dataModuleRemoteDB = $injector.get('dataModuleRemoteDB')
    } catch (e) {
      throw new Error('dataModuleRemoteDB should be provided in the data module configuration')
    }

    this.pouchDB = pouchDB
    this.angularNavDataUtilsService = angularNavDataUtilsService

    this.remoteDB = this.pouchDB(dataModuleRemoteDB, pouchDBOptions)
    this.replicationFrom
    this.localDB
    this.onReplicationCompleteCallbacks = {}
  }

  startReplication () {
    var options = {
      filter: 'products/all'
    }

    if (!this.localDB) {
      this.localDB = this.pouchDB('navIntProductsDB')
    }

    if (!this.replicationFrom) {
      this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)

      Object.keys(this.onReplicationCompleteCallbacks)
        .forEach((id) => registerCallback(this.replicationFrom, this.onReplicationCompleteCallbacks[id]))
    }

    return this.replicationFrom
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
