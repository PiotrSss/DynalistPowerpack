import _ from 'lodash'
import $ from 'jquery'
require('jquery-ui')
require('jquery-ui/ui/widgets/sortable')

import { generateId } from '../helpers'
import { clearfix } from '../templates'

export class TagsStyling {

  constructor({ dbManager, settingsManager, dlInterface }) {
    this.dbManager = dbManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'TagsStyling'
    this.featureTitle = 'Tags styling'

    this.init()

  }

  async init() {

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false
      }
    })

    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async getSetting(settingName) {
    return await this.settingsManager.getSetting({ featureName: this.featureName, settingName: settingName })
  }

  updateSetting({ name, value }) {
    this.settingsManager.updateSetting({ featureName: this.featureName, settingName: name, value: value })
  }

  async getPopupSettingsSection() {

    const statusFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'status', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    const tagsFragment = $('<div>', { 'class': 'settings-popup-sortable-input-rows-wrapper settings-popup-sortable-input-rows-wrapper-tags' })
    const rowsJqNode = $('<ul>', { 'class': 'settings-popup-sortable-input-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
        await this.saveTags()
        this.reactivate()
      }
    })
    const addTagBtnJqNode = $('<button>', { 'class': 'btn btn-add btn-add-tag', value: 'Add tag' }).text('Add tag').on('mousedown', () => {
      rowsJqNode.append(this.createTag({ id: generateId(), name: '', style: '', }))
    })
    const saveTagsBtnJqNode = $('<button>', { 'class': 'btn btn-save btn-save-tags', value: 'Save tags' }).text('Save tags').on('mousedown', async () => {
      await this.saveTags()
      this.reactivate()
    })

    const tags = _.orderBy(await this.getTags(), ['position']).map(tag => {
      rowsJqNode.append(this.createTag({ id: tag.id, name: tag.name, style: tag.style, }))
    })
    tagsFragment.append(rowsJqNode, clearfix(), addTagBtnJqNode, saveTagsBtnJqNode)


    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, tagsFragment] })
  }

  async activate() {
    const $style = $("<style>", { id: "dynalist-powerpack3-TagsStyling", "type": "text/css" })
    let tags = await this.getTags()
    let starts = _.filter(tags, (tag) => { return tag.name.includes('starts:') })
    let ends = _.filter(tags, (tag) => { return tag.name.includes('ends:') })
    let contains = _.filter(tags, (tag) => { return tag.name.includes('contains:') })
    let rest = _.filter(tags, (tag) => { return !tag.name.includes('starts:') && !tag.name.includes('ends:') && !tag.name.includes('contains:') })

    for (let tag of starts) {
      let style = !tag.style.endsWith(';') ? tag.style.replace(/\;/g, '!important;') + '!important;' : tag.style.replace(/\;/g, '!important;')
      let name = tag.name.replace('starts:', '').trim()
      if (tag.name.includes(':hover')) {
        name = name.replace(':hover', '')
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title^="Filter ${name}"]:hover, .DocumentContainer .Node-self .node-tag[title^="Filter ${name}"]:hover { ${style} }`)
      } else {
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title^="Filter ${name}"], .DocumentContainer .Node-self .node-tag[title^="Filter ${name}"] { ${style} transition: .3s }`)
      }
    }

    for (let tag of ends) {
      let style = !tag.style.endsWith(';') ? tag.style.replace(/\;/g, '!important;') + '!important;' : tag.style.replace(/\;/g, '!important;')
      let name = tag.name.replace('ends:', '').trim()
      if (tag.name.includes(':hover')) {
        name = name.replace(':hover', '')
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title$="${name}"]:hover, .DocumentContainer .Node-self .node-tag[title$="${name}"]:hover { ${style} }`)
      } else {
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title$="${name}"], .DocumentContainer .Node-self .node-tag[title$="${name}"] { ${style} transition: .3s }`)
      }
    }

    for (let tag of contains) {
      let style = !tag.style.endsWith(';') ? tag.style.replace(/\;/g, '!important;') + '!important;' : tag.style.replace(/\;/g, '!important;')
      let name = tag.name.replace('contains:', '').trim()
      if (tag.name.includes(':hover')) {
        name = name.replace(':hover', '')
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title*="${name}"]:hover, .DocumentContainer .Node-self .node-tag[title*="${name}"]:hover { ${style} }`)
      } else {
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title*="${name}"], .DocumentContainer .Node-self .node-tag[title*="${name}"] { ${style} transition: .3s }`)
      }
    }

    for (let tag of rest) {
      let style = !tag.style.endsWith(';') ? tag.style.replace(/\;/g, '!important;') + '!important;' : tag.style.replace(/\;/g, '!important;')
      let name = tag.name.trim()
      if (tag.name.includes(':hover')) {
        name = name.replace(':hover', '')
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title="Filter ${name}"]:hover, .DocumentContainer .Node-self .node-tag[title="Filter ${name}"]:hover { ${style} }`)
      } else {
        $style.append(`.DocumentContainer .Node-self .has-color .node-tag[title="Filter ${name}"], .DocumentContainer .Node-self .node-tag[title="Filter ${name}"] { ${style} transition: .3s }`)
      }
    }
    $('head').append($style)
  }

  deactivate() {
    $('style#dynalist-powerpack3-TagsStyling').remove()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async getTags() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('tags')
    if (!coll) {
      coll = db.addCollection('tags')
      db.saveDatabase()
    }
    return coll.chain().simplesort('position').data()
  }

  async saveTag({ id, position, name, style }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('tags')
    let popupDbObj = coll.find({ id })[0]
    if (!popupDbObj) {
      popupDbObj = { id, position, name, style }
      coll.insert(popupDbObj)
    } else {
      popupDbObj.id = id
      popupDbObj.position = position
      popupDbObj.name = name
      popupDbObj.style = style
      coll.update(popupDbObj)
    }
    await db.saveDatabase()
  }

  async saveTags(tags) {
    await Promise.all($('.settings-popup-sortable-input-rows-wrapper-tags').find('li').map(async (index, tagRow) => {
      const name = $(tagRow).children('.settings-popup-sortable-input-name').first().val()
      const style = $(tagRow).children('.settings-popup-sortable-input-style').first().val()
      if (name.length > 0 || style.length > 0) {
        await this.saveTag({ id: $(tagRow).attr('data-id'), position: index + 1, name, style })
      }
    }))
  }

  async removeTag(id) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('tags')
    coll.findAndRemove({ id })
  }

  createTag({ id, position, name, style }) {
    const rowJqNode = $('<li>', { 'class': 'settings-popup-sortable-input-row', 'data-id': id })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')
    const inputNameJqNode = $('<input>', { 'class': 'settings-popup-input settings-popup-sortable-input settings-popup-sortable-input-name', type: 'input', val: name })
    const inputStyleJqNode = $('<input>', { 'class': 'settings-popup-input settings-popup-sortable-input settings-popup-sortable-input-style', type: 'input', val: style })
    const removeBtnJqNode = $('<button>', { 'class': 'btn btn-remove btn-remove-tag', value: 'remove' }).text('remove').on('mousedown', async () => {
      rowJqNode.remove()
      this.removeTag(id)
      await this.saveTags()
      this.reactivate()
    })
    return rowJqNode.append(handle, inputNameJqNode, inputStyleJqNode, removeBtnJqNode, clearfix())
  }

}