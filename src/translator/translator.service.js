import VANApiTools from '@fielded/van-stock-count-api/build/lib/tools'

class TranslatorService {
  translate (data, version) {
    return VANApiTools.translateReport(data, version)
  }
}

export default TranslatorService
