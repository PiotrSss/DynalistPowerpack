import _ from 'lodash'
import $ from 'jquery'
require('jquery-ui')
require('jquery-ui/ui/widgets/sortable')

import { generateId } from '../helpers'
import { clearfix } from '../templates'

export class Workspaces {

  constructor({ dbManager, settingsManager, dlInterface }) {
    this.dbManager = dbManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'Workspaces'
    this.featureTitle = 'Workspaces'

    this.init()

  }

  async init() {

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        closeAll: false
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
    const closeAllFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, label: 'Close all current elements when switching', settingName: 'closeAll', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate()
    })

    const workspacesFragment = $('<div>', { 'class': 'settings-popup-sortable-input-rows-wrapper settings-popup-sortable-input-rows-wrapper-workspaces' })
    const rowsJqNode = $('<ul>', { 'class': 'settings-popup-sortable-input-rows settings-popup-sortable-input-workspaces-rows' }).sortable({
      handle: ".handle", stop: async (event, ui) => {
        await this.saveWorkspaces()
        this.reactivate()
      }
    })
    const addWorkspaceBtnJqNode = $('<button>', { 'class': 'btn btn-add btn-add-workspace', value: 'Add workspace' }).text('Add workspace').on('mousedown', () => {
      rowsJqNode.append(this.createWorkspace({ id: generateId(), name: '', main: '', panelLeft: '', panelRight: '', panelTop: '', panelBottom: '', popup1: '', popup2: '', popup3: '', popup4: '', popup5: '' }))
    })
    const saveWorkspacesBtnJqNode = $('<button>', { 'class': 'btn btn-save', value: 'Save workspaces' }).text('Save workspaces').on('mousedown', async () => {
      await this.saveWorkspaces()
      this.reactivate()
    })

    // const workspaces = _.orderBy(await this.getWorkspaces(), ['position']).map(tag => {
    const workspaces = await this.getWorkspaces()
    workspaces.map(workspace => {
      rowsJqNode.append(this.createWorkspace({ id: workspace.id, name: workspace.name, main: workspace.main, panelLeft: workspace.panelLeft, panelRight: workspace.panelRight, panelTop: workspace.panelTop, panelBottom: workspace.panelBottom, popup1: workspace.popup1, popup2: workspace.popup2, popup3: workspace.popup3, popup4: workspace.popup4, popup5: workspace.popup5 }))
    })
    workspacesFragment.append(rowsJqNode, clearfix(), addWorkspaceBtnJqNode, saveWorkspacesBtnJqNode)


    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, closeAllFragment, workspacesFragment] })
  }

  async activate() {
    const wrapper = $('<div>', { 'class': 'workspaces-wrapper' })
    if (DYNALIST.PLATFORM !== 'web') {
      wrapper.addClass('is-desktop')
    }
    $('.AppHeader').append(wrapper)
    const removeAll = $('<i class="fas fa-eraser"><div class="tooltip" data-title="Remove all Panels and Popups"></div></i>').on('mousedown', () => {
      $('.powerpack3-panel').each((i, panel) => {
        $(panel).find('.control-buttons .fa-times').click()
      })
      $('.jsPanel').each((i, popup) => {
        $(popup)[0].close()
      })
    })
    wrapper.append(removeAll)

    const workspaces = await this.getWorkspaces()
    workspaces.map(workspace => {
      const name = workspace.name.length > 10 ? workspace.name.substring(0, 10) + '...' : workspace.name
      const workspaceBtn = $('<button>', { 'class': 'workspace-button' }).text(name).on('mousedown', async () => {
        if (await this.getSetting('closeAll')) {
          removeAll.mousedown()
        }
        if (workspace.main !== '') {
          DYNALIST.app.userspace.view.get_url_manager().parse_url_and_apply_state(workspace.main)
        }
        if (workspace.panelLeft !== '') {
          this.open({ type: 'panel', position: 'left', content: workspace.panelLeft })
        }
        if (workspace.panelRight !== '') {
          this.open({ type: 'panel', position: 'right', content: workspace.panelRight })
        }
        if (workspace.panelTop !== '') {
          this.open({ type: 'panel', position: 'top', content: workspace.panelTop })
        }
        if (workspace.panelBottom !== '') {
          this.open({ type: 'panel', position: 'bottom', content: workspace.panelBottom })
        }
        if (workspace.popup1 !== '') {
          this.open({ type: 'popup', content: workspace.popup1 })
        }
        if (workspace.popup2 !== '') {
          this.open({ type: 'popup', content: workspace.popup2 })
        }
        if (workspace.popup3 !== '') {
          this.open({ type: 'popup', content: workspace.popup3 })
        }
        if (workspace.popup4 !== '') {
          this.open({ type: 'popup', content: workspace.popup4 })
        }
        if (workspace.popup5 !== '') {
          this.open({ type: 'popup', content: workspace.popup5 })
        }
      })
      workspaceBtn.append($(`<div class="tooltip" data-title="${workspace.name}"></div>`))
      wrapper.append(workspaceBtn)
    })
  }

  deactivate() {
    $('.workspaces-wrapper').remove()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  open({ type, position = null, content }) {
    let featureName = 'OpenLinkIn'
    if (content.startsWith('Agenda')) {
      content = content.replace('Agenda:', '').trim()
      featureName = 'Agenda'
    }
    //  else if (content.startsWith('Document')) {
    //   content = content.replace('Document:', '').trim()
    //   featureName = 'OpenLinkIn'
    // } else if (content.startsWith('WWW')) {
    //   content = content.replace('WWW:', '').trim()
    //   featureName = 'OpenLinkIn'
    // }
    const feature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === featureName)[0]
    if (type === 'panel') {
      if (feature && feature['openInPanel']) {
        feature.openInPanel({ data: content, position })
      }
    } else if (type === 'popup') {
      if (feature && feature['openInPopup']) {
        feature.openInPopup({ data: content })
      }
    }
  }

  async getWorkspaces() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('workspaces')
    if (!coll) {
      coll = db.addCollection('workspaces')
      db.saveDatabase()
    }
    return coll.chain().simplesort('position').data()
  }

  async saveWorkspace({ id, position, name, main, panelLeft, panelRight, panelTop, panelBottom, popup1, popup2, popup3, popup4, popup5 }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('workspaces')
    let workspaceDbObj = coll.find({ id })[0]
    if (!workspaceDbObj) {
      workspaceDbObj = { id, position, name, main, panelLeft, panelRight, panelTop, panelBottom, popup1, popup2, popup3, popup4, popup5 }
      coll.insert(workspaceDbObj)
    } else {
      workspaceDbObj.id = id
      workspaceDbObj.position = position
      workspaceDbObj.name = name
      workspaceDbObj.main = main
      workspaceDbObj.panelLeft = panelLeft
      workspaceDbObj.panelRight = panelRight
      workspaceDbObj.panelTop = panelTop
      workspaceDbObj.panelBottom = panelBottom
      workspaceDbObj.popup1 = popup1
      workspaceDbObj.popup2 = popup2
      workspaceDbObj.popup3 = popup3
      workspaceDbObj.popup4 = popup4
      workspaceDbObj.popup5 = popup5
      coll.update(workspaceDbObj)
    }
    await db.saveDatabase()
  }

  async saveWorkspaces() {
    await Promise.all($('.settings-popup-sortable-input-rows-wrapper-workspaces').find('li').map(async (index, workspaceRow) => {
      const name = $(workspaceRow).children('.settings-popup-sortable-input-name').first().val()
      const main = $(workspaceRow).children('.settings-popup-sortable-input-main').first().val()
      const panelLeft = $(workspaceRow).children('.settings-popup-sortable-input-panel-left').first().val()
      const panelRight = $(workspaceRow).children('.settings-popup-sortable-input-panel-right').first().val()
      const panelTop = $(workspaceRow).children('.settings-popup-sortable-input-panel-top').first().val()
      const panelBottom = $(workspaceRow).children('.settings-popup-sortable-input-panel-bottom').first().val()
      const popup1 = $(workspaceRow).children('.settings-popup-sortable-input-popup-1').first().val()
      const popup2 = $(workspaceRow).children('.settings-popup-sortable-input-popup-2').first().val()
      const popup3 = $(workspaceRow).children('.settings-popup-sortable-input-popup-3').first().val()
      const popup4 = $(workspaceRow).children('.settings-popup-sortable-input-popup-4').first().val()
      const popup5 = $(workspaceRow).children('.settings-popup-sortable-input-popup-5').first().val()
      if (name.length > 0) {
        await this.saveWorkspace({ id: $(workspaceRow).attr('data-id'), position: index + 1, name, main, panelLeft, panelRight, panelTop, panelBottom, popup1, popup2, popup3, popup4, popup5 })
      }
    }))
  }

  async removeWorkspace(id) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('workspaces')
    coll.findAndRemove({ id })
  }

  createWorkspace({ id, name, main, panelLeft, panelRight, panelTop, panelBottom, popup1, popup2, popup3, popup4, popup5 }) {
    const rowJqNode = $('<li>', { 'class': 'settings-popup-sortable-input-row', 'data-id': id })
    const handle = $('<i class="fas fa-arrows-alt handle"></i>')
    const inputNameJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-name', type: 'text', val: name, placeholder: 'Name' })
    const inputMainJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-main', type: 'text', val: main, placeholder: 'Main document' })
    const inputPanelLeftJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-panel-left', type: 'text', val: panelLeft, placeholder: 'Left Panel' })
    const inputPanelRightJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-panel-right', type: 'text', val: panelRight, placeholder: 'Right Panel' })
    const inputPanelTopJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-panel-top', type: 'text', val: panelTop, placeholder: 'Top Panel' })
    const inputPanelBottomJqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-panel-bottom', type: 'text', val: panelBottom, placeholder: 'Bottom Panel' })
    const inputPopup1JqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-popup settings-popup-sortable-input-popup-1', type: 'text', val: popup1, placeholder: 'Popup 1' })
    const inputPopup2JqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-popup settings-popup-sortable-input-popup-2', type: 'text', val: popup2, placeholder: 'Popup 2' })
    const inputPopup3JqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-popup settings-popup-sortable-input-popup-3', type: 'text', val: popup3, placeholder: 'Popup 3' })
    const inputPopup4JqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-popup settings-popup-sortable-input-popup-4', type: 'text', val: popup4, placeholder: 'Popup 4' })
    const inputPopup5JqNode = $('<input>', { 'class': 'settings-popup-sortable-input settings-popup-sortable-input-popup settings-popup-sortable-input-popup-5', type: 'text', val: popup5, placeholder: 'Popup 5' })
    rowJqNode.append(handle, inputNameJqNode, clearfix(), inputMainJqNode, clearfix(), inputPanelLeftJqNode, inputPanelRightJqNode, inputPanelTopJqNode, inputPanelBottomJqNode, clearfix(), inputPopup1JqNode, inputPopup2JqNode, inputPopup3JqNode, inputPopup4JqNode, inputPopup5JqNode, clearfix())
    $(rowJqNode).find('.settings-popup-sortable-input-popup').each((i, popup) => {
      if ($(popup).val() === '') {
        $(popup).fadeOut()
      }
    })
    const addPopupBtnJqNode = $('<button>', { 'class': 'btn btn-add btn-add-popup', value: 'Add popup' }).text('Add popup').on('mousedown', () => {
      let found = false
      $(rowJqNode).find('.settings-popup-sortable-input-popup').each((i, popup) => {
        if (!$(popup).is(':visible') && !found) {
          $(popup).fadeIn()
          found = true
        }
      })
    })
    const removeBtnJqNode = $('<button>', { 'class': 'btn btn-remove', value: 'Remove workspace' }).text('Remove workspace').on('mousedown', async () => {
      rowJqNode.remove()
      this.removeWorkspace(id)
      await this.saveWorkspaces()
      this.reactivate()
    })
    return rowJqNode.append(addPopupBtnJqNode, clearfix(), removeBtnJqNode, clearfix())
  }

}