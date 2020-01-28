import { GuiManager } from './GuiManager'
import { DynalistInterface } from './DynalistInterface'
import { DatabaseManager } from './DatabaseManager'
import { SettingsManager } from './SettingsManager'
import { PanelsManager } from './PanelsManager'
import { PopupsManager } from './PopupsManager'
import { GoogleCalendar } from './GoogleCalendar'
import { AttributesManager } from './AttributesManager'

import { isIframe } from './helpers'

import { HideDatabase } from './HideDatabase/HideDatabase'
import { SearchResultsExpand } from './SearchResultsExpand/SearchResultsExpand'
// import { Backlinks } from './Backlinks/Backlinks'
import { CopyLinkToZoomIntoClipboard } from './CopyLinkToZoomIntoClipboard/CopyLinkToZoomIntoClipboard'
import { WanderMode } from './WanderMode/WanderMode'
import { OpenLinkIn } from './OpenLinkIn/OpenLinkIn'
import { SpacedRepetition } from './SpacedRepetition/SpacedRepetition'
import { GoogleCalendarIntegration } from './GoogleCalendarIntegration/GoogleCalendarIntegration'
import { Agenda } from './Agenda/Agenda'
import { Workspaces } from './Workspaces/Workspaces'
import { AudioPlayers } from './AudioPlayers/AudioPlayers'
import { AddRemoveBookmark } from './AddRemoveBookmark/AddRemoveBookmark'
import { AttachBookmarksToDocuments } from './AttachBookmarksToDocuments/AttachBookmarksToDocuments'
import { CodeHighlighting } from './CodeHighlighting/CodeHighlighting'
import { FocusMode } from './FocusMode/FocusMode'
import { IFrameEmbedding } from './IFrameEmbedding/IFrameEmbedding'
import { ItemsStyling } from './ItemsStyling/ItemsStyling'
import { OmniPanel } from './OmniPanel/OmniPanel'
import { PaneIconsAsLinks } from './PaneIconsAsLinks/PaneIconsAsLinks'
import { Separators } from './Separators/Separators'
import { ShowXFirstOrLastChildren } from './ShowXFirstOrLastChildren/ShowXFirstOrLastChildren'
import { TextHighlighting } from './TextHighlighting/TextHighlighting'
import { TagsStyling } from './TagsStyling/TagsStyling'
import { Sorting } from './Sorting/Sorting'
import { CustomCSS } from './CustomCSS/CustomCSS'

let css = require('./style.css').toString()
let cssDefault = require('./style-default.css').toString()
let cssDark = require('./style-dark.css').toString()
let cssPopup = require('../node_modules/jspanel4/es6module/jspanel.min.css').toString()

let uiLoadInterval = setInterval(() => {
  if (typeof DYNALIST === "object" && DYNALIST.app.userspace.view.initialized) {
    DYNALIST.Powerpack3 = new Powerpack3()
    clearInterval(uiLoadInterval)
  }
}, 100)

export class Powerpack3 {

  constructor() {
    this.init()
  }

