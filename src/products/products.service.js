import { replication as replicationConfig } from '../config.json'
import { default as utilService } from '../utils/utils.service'

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
    const onReplicationComplete = () => {
      Object.keys(this.onReplicationCompleteCallbacks)
        .forEach((id) => this.onReplicationCompleteCallbacks[id]())
    }

    const onReplicationPaused = (err) => {
      if (!err) {
        onReplicationComplete()
        this.stopReplication()
      }
    }

    var options = {
      filter: 'products/all',
      live: true,
      retry: true
    }

    if (!this.localDB) {
      this.localDB = this.pouchDB('navIntProductsDB')
    }

    if (!this.replicationFrom) {
      this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)

      this.replicationFrom
        .on('paused', onReplicationPaused)
    }
    this.localDB.changes({conflicts: true, onChange: utilService.checkAndResolveConflicts.bind(null, this.localDB)})
  }

  stopReplication () {
    if (this.replicationFrom && this.replicationFrom.cancel) {
      this.replicationFrom.cancel()
    }
  }

  callOnReplicationComplete (id, callback) {
    if (this.onReplicationCompleteCallbacks[id]) {
      return
    }
    this.onReplicationCompleteCallbacks[id] = callback
  }

  allDocs (options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.allDocs(db, options)
  }
}

ProductsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService']

export default ProductsService
