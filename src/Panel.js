
export class Panel {

  constructor({ position, guiManager, panelsManager, featureName, featureData }) {
    this.position = position
    this.guiManager = guiManager
    this.panelsManager = panelsManager
    this.featureName = featureName
    this.featureData = featureData
    this.minimized = false

    // this.defaultSizes = {
    //   top: { width: '100%', height: '20%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' },
    //   bottom: { width: '100%', height: '20%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' },
    //   left: { width: '30%', height: '100%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' },
    //   right: { width: '30%', height: '100%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }
    // }
  }

  async openPanel() {
    this.panel = $('<div>', { 'class': `powerpack3-panel powerpack3-panel-${this.position}` }).css({ background: $('.AppContainer').css('background-color') })
    await this.setSize()
    const content = $('<div>', { 'class': `powerpack3-panel-content powerpack3-panel-${this.position}-content` })
    const dragBar = $('<span>', { 'class': 'dragbar' }).on('mousedown', (e) => {
      this.guiManager.isResizingPanels = true
      this.guiManager.adjustPanelsSizes()
      dragBar.addClass('dragged')
      $('.powerpack3-panel-content').prepend($('<div>', { 'class': 'powerpack3-panel-overlay' }))
      $('.DocumentContainer').prepend($('<div>', { 'class': 'powerpack3-panel-overlay' }))
    })
    const controlButtons = await this.createControlButtons({ panelObj: this, position: this.position })
    this.panel.append(dragBar, controlButtons, content)
    $('.main-container .normal-view').append(this.panel)
    this.content = content
    return this.panel
  }

  // async setContent({ content }) {
  //   if (!this.panel) {
  //     await this.openPanel()
  //   }
  //   this.content.html('').append(content)
  // }
  async setOptions({ content, featureName, featureData }) {
    if (!this.panel) {
      await this.openPanel()
    }
    this.content.html('').append(content)
    this.featureName = featureName
    this.featureData = featureData
    const panelDbObj = await this.panelsManager.getPanel({ position: this.position })
    this.panelsManager.savePanel({ position: this.position, minimized: panelDbObj.minimized, featureName, featureData })
  }

  async setSize() {
    const panelDbObj = await this.panelsManager.getPanel({ position: this.position })
    if (!panelDbObj.minimized) {
      this.panel.css(panelDbObj.css)
    } else {
      this.panel.addClass('minimized')
      switch (this.position) {
        case 'top':
          this.panel.css({ height: '40px' })
          break
        case 'bottom':
          this.panel.css({ height: '40px' })
          break
        case 'right':
          this.panel.css({ width: '40px' })
          break
        case 'left':
          this.panel.css({ width: '40px' })
          break
      }
    }
  }

  async createControlButtons({ panelObj, position }) {
    const moveToLeft = $('<i class="fas fa-chevron-circle-left"><div class="tooltip from-right" data-title="Open in left Panel"></div></i>').on('click', () => {
      panelObj.switchToPanel({ newPosition: 'left' })
    })
    const moveToRight = $('<i class="fas fa-chevron-circle-right"><div class="tooltip from-right" data-title="Open in right Panel"></div></i>').on('click', () => {
      panelObj.switchToPanel({ newPosition: 'right' })
    })
    const moveToTop = $('<i class="fas fa-chevron-circle-up"><div class="tooltip from-right" data-title="Open in top Panel"></div></i>').on('click', () => {
      panelObj.switchToPanel({ newPosition: 'top' })
    })
    const moveToBottom = $('<i class="fas fa-chevron-circle-down"><div class="tooltip from-right" data-title="Open in bottom Panel"></div></i>').on('click', () => {
      panelObj.switchToPanel({ newPosition: 'bottom' })
    })
    const minimize = $('<i class="fas fa-window-minimize"><div class="tooltip from-right" data-title="Minimize Panel"></div></i>').on('click', async () => {
      await panelObj.togglePanel(panelObj)
      this.guiManager.adjustPanelsSizes()
    })
    const openInPopup = $('<i class="far fa-window-restore"><div class="tooltip from-right" data-title="Open in Popup"></div></i>').on('click', () => {
      const feature = DYNALIST.Powerpack3.features.filter(feature => feature.featureName === panelObj.featureName)[0]
      if (feature && feature['restorePopup']) {
        feature.restorePopup({ featureData: panelObj.featureData })
      }
    })
    const close = $('<i class="fas fa-times"><div class="tooltip from-right" data-title="Close Panel"></div></i>').on('click', () => {
      panelObj.closePanel(panelObj)
    })
    const buttons = $('<span>', { 'class': 'control-buttons' }).append(openInPopup, minimize, close)
    if (panelObj.featureName === 'OpenLinkIn' && panelObj.featureData.href.startsWith('https://dynalist.io/d/')) {
      const switchWithCurrentDocument = $('<i class="fas fa-exchange-alt"><div class="tooltip from-right" data-title="Swap with current document"></div></i>').on('click', () => {
        panelObj.switchWithCurrentDocument({ panelObj })
      })
      buttons.prepend(switchWithCurrentDocument)
    }
    switch (position) {
      case 'top':
        buttons.prepend(moveToLeft, moveToRight, moveToBottom)
        break
      case 'bottom':
        buttons.prepend(moveToLeft, moveToRight, moveToTop)
        break
      case 'left':
        buttons.prepend(moveToRight, moveToTop, moveToBottom)
        break
      case 'right':
        buttons.prepend(moveToLeft, moveToTop, moveToBottom)
        break
    }
    return buttons
  }

