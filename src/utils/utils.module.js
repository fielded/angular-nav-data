import angular from 'angular'
import UtilsService from './utils.service'

var moduleName = 'angularNavData.utils'

angular
  .module(moduleName, [
    'ngSmartId'
  ])
  .service('angularNavDataUtilsService', UtilsService)

export default moduleName
