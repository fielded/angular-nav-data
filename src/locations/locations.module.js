import angular from 'angular'

import LocationsService from './locations.service'
import LgasService from './lgas.service'
import StatesService from './states.service'
import ZonesService from './zones.service'
import { default as utilsModuleName } from '../utils/utils.module'

var moduleName = 'angularNavData.locations'

angular
  .module(moduleName, [
    utilsModuleName,
    'ngSmartId',
    'pouchdb'
  ])
  .service('locationsService', LocationsService)
  .service('lgasService', LgasService)
  .service('statesService', StatesService)
  .service('zonesService', ZonesService)

export default moduleName
