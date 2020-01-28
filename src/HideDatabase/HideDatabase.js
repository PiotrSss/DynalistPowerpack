import { getStatusPopupSection } from '../templates'


export class HideDatabase {

  constructor({ settingsManager, dbName }) {
    this.settingsManager = settingsManager
    this.dbName = dbName
    this.featureName = 'HideDatabase'
    this.init()
  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: true
      }
    })
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async getSetting(settingName) {
    return await this.settingsManager.getSetting({ featureName: this.featureName, settingName: settingName })
  }

  async getPopupSettingsSection() {

    const statusFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, label: 'Hide database document', settingName: 'status', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    return statusFragment
  }

  activate() {
    $(`.DocumentItem-title:contains('${this.dbName}')`).closest('.DocumentItem').addClass('hide-document')
  }

  deactivate() {
    $(`.DocumentItem-title:contains('${this.dbName}')`).closest('.DocumentItem').removeClass('hide-document')
  }



}