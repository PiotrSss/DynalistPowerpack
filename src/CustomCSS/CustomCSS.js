import _ from 'lodash'
import $ from 'jquery'
require('jquery-ui')
require('jquery-ui/ui/widgets/sortable')

import { generateId } from '../helpers'
import { clearfix } from '../templates'

export class CustomCSS {

  constructor({ dbManager, settingsManager, dlInterface }) {
    this.dbManager = dbManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'CustomCSS'
    this.featureTitle = 'CustomCSS'

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

    const stylesheetsFragment = $('<div>', { 'class': 'settings-popup-sortable-input-rows-wrapper settings-popup-sortable-input-rows-wrapper-stylesheets' })
    const rowsJqNode = $('<ul>', { 'class': 'settings-popup-sortable-input-rows settings-popup-sortable-input-stylesheets-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
        await this.saveStylesheets()
        this.reactivate()
      }
    })
    const addStylesheetBtnJqNode = $('<button>', { 'class': 'btn btn-add btn-add-stylesheet', value: 'Add stylesheet' }).text('Add stylesheet').on('mousedown', () => {
      rowsJqNode.append(this.createStylesheet({ id: generateId(), css: '', defaultTheme: false, sepiaTheme: false, darkTheme: false }))
    })
    const saveStylesheetsBtnJqNode = $('<button>', { 'class': 'btn btn-save', value: 'Save stylesheets' }).text('Save stylesheets').on('mousedown', async () => {
      await this.saveStylesheets()
      this.reactivate()
    })

    const stylesheets = await this.getStylesheets()
    stylesheets.map(stylesheet => {
      rowsJqNode.append(this.createStylesheet({ id: stylesheet.id, css: stylesheet.css, defaultTheme: stylesheet.defaultTheme, sepiaTheme: stylesheet.sepiaTheme, darkTheme: stylesheet.darkTheme }))
    })
    stylesheetsFragment.append(rowsJqNode, clearfix(), addStylesheetBtnJqNode, saveStylesheetsBtnJqNode)

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, stylesheetsFragment] })
  }

  async activate() {

    const theme = this.dlInterface.getTheme() + 'Theme'

    const stylesheets = await this.getStylesheets()
    stylesheets.map(stylesheet => {
      if (stylesheet[theme]) {
        const style = $("<style>", { 'class': "powerpack3-CustomCSS", "type": "text/css" })
        style.append(stylesheet.css)
        $('head').append(style)
      }
    })
  }

  deactivate() {
    $('.powerpack3-CustomCSS').remove()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  onThemeChange() {
    this.reactivate()
  }

  async getStylesheets() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('stylesheets')
    if (!coll) {
      coll = db.addCollection('stylesheets')
      db.saveDatabase()
    }
    return coll.chain().simplesort('position').data()
  }

  async saveStylesheet({ id, position, css, defaultTheme, sepiaTheme, darkTheme }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('stylesheets')
    let stylesheetDbObj = coll.find({ id })[0]
    if (!stylesheetDbObj) {
      stylesheetDbObj = { id, position, css, defaultTheme, sepiaTheme, darkTheme }
      coll.insert(stylesheetDbObj)
    } else {
      stylesheetDbObj.id = id
      stylesheetDbObj.position = position
      stylesheetDbObj.css = css
      stylesheetDbObj.defaultTheme = defaultTheme
      stylesheetDbObj.sepiaTheme = sepiaTheme
      stylesheetDbObj.darkTheme = darkTheme
      coll.update(stylesheetDbObj)
    }
    await db.saveDatabase()
  }

  async saveStylesheets() {
    await Promise.all($('.settings-popup-sortable-input-rows-wrapper-stylesheets').find('li').map(async (index, stylesheetRow) => {
      console.log(stylesheetRow)
      const css = $(stylesheetRow).find('.settings-popup-custom-css-textarea').val()
      const defaultTheme = $(stylesheetRow).find('.settings-popup-custom-css-checkbox-default').prop('checked')
      const sepiaTheme = $(stylesheetRow).find('.settings-popup-custom-css-checkbox-sepia').prop('checked')
      const darkTheme = $(stylesheetRow).find('.settings-popup-custom-css-checkbox-dark').prop('checked')
      console.log(css)
      console.log(defaultTheme)
      console.log(sepiaTheme)
      console.log(darkTheme)
      await this.saveStylesheet({ id: $(stylesheetRow).attr('data-id'), position: index + 1, css, defaultTheme, sepiaTheme, darkTheme })
    }))
  }

  async removeStylesheet(id) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('stylesheets')
    coll.findAndRemove({ id })
  }

  createStylesheet({ id, css, defaultTheme, sepiaTheme, darkTheme }) {
    const rowJqNode = $('<li>', { 'class': 'settings-popup-sortable-input-row', 'data-id': id })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')
    const cssJqNode = $('<textarea>', { 'class': 'settings-popup-custom-css-textarea' }).text(css)
    const checkboxesWrapper = $('<div>', { 'class': `settings-popup-custom-css-checkboxes-wrapper` })
    const label = $('<span>', { 'class': `settings-popup-custom-css-checkboxes-label` }).text('Active for theme:')
    const checkboxes = $('<span>', { 'class': `settings-popup-custom-css-checkboxes` })
    const checkboxDefaultTheme = $(`<input type="checkbox" class="settings-popup-custom-css-checkbox settings-popup-custom-css-checkbox-default" id="${id}default">`).prop('checked', defaultTheme)
    const labelDefaultTheme = $(`<label for="${id}default">default</label>`).prepend(checkboxDefaultTheme)
    const checkboxSepiaTheme = $(`<input type="checkbox" class="settings-popup-custom-css-checkbox settings-popup-custom-css-checkbox-sepia" id="${id}sepia">`).prop('checked', sepiaTheme)
    const labelSepiaTheme = $(`<label for="${id}sepia">sepia</label>`).prepend(checkboxSepiaTheme)
    const checkboxDarkTheme = $(`<input type="checkbox" class="settings-popup-custom-css-checkbox settings-popup-custom-css-checkbox-dark" id="${id}dark">`).prop('checked', darkTheme)
    const labelDarkTheme = $(`<label for="${id}dark">dark</label>`).prepend(checkboxDarkTheme)
    checkboxes.append(checkboxDefaultTheme, labelDefaultTheme, checkboxSepiaTheme, labelSepiaTheme, checkboxDarkTheme, labelDarkTheme)
    checkboxesWrapper.append(label, checkboxes)
    const removeBtnJqNode = $('<button>', { 'class': 'btn btn-remove btn-remove-stylesheet', value: 'Remove stylesheet' }).text('Remove stylesheet').on('mousedown', async () => {
      rowJqNode.remove()
      this.removeStylesheet(id)
      await this.saveStylesheets()
      this.reactivate()
    })
    return rowJqNode.append(handle, cssJqNode, clearfix(), checkboxesWrapper, clearfix(), removeBtnJqNode, clearfix())
  }

}