import _ from 'lodash'

export class PanelsManager {

  constructor({ dbManager }) {
    this.dbManager = dbManager
  }

  async initDatabaseCollection() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('panels')
    if (!coll) {
      coll = db.addCollection('panels')
      db.saveDatabase()
    }
    const panel = { active: false, minimized: false, featureName: '', featureData: {} }
    let leftPanel = coll.findOne({ position: 'left' })
    if (!leftPanel) {
      leftPanel = coll.insert({ position: 'left', css: { width: '30%', height: '100%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }, ...panel })
    }
    const leftPanelClone = _.clone(leftPanel)
    _.defaultsDeep(leftPanelClone, leftPanel)
    if (!_.isEqual(leftPanel, leftPanelClone)) {
      coll.update(leftPanelClone)
    }
    let rightPanel = coll.findOne({ position: 'right' })
    if (!rightPanel) {
      rightPanel = coll.insert({ position: 'right', css: { width: '30%', height: '100%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }, ...panel })
    }
    const rightPanelClone = _.clone(rightPanel)
    _.defaultsDeep(rightPanelClone, rightPanel)
    if (!_.isEqual(rightPanel, rightPanelClone)) {
      coll.update(rightPanelClone)
    }
    let topPanel = coll.findOne({ position: 'top' })
    if (!topPanel) {
      topPanel = coll.insert({ position: 'top', css: { width: '100%', height: '20%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }, ...panel })
    }
    const topPanelClone = _.clone(topPanel)
    _.defaultsDeep(topPanelClone, topPanel)
    if (!_.isEqual(topPanel, topPanelClone)) {
      coll.update(topPanelClone)
    }
    let bottomPanel = coll.findOne({ position: 'bottom' })
    if (!bottomPanel) {
      bottomPanel = coll.insert({ position: 'bottom', css: { width: '100%', height: '20%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }, ...panel })
    }
    const bottomPanelClone = _.clone(bottomPanel)
    _.defaultsDeep(bottomPanelClone, bottomPanel)
    if (!_.isEqual(bottomPanel, bottomPanelClone)) {
      coll.update(bottomPanelClone)
    }
  }

  async restorePanels({ features }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('panels')
    for (let panelDb of coll.data) {
      if (panelDb.active) {
        const feature = features.filter(feature => feature.featureName === panelDb.featureName)[0]
        if (feature && feature['restorePanel']) {
          feature.restorePanel({ position: panelDb.position, featureData: panelDb.featureData })
        }
      }
    }
  }

  async savePanel({ position, active = true, minimized = false, featureName, featureData, css = null }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('panels')
    let panelDbObj = coll.findOne({ position })
    panelDbObj.position = position
    panelDbObj.active = active
    panelDbObj.minimized = minimized
    panelDbObj.featureName = featureName
    panelDbObj.featureData = featureData
    if (css) {
      panelDbObj.css.width = css.width
      panelDbObj.css.height = css.height
    }
    coll.update(panelDbObj)
    db.saveDatabase()
  }

  async updatePanelOption({ position, option, value }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('panels')
    let panelDbObj = coll.findOne({ position })
    panelDbObj[option] = value
    coll.update(panelDbObj)
    db.saveDatabase()
  }

  async getPanel({ position }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('panels')
    return coll.findOne({ position })
  }

  // async removePanel({ position }) {
  //   const db = await this.dbManager.getDatabase('settings')
  //   const coll = db.getCollection('panels')
  //   coll.findAndRemove({ position })
  // }



}