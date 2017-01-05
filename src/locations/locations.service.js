import { replication as replicationConfig } from '../config.json'

class LocationsService {
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
    this.onChangeCompleteCallbacks = {}
    this.onReplicationCompleteCallbacks = {}
  }

  startReplication (zone, state) {
    const onComplete = (handler, res) => {
      Object.keys(this[handler])
        .forEach(id => this[handler][id](res))
    }

    const onChangeComplete = res => onComplete('onChangeCompleteCallbacks', res)
    const onReplicationComplete = () => onComplete('onReplicationCompleteCallbacks')

    const onReplicationPaused = (err) => {
      if (!err) {
        onReplicationComplete()
        this.stopReplication()
      }
    }

    var options = {
      filter: 'locations/by-level',
      query_params: {
        zone: zone
      },
      live: true,
      retry: true
    }

    if (state) {
      options.query_params.state = state
    }

    if (!this.localDB) {
      this.localDB = this.pouchDB('navIntLocationsDB')
    }

    if (!this.replicationFrom || this.replicationFrom.state === 'cancelled') {
      this.replicationFrom = this.localDB.replicate.from(this.remoteDB, options)

      this.replicationFrom
        .on('paused', onReplicationPaused)
    }

    const changeOpts = {
      conflicts: true,
      include_docs: true
    }

    const handleConflicts = change => {
      this.angularNavDataUtilsService
        .checkAndResolveConflicts(change, this.localDB)
        .then(onChangeComplete)
        .catch(onChangeComplete)
    }

    this.localDB.changes(changeOpts).$promise
      .then(null, null, handleConflicts)
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

  unregisterOnReplicationComplete (id) {
    delete this.onReplicationCompleteCallbacks[id]
  }

  callOnChangeComplete (id, callback) {
    if (this.onChangeCompleteCallbacks[id]) {
      return
    }
    this.onChangeCompleteCallbacks[id] = callback
  }

  unregisterOnChangeComplete (id) {
    delete this.onReplicationCompleteCallbacks[id]
  }

  allDocs (options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.allDocs(db, options)
  }

  query (view, options) {
    const db = this.localDB || this.remoteDB
    return this.angularNavDataUtilsService.query(db, view, options)
  }

  get (id) {
    const db = this.localDB || this.remoteDB
    return db.get(id)
  }
}

LocationsService.$inject = ['$injector', 'pouchDB', 'angularNavDataUtilsService']

export default LocationsService
