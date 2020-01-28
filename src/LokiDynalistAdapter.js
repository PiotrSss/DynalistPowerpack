

export class LokiDynalistAdapter {

  constructor({ dlInterface, dbManager }) {
    this.dlInterface = dlInterface
    this.dbManager = dbManager
  }

  async loadDatabase(dbname, callback) {
    const data = await this.dbManager.getRawDatabaseData(dbname)
    callback(data)
    console.log('Database "' + dbname + '" loaded')
    return true
  }

  async saveDatabase(dbname, dbstring, callback) {
    await this.dbManager.saveRawDatabaseData({ name: dbname, data: dbstring })
    callback(null)
    console.log('Database "' + dbname + '" saved')
  }

  deleteDatabase(dbname, callback) {
    console.log('Database "' + dbname + '" removed')
  }

}