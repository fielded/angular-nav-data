import VANApiTools from '@fielded/van-stock-count-api-tools'

class TranslatorService {
  translate (data, version) {
    const stockCountRecord = VANApiTools.docToStockCountRecord(data)
    return VANApiTools.translateReport(stockCountRecord, version)
  }
}

export default TranslatorService