  async init() {
    this.version = '3.3.1'
    this.features = []
    this.dlInterface = new DynalistInterface(this.features)
    this.dbManager = new DatabaseManager({ dbName: 'Powerpack Database', dlInterface: this.dlInterface })
    await this.dbManager.prepareDynalistDatabaseDocument()

    this.panelsManager = new PanelsManager({ dbManager: this.dbManager })
    await this.panelsManager.initDatabaseCollection()
    this.popupsManager = new PopupsManager({ dbManager: this.dbManager })
    await this.popupsManager.initDatabaseCollection()

    this.guiManager = new GuiManager({ dlInterface: this.dlInterface, dbManager: this.dbManager, panelsManager: this.panelsManager, popupsManager: this.popupsManager, features: this.features })
    this.dlInterface.setGuiManager(this.guiManager)

    this.settingsManager = new SettingsManager({ dbManager: this.dbManager, dlInterface: this.dlInterface })
    await this.settingsManager.initSettingsDatabase()

    this.attributesManager = new AttributesManager({ dbManager: this.dbManager, dlInterface: this.dlInterface, guiManager: this.guiManager })
    await this.attributesManager.initAttributesDatabase()
    this.dlInterface.setAttributesManager(this.attributesManager)

    if (DYNALIST.PLATFORM === 'web') {
      this.googleCalendar = new GoogleCalendar()
    }

    this.features.push(new HideDatabase({ settingsManager: this.settingsManager, dbName: this.dbManager.dbName }))
    this.features.push(new SearchResultsExpand())
    // this.features.push(new Backlinks({ dlInterface: this.dlInterface }))
    this.features.push(new CopyLinkToZoomIntoClipboard({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    if (!isIframe()) {
      this.features.push(new SpacedRepetition({ attributesManager: this.attributesManager, settingsManager: this.settingsManager, dbManager: this.dbManager, dlInterface: this.dlInterface, guiManager: this.guiManager }))
      this.features.push(new OpenLinkIn({ guiManager: this.guiManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
      if (DYNALIST.PLATFORM === 'web') {
        this.features.push(new GoogleCalendarIntegration({ googleCalendar: this.googleCalendar, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
      }
      this.features.push(new Agenda({ googleCalendar: this.googleCalendar, guiManager: this.guiManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface, dbManager: this.dbManager }))
      this.features.push(new Workspaces({ guiManager: this.guiManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface, dbManager: this.dbManager }))
    }
    this.features.push(new AudioPlayers({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new WanderMode({ guiManager: this.guiManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new AddRemoveBookmark({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    if (!isIframe()) {
      this.features.push(new AttachBookmarksToDocuments({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    }
    this.features.push(new CodeHighlighting({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    if (!isIframe()) {
      this.features.push(new FocusMode({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    }
    this.features.push(new IFrameEmbedding({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new ItemsStyling({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    if (!isIframe()) {
      this.features.push(new OmniPanel({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
      this.features.push(new PaneIconsAsLinks({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    }
    this.features.push(new Separators({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new ShowXFirstOrLastChildren({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new TextHighlighting({ settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new TagsStyling({ dbManager: this.dbManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new Sorting({ guiManager: this.guiManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))
    this.features.push(new CustomCSS({ dbManager: this.dbManager, settingsManager: this.settingsManager, dlInterface: this.dlInterface }))


    if (!isIframe()) {
      this.panelsManager.restorePanels({ features: this.features })
      this.popupsManager.restorePopups({ features: this.features })
    }

    this.appendPowerpackStyles()
    this.guiManager.addMenuItemToContextMenu({
      type: 'main-menu', name: 'Open Powerpack settings', icon: '<i class="fas fa-bolt"></i>', callback: async () => {
        const scope = {
          name: 'powerpack3-settings',
          get_name: () => {
            return 'powerpack3-settings'
          },
          on_pop: () => { },
          on_push: () => { }
        }
        this.guiManager.showPopup({
          header: 'Powerpack 3 Settings (v' + this.version + ')', size: '800px 90%', content: await this.settingsManager.getSettingsPopupContent(this.features), id: 'settings', savePopup: false,
          callback: () => { DYNALIST.app.scope.push_scope(scope) }, onClose: () => { DYNALIST.app.scope.pop_scope(scope) }
        })
      }
    })
    this.dlInterface.documentRendered(this.features)
    this.dlInterface.loadEvents()
    this.dlInterface.domEvents()
    this.dlInterface.updateDynalistFunctionsOnStart(this.features)
    this.dlInterface.updateDynalistFunctions(this.features)
    for (let feature of this.features) {
      if (feature['onDocumentFullyRendered']) {
        feature.onDocumentFullyRendered()
      }
      if (feature['updateKeyboardBindings']) {
        feature.updateKeyboardBindings()
      }
    }

  }

  appendPowerpackStyles() {
    $('head').append('<link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.0.13/css/all.css" integrity="sha384-DNOHZ68U8hZfKXOrtjWvjxusGo9WQnrNx2sqG0tfsghAvtVlRW3tvkXWZh58N9jp" crossorigin="anonymous">')
    $('head').append($("<style>", { id: "dynalist-powerpack3-popup", "type": "text/css" }).append(cssPopup))

    if (isIframe()) {
      $('head').append($('<style>.DocumentTools{margin-top: 50px;}.powerpack3-panel {display:none} .LeftPaneSlidebarContainer, .LeftPaneSplitter, .MobileHeader-mainMenuIcon {display:none !important;} .is-desktop .AppHeader {display: none!important} .is-mobile .AppHeader {display: block!important} .DocumentContainer {z-index: 98!important; width: 100% !important; height: 100%!important; top: 0 !important; left: 0!important; padding: 0 30px !important} .is-mobile .DocumentContainer {height: calc(100% - 46px)!important} .is-mobile .Node.is-currentRoot {padding: 0;} .Document {margin: 0 !important; width: 100% !important;}.Document-rootNode {padding: 0 !important;}.main-container{height:100%!important}.Document-bottomSpace{display:none} .DocumentBreadcrumb {margin: 0;min-height: 0;padding: 20px 0 0 0px;}</style>'))
    }

    this.themeChanged(this.dlInterface.getTheme())
  }

  themeChanged(theme) {
    $('.dynalist-powerpack3-styles').remove()
    $('head').append($("<style>", { 'class': "dynalist-powerpack3-styles dynalist-powerpack3", "type": "text/css" }).append(css))
    if (theme === 'default') {
      $('head').append($("<style>", { 'class': "dynalist-powerpack3-styles dynalist-powerpack3-default", "type": "text/css" }).append(cssDefault))
    } else if (theme === 'dark') {
      $('head').append($("<style>", { 'class': "dynalist-powerpack3-styles dynalist-powerpack3-dark", "type": "text/css" }).append(cssDark))
    }
  }

}