  getPanel() {
    return this.panel
  }

  async togglePanel(panelObj) {
    const panelDbObj = await this.panelsManager.getPanel({ position: panelObj.position })
    switch (panelObj.position) {
      case 'top':
        if (panelObj.minimized) {
          panelObj.panel.css({ height: panelDbObj.css.height })
          panelObj.panel.removeClass('minimized')
          // panelDbObj.css.height = '20%'
        } else {
          panelObj.panel.css({ height: '40' })
          panelObj.panel.addClass('minimized')
          // panelDbObj.css.height = '40px'
        }
        break
      case 'bottom':
        if (panelObj.minimized) {
          panelObj.panel.css({ height: panelDbObj.css.height })
          panelObj.panel.removeClass('minimized')
          // panelDbObj.css.height = '20%'
        } else {
          panelObj.panel.css({ height: '40' })
          panelObj.panel.addClass('minimized')
          // panelDbObj.css.height = '40px'
        }
        break
      case 'left':
        if (panelObj.minimized) {
          panelObj.panel.css({ width: panelDbObj.css.width })
          panelObj.panel.removeClass('minimized')
          // panelDbObj.css.width = '30%'
        } else {
          panelObj.panel.css({ width: '40' })
          panelObj.panel.addClass('minimized')
          // panelDbObj.css.width = '40px'
        }
        break
      case 'right':
        if (panelObj.minimized) {
          panelObj.panel.css({ width: panelDbObj.css.width })
          panelObj.panel.removeClass('minimized')
          // panelDbObj.css.width = '30%'
        } else {
          panelObj.panel.css({ width: '40' })
          panelObj.panel.addClass('minimized')
          // panelDbObj.css.width = '40px'
        }
        break
    }
    panelObj.minimized = !panelObj.minimized
    this.panelsManager.updatePanelOption({ position: panelObj.position, option: 'minimized', value: panelObj.minimized })
    // this.panelsManager.updatePanelOption({ position: panelObj.position, option: 'css', value: panelDbObj.css })
  }

  closePanel(panelObj) {
    panelObj.panel.remove()
    this.guiManager.removePanel({ position: panelObj.position })
    this.guiManager.adjustPanelsSizes()
    this.panelsManager.updatePanelOption({ position: panelObj.position, option: 'active', value: false })
  }

  async refreshPanelUI({ panelObj, oldPosition, newPosition }) {
    const panelDbObj = await this.panelsManager.getPanel({ position: newPosition })
    $(panelObj.panel).removeClass(`powerpack3-panel-${oldPosition}`).removeClass('minimized').addClass(`powerpack3-panel-${newPosition}`).css(panelDbObj.css)
    $(panelObj.panel).find('.powerpack3-panel-content').removeClass(`powerpack3-panel-${oldPosition}-content`).addClass(`powerpack3-panel-${newPosition}-content`)
    $(panelObj.panel).find('.control-buttons').remove()
    $(panelObj.panel).prepend(await this.createControlButtons({ panelObj, position: newPosition }))
  }

  async switchToPanel({ newPosition }) {
    if (!this.guiManager.panels.hasOwnProperty(newPosition)) {
      await this.refreshPanelUI({ panelObj: this, oldPosition: this.position, newPosition })
      this.guiManager.panels[newPosition] = this
      this.guiManager.removePanel({ position: this.position })
      this.guiManager.adjustPanelsSizes()
      this.panelsManager.updatePanelOption({ position: this.position, option: 'active', value: false })
      this.position = newPosition
      this.panelsManager.savePanel({ position: this.position, minimized: this.minimized, featureName: this.featureName, featureData: this.featureData })
    } else {
      const panelToSwap = this.guiManager.panels[newPosition]
      await this.refreshPanelUI({ panelObj: panelToSwap, oldPosition: newPosition, newPosition: this.position })
      this.guiManager.panels[this.position] = panelToSwap
      panelToSwap.position = this.position
      await this.refreshPanelUI({ panelObj: this, oldPosition: this.position, newPosition })
      this.guiManager.panels[newPosition] = this
      this.position = newPosition
      this.guiManager.adjustPanelsSizes()
      this.panelsManager.savePanel({ position: panelToSwap.position, minimized: panelToSwap.minimized, featureName: panelToSwap.featureName, featureData: panelToSwap.featureData })
      this.panelsManager.savePanel({ position: this.position, minimized: this.minimized, featureName: this.featureName, featureData: this.featureData })
    }
  }

  switchWithCurrentDocument({ panelObj }) {
    const currentDocUrl = encodeURI(window.location.href)
    // const iframeDocUrl = panelObj.featureData.href
    const iframeDocUrl = panelObj.content.children('iframe')[0].contentWindow.location.href
    panelObj.featureData.href = currentDocUrl
    this.panelsManager.savePanel({ position: panelObj.position, minimized: panelObj.minimized, featureName: this.featureName, featureData: { href: currentDocUrl } })
    this.guiManager.features.filter(feature => feature.featureName === this.featureName)[0].restorePanel({ position: panelObj.position, featureData: { href: currentDocUrl } })
    DYNALIST.app.userspace.view.get_url_manager().parse_url_and_apply_state(iframeDocUrl)
  }

}