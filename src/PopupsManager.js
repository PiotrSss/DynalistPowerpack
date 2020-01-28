
export class PopupsManager {

  constructor({ dbManager }) {
    this.dbManager = dbManager
  }

  async initDatabaseCollection() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('popups')
    if (!coll) {
      coll = db.addCollection('popups')
      db.saveDatabase()
    }
  }

  async restorePopups({ features }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('popups')
    for (let popup of coll.data) {
      const feature = features.filter(feature => feature.featureName === popup.featureName)[0]
      if (feature && feature['restorePopup']) {
        feature.restorePopup({ id: popup.id, header: popup.header, size: popup.size, position: popup.position, status: popup.status, featureData: popup.featureData })
      }
    }
  }

  async savePopup({ id, header, size, position, status, featureName, featureData }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('popups')
    let popupDbObj = coll.findOne({ id })
    if (!popupDbObj) {
      popupDbObj = { id, header, size, position, status, featureName, featureData }
      coll.insert(popupDbObj)
    } else {
      popupDbObj.header = header
      popupDbObj.size = size
      popupDbObj.position = position
      popupDbObj.status = status
      popupDbObj.featureName = featureName
      popupDbObj.featureData = featureData
      coll.update(popupDbObj)
    }
    db.saveDatabase()
  }

  async updatePopupOption({ id, option, value }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('popups')
    let popupDbObj = coll.findOne({ id })
    if (popupDbObj) {
      popupDbObj[option] = value
      coll.update(popupDbObj)
      db.saveDatabase()
    }
  }

  async removePopup({ id }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('popups')
    coll.findAndRemove({ id })
  }

}