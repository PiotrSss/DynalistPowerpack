
import { clearfix } from '../templates'

export class WanderMode {

  constructor({ guiManager, settingsManager, dlInterface }) {
    this.guiManager = guiManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.state = 'stop'

    this.featureName = 'WanderMode'
    this.featureTitle = 'Wander Mode'

    this.init()
  }

  async init() {

    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        wait: '5',
        currentDoc: false,
        focus: true,
        hideUI: false,
        zoom: false
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

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment] })
  }

  async activate() {
    if ($('.powerpack3-document-tools-icons').length === 0) {
      $('.DocumentTools').append($('<div class="powerpack3-document-tools-icons"></div>'))
    }
    const wanderModeIcon = $('<i class="fas fa-walking wander-mode-icon"></i>')
    $('.powerpack3-document-tools-icons').append(wanderModeIcon)


    const dashboard = $('<div>', { 'class': 'wander-mode-dashboard' })

    const stopBtn = $('<i class="fas fa-stop-circle"></i>').on('mousedown', async () => {
      clearInterval(this.interval)
      this.state = 'stop'
      this.showUI()
      $('.wander-mode-focus').removeClass('wander-mode-focus')
      stopBtn.hide()
    }).hide()
    const startBtn = $('<i class="fas fa-play-circle"></i>').on('mousedown', async () => {
      this.start()
      stopBtn.show()
    })
    const manualBtn = $('<i class="fas fa-step-forward"></i>').on('mousedown', async () => {
      this.state = 'manual'
      stopBtn.mousedown()
      stopBtn.hide()
      this.goToNext()
    })
    const buttons = $('<div>', { 'class': 'wander-mode-dashboard-buttons' }).append(startBtn, stopBtn, manualBtn)

    const waitWrapper = $('<div>', { 'class': 'wander-mode-dashboard-wait-wrapper' })
    const waitLabel = $('<div>', { 'class': 'wander-mode-dashboard-wait-label' }).text('Next change after ... seconds:')
    const waitDropdown = $(`<select class="wander-mode-dashboard-wait-dropdown"></select>`)
    waitWrapper.append(waitLabel, waitDropdown, clearfix())
    waitDropdown.append($('<option value="3">3</option>'))
    waitDropdown.append($('<option value="4">4</option>'))
    for (let index = 5; index <= 60; index += 5) {
      waitDropdown.append($(`<option value="${index}">${index}</option>`))
    }
    const wait = await this.getSetting('wait')
    waitDropdown.val(wait)
    waitDropdown.on('change', () => {
      this.updateSetting({ name: 'wait', value: waitDropdown.val() })
      if (this.state === 'running') {
        stopBtn.mousedown()
        startBtn.mousedown()
      }
    })

    const currentDoc = await this.getSetting('currentDoc')
    const currentDocCheckbox = $(`<input type="checkbox" id="wander-mode-dashboard-current-doc-checkbox">`)
    if (currentDoc) {
      currentDocCheckbox.prop('checked', true)
    }
    const currentDocLabel = $(`<label for="wander-mode-dashboard-current-doc-checkbox" class="wander-mode-dashboard-current-doc-label">Current document only</label>`).prepend(currentDocCheckbox)
    currentDocCheckbox.on('change', () => {
      this.updateSetting({ name: 'currentDoc', value: currentDocCheckbox.prop('checked') })
    })

    const focus = await this.getSetting('focus')
    const focusCheckbox = $(`<input type="checkbox" id="wander-mode-dashboard-focus-checkbox">`)
    if (focus) {
      focusCheckbox.prop('checked', true)
    }
    const focusLabel = $(`<label for="wander-mode-dashboard-focus-checkbox" class="wander-mode-dashboard-focus-label">Focus on item</label>`).prepend(focusCheckbox)
    focusCheckbox.on('change', () => {
      this.updateSetting({ name: 'focus', value: focusCheckbox.prop('checked') })
      if (focusCheckbox.prop('checked')) {
        if (this.state === 'running') {
          $('.Node-self').addClass('wander-mode-focus')
        }
      } else {
        $('.wander-mode-focus').removeClass('wander-mode-focus')
      }
    })

    const zoom = await this.getSetting('zoom')
    const zoomCheckbox = $(`<input type="checkbox" id="wander-mode-dashboard-zoom-checkbox">`)
    if (zoom) {
      zoomCheckbox.prop('checked', true)
    }
    const zoomLabel = $(`<label for="wander-mode-dashboard-zoom-checkbox" class="wander-mode-dashboard-zoom-label">Zoom to item</label>`).prepend(zoomCheckbox)
    zoomCheckbox.on('change', () => {
      this.updateSetting({ name: 'zoom', value: zoomCheckbox.prop('checked') })
    })

    const hideUI = await this.getSetting('hideUI')
    const hideUICheckbox = $(`<input type="checkbox" id="wander-mode-dashboard-hide-ui-checkbox">`)
    if (hideUI) {
      hideUICheckbox.prop('checked', true)
    }
    const hideUILabel = $(`<label for="wander-mode-dashboard-hide-ui-checkbox" class="wander-mode-dashboard-hide-ui-label">Hide UI</label>`).prepend(hideUICheckbox)
    hideUICheckbox.on('change', () => {
      this.updateSetting({ name: 'hideUI', value: hideUICheckbox.prop('checked') })
      if (hideUICheckbox.prop('checked')) {
        if (this.state === 'running') {
          this.hideUI()
        }
      } else {
        this.showUI()
      }
    })

    dashboard.append(buttons, clearfix(), waitWrapper, clearfix(), currentDocLabel, zoomLabel, focusLabel, hideUILabel)

    wanderModeIcon.on('mousedown', () => {
      this.guiManager.showPopup({
        id: 'wander-mode-dashboard-popup', content: dashboard[0], header: 'Wander Mode', featureName: this.featureName, position: 'right-bottom', size: 'auto', status: '', savePopup: false,
        onBeforeClose: () => {
          stopBtn.mousedown()
        }
      })
    })
  }

  deactivate() {
    this.state = 'stop'
    $('.wander-mode-icon').remove()
    $('#wander-mode-dashboard-popup')[0].close()
    this.showUI()
    $('.wander-mode-focus').removeClass('wander-mode-focus')
  }














  async start() {
    this.state = 'running'
    const wait = await this.getSetting('wait')
    this.interval = setInterval(async () => {
      if (this.state === 'running') {
        await this.goToNext()
      } else {
        clearInterval(this.interval)
      }
    }, (parseInt(wait) * 1000))
  }

  // stop() {
  //   this.state = 'stop'
  // }

  async goToNext() {
    const currentDoc = await this.getSetting('currentDoc')
    const hideUI = await this.getSetting('hideUI')
    const focus = await this.getSetting('focus')
    const zoom = await this.getSetting('zoom')
    if (hideUI) {
      this.hideUI()
    } else {
      this.showUI()
    }
    let document
    if (currentDoc) {
      document = this.dlInterface.getCurrentDocument()
    } else {
      document = this.getRandomDoc()
    }

    while (document.index === -1 || document.title === 'Powerpack Database') {
      document = this.getRandomDoc()
    }

    let node = this.getRandomNode({ document })
    let times = 0
    while (node.index === -1 || this.dlInterface.getContentFromNode(node) === '') {
      if (times >= 100) {
        document = this.getRandomDoc()
        times = 0
      }
      times++
      node = this.getRandomNode({ document })
    }

    DYNALIST.app.userspace.view.switch_document(document)
    let docInterval = setInterval(() => {
      if (this.dlInterface.getCurrentDocument().id === document.id) {
        clearInterval(docInterval)
        if (zoom) {
          DYNALIST.app.userspace.view.url_manager.zoom_node(node)
          setTimeout(() => {
            this.dlInterface.getNodeState(node).dom.$content_el.blur()
          }, 500)
        } else {
          let parentNode = node.parent
          DYNALIST.app.userspace.view.url_manager.zoom_node(document.node_collection.root)
          if (parentNode) {
            while (!this.dlInterface.getNodeState(parentNode).is_current_root()) {
              parentNode.set_collapsed(false)
              parentNode = parentNode.parent
            }
          }
          setTimeout(() => {
            this.dlInterface.setCursorToPositionInNode(node, 0)
            if (focus) {
              $('.Node-self').addClass('wander-mode-focus')
            } else {
              $('.wander-mode-focus').removeClass('wander-mode-focus')
            }
            $(this.dlInterface.getNodeState(node).dom.self_el).removeClass('wander-mode-focus')
          }, 400)
        }
      }
    }, 100)
  }

  getRandomDoc() {
    return DYNALIST.app.app_documents[Object.keys(DYNALIST.app.app_documents)[Math.floor(Math.random() * Object.keys(DYNALIST.app.app_documents).length)]].document
  }

  getRandomNode({ document }) {
    return document.node_collection.nodes[Object.keys(document.node_collection.nodes)[Math.floor(Math.random() * Object.keys(document.node_collection.nodes).length)]]
  }

  showUI() {
    $('.wander-mode-hide-ui').remove()
  }

  hideUI() {
    if ($('.wander-mode-hide-ui').length === 0) {
      let $stylesHideUi = $("<style>", { 'class': "wander-mode-hide-ui", "type": "text/css" })
      $stylesHideUi.append('.AppHeader { opacity: 0; transition: 1s; }')
      $stylesHideUi.append('.AppHeader:hover { opacity: 1; transition: 1s; }')
      $stylesHideUi.append('.powerpack3-panel { opacity: 0; transition: 1s; }')
      $stylesHideUi.append('.powerpack3-panel:hover { opacity: 1; transition: 1s; }')
      $stylesHideUi.append('.LeftPaneSlidebarContainer, .LeftPaneSplitter { opacity: 0; transition: 1s; }')
      $stylesHideUi.append('.LeftPaneSlidebarContainer:hover, .LeftPaneSplitter:hover { opacity: 1; transition: 1s; }')
      $stylesHideUi.append('.DocumentTools-overlay, .DocumentTools-icon { opacity: .1; transition: 1s; }')
      $stylesHideUi.append('.DocumentTools-overlay:hover, .DocumentTools-icon:hover { opacity: 1; transition: 1s; }')
      $('head').append($stylesHideUi)
    }

  }

}