import angular from 'angular'
import TranslatorService from './translator.service'

var moduleName = 'angularNavData.translator'

angular
  .module(moduleName, [])
  .service('translatorService', TranslatorService)

export default moduleName
