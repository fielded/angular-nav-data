import VANApiTools from '@fielded/van-stock-count-api-tools'

class TranslatorService {
  translate (data, version) {
    return VANApiTools.translateReport(data, version)
  }
}

export default TranslatorService
