import _ from 'lodash'

import { checkboxTemplate, selectTemplate, inputTemplate, settingsPopupSectionTemplate, clearfix } from './templates'

export class SettingsManager {

  constructor({ dbManager, dlInterface }) {
    this.dbManager = dbManager
    this.dlInterface = dlInterface
  }

  async initSettingsDatabase() {
    await this.dbManager.getDatabase('settings')
  }

  async getSettingsPopupContent(features) {
    let body = $('<div class="settings-popup"></div>')
    for (let feature of features) {
      body.append(await feature.getPopupSettingsSection())
    }
    return body[0]
  }

  async initFeatureSettings({ featureName, defaults }) {

    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('features')
    if (!coll) {
      coll = db.addCollection('features', { indices: ['name'] })
      db.saveDatabase()
    }
    let feature = coll.findOne({ name: featureName })
    if (!feature) {
      feature = coll.insert({ name: featureName, ...defaults })
    }
    const featureClone = _.clone(feature)
    _.defaultsDeep(featureClone, defaults)
    if (!_.isEqual(feature, featureClone)) {
      coll.update(featureClone)
    }
  }

  async getSetting({ featureName, settingName }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('features')
    const feature = coll.findOne({ name: featureName })
    return feature[settingName]
  }

  async updateSetting({ featureName, settingName, value }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('features')
    const feature = coll.findOne({ name: featureName })
    feature[settingName] = value
    coll.update(feature)
  }

  async removeSetting({ featureName, settingName }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('features')
    const feature = coll.findOne({ name: featureName })
    delete feature[settingName]
    coll.update(feature)
  }

  async toggleSetting({ featureName, settingName, callback = () => { } }) {
    const settingValue = await this.getSetting({ featureName, settingName: settingName })
    this.updateSetting({ featureName, settingName: settingName, value: !settingValue })
    callback(!settingValue)
  }

  async buildCheckboxPopupElement({ featureName, settingName = 'status', label = 'Active', callbackOn = () => { }, callbackOff = () => { } }) {
    return await checkboxTemplate({
      checkboxId: `popup-${featureName}-${settingName}-checkbox`, label, checked: await this.getSetting({ featureName, settingName }), onChange: async () => {
        await this.toggleSetting({
          featureName, settingName, callback: (settingAfterChange) => {
            if (settingAfterChange) {
              callbackOn()
            } else {
              callbackOff()
            }
          }
        })
      }
    })
  }

  async buildCheckboxesSubsectionPopupElement({ featureName, label = null, checkboxes }) {
    const wrapperJqNode = $('<div>', { 'class': `settings-popup-subsection settings-popup-subsection-${featureName}` })
    const checkboxesJqNodes = await Promise.all(checkboxes.map(async checkbox => {
      return wrapperJqNode.append(await this.buildCheckboxPopupElement({ featureName, settingName: checkbox.settingName, label: checkbox.label, callbackOn: checkbox.callbackOn, callbackOff: checkbox.callbackOff }), clearfix())
    }))
    if (label) {
      const labelJqNode = $('<h4>', { 'class': `settings-popup-subsection-header settings-popup-subsection-${featureName}-header` }).text(label)
      wrapperJqNode.prepend(labelJqNode)
    }
    return wrapperJqNode
  }

  async buildSelectPopupElement({ featureName, settingName, label, help = '', selected, values, onChange }) {
    return await selectTemplate({
      selectId: `popup-${featureName}-${settingName}-select`, label, help, selected, values, onChange: (selectedValue) => {
        this.updateSetting({ featureName, settingName, value: selectedValue })
        if (onChange) { onChange() }
      }
    })
  }

  async buildInputPopupElement({ featureName, settingName, label, help = '', onBeforeSave, onAfterSave }) {
    return await inputTemplate({
      inputId: `popup-${featureName}-${settingName}-input`, label, help, value: await this.getSetting({ featureName, settingName }), onSave: (inputValue) => {
        if (onBeforeSave) {
          onBeforeSave()
        }
        this.updateSetting({ featureName, settingName, value: inputValue })
        if (onAfterSave) {
          onAfterSave()
        }
      }
    })
  }

  async buildFeaturePopupSection({ featureName, featureTitle, settingsFragments }) {
    const settingsVisibility = await this.getSetting({ featureName, settingName: 'settingsVisible' })

    return settingsPopupSectionTemplate({
      featureName, featureTitle, settingsFragments, settingsVisibility, onSectionToggle: () => {
        this.toggleSetting({ featureName, settingName: 'settingsVisible' })
      }
    })

  }
}