import VANApiTools from '@fielded/van-stock-count-api-tools'

class TranslatorService {
  translate (data, version) {
    const service = {
      id: 'program:immunization:service:immunization',
      program: { reportingPeriod: 'weekly' }
    }
    const stockCountRecord = VANApiTools.docToStockCountRecord(data, service)
    return VANApiTools.translateReport(stockCountRecord, version)
  }
}

export default TranslatorService
