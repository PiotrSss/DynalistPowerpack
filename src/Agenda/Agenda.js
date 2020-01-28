
import _ from 'lodash'
let keyboardjs = require('keyboardjs')

import { clearfix } from '../templates'

import { SortFunctions } from '../SortFunctions'
import { AgendaQueries } from './AgendaQueries'
import { AgendaViews } from './AgendaViews'
import { AgendaSettings } from './AgendaSettings'

export class Agenda {

  constructor({ googleCalendar, guiManager, settingsManager, dlInterface, dbManager }) {
    this.googleCalendar = googleCalendar
    this.guiManager = guiManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface
    this.dbManager = dbManager

    this.featureName = 'Agenda'
    this.featureTitle = 'Agenda'

    this.sorting = new SortFunctions({ dlInterface: this.dlInterface })
    this.agendaQueries = new AgendaQueries({ googleCalendar: this.googleCalendar, dbManager: this.dbManager, dlInterface: this.dlInterface })
    this.agendaViews = new AgendaViews({ afterViewSaveOrRemove: this.afterViewSaveOrRemove.bind(this), agendaQueries: this.agendaQueries, dbManager: this.dbManager, dlInterface: this.dlInterface })
    this.agendaSettings = new AgendaSettings({ googleCalendar: this.googleCalendar, agendaViews: this.agendaViews, agendaQueries: this.agendaQueries, dbManager: this.dbManager, sorting: this.sorting })

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

    const queriesFragment = await this.agendaSettings.buildQueriesFragment()
    const viewsFragment = await this.agendaSettings.buildViewsFragment()

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, queriesFragment, viewsFragment] })
  }

  activate() {
    this.showAgendaButton()
  }

  deactivate() {
    $('.agenda-icon').remove()
  }

  async restorePanel({ position, featureData }) {
    if (await this.getSetting('status')) {
      const content = await this.agendaViews.renderView({ id: featureData.agendaViewId })
      this.guiManager.openInPanel({ position, content, featureName: this.featureName, featureData })
    }
  }

  async restorePopup({ id, header, size, position, status, featureData }) {
    if (await this.getSetting('status')) {
      if (status === '') {
        status = undefined
      }
      if (!header) {
        header = featureData.agendaViewName
      }
      const content = await this.agendaViews.renderView({ id: featureData.agendaViewId })
      $(content).find('.agenda-view-title').remove()
      this.guiManager.showPopup({ id, content, header, size, position, status, featureName: this.featureName, featureData })
    }
  }

  async openInPanel({ data, position }) {
    if (await this.getSetting('status')) {
      const view = await this.agendaViews.getViewByName({ name: data })
      const content = await this.agendaViews.renderView({ id: view.id })
      this.guiManager.openInPanel({ position, content, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
    }
  }
  async openInPopup({ data }) {
    if (await this.getSetting('status')) {
      const view = await this.agendaViews.getViewByName({ name: data })
      const content = await this.agendaViews.renderView({ id: view.id })
      $(content).find('.agenda-view-title').remove()
      this.guiManager.showPopup({ content, header: `Agenda: ${view.name}`, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
    }
  }

  async showAgendaButton() {
    if ($('.powerpack3-document-tools-icons').length === 0) {
      $('.DocumentTools').append($('<div class="powerpack3-document-tools-icons"></div>'))
    }
    const agendaIcon = $('<i class="far fa-calendar-check agenda-icon"></i>')
    const menu = await this.getAgendaIconMenu()
    this.guiManager.showTooltip({ id: 'agenda-icon-menu', target: agendaIcon[0], content: menu, ttipEvent: 'mousedown', connector: false, position: { my: 'right-top', at: 'left-top' }, mode: 'semisticky' })
    // $('.DocumentTools').append(agendaIcon)
    $('.powerpack3-document-tools-icons').append(agendaIcon)
  }

  async getAgendaIconMenu() {
    const menuWrapper = $('<div>', { 'class': 'agenda-icon-menu' })
    const agendaViews = await this.agendaViews.getViews()
    if (agendaViews.length > 0) {
      await Promise.all(agendaViews.map(async view => {
        const title = $('<div>', { 'class': 'agenda-icon-menu-element-title' }).text(view.name)
        const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>').on('mousedown', async () => {
          const content = await this.agendaViews.renderView({ id: view.id })
          this.guiManager.openInPanel({ position: 'top', content, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
        })
        const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>').on('mousedown', async () => {
          const content = await this.agendaViews.renderView({ id: view.id })
          this.guiManager.openInPanel({ position: 'bottom', content, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
        })
        const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>').on('mousedown', async () => {
          const content = await this.agendaViews.renderView({ id: view.id })
          this.guiManager.openInPanel({ position: 'left', content, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
        })
        const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>').on('mousedown', async () => {
          const content = await this.agendaViews.renderView({ id: view.id })
          this.guiManager.openInPanel({ position: 'right', content, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
        })
        const popupButton = $('<i class="far fa-window-restore"></i>').on('mousedown', async () => {
          const content = await this.agendaViews.renderView({ id: view.id })
          $(content).find('.agenda-view-title').remove()
          this.guiManager.showPopup({ content, header: `Agenda: ${view.name}`, featureName: this.featureName, featureData: { agendaViewName: `Agenda: ${view.name}`, agendaViewId: view.id } })
        })
        const buttons = $('<div>', { 'class': 'agenda-icon-menu-element-buttons' }).append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton, popupButton)
        const wrapper = $('<div>', { 'class': 'agenda-icon-menu-element' }).append(title, buttons, clearfix())
        menuWrapper.append(wrapper)
      }))
    } else {
      menuWrapper.append($('<span>').text('You can add your first Agenda in Powerpack settings.'))
    }
    return menuWrapper[0]
  }

  afterViewSaveOrRemove() {
    this.deactivate()
    this.activate()
  }

}