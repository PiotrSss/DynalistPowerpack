import { iframeTemplate } from '../templates'
import { createEmbeddableUrl, onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class OpenLinkIn {

  constructor({ guiManager, settingsManager, dlInterface }) {
    this.guiManager = guiManager
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'OpenLinkIn'
    this.featureTitle = 'Open link in popup/panel'

    this.status = false
    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        settingsVisible: false,
        popupPosition: 'center',
        popupSize: '50% 50%',
        leftPanelWidth: '30%',
        rightPanelWidth: '30%',
        topPanelHeight: '20%',
        bottomPanelHeight: '20%',
        openExternalLinks: true,
        openInternalLinks: true,
        openTags: false,
        openNodes: true,
        openDocs: true,
        openBookmarks: true,
        openTagsInTagsPane: true
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

    const checkboxesFragment = await this.settingsManager.buildCheckboxesSubsectionPopupElement({
      featureName: this.featureName, label: 'Available for:', checkboxes: [
        { settingName: 'openExternalLinks', label: 'external links', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openInternalLinks', label: 'internal links', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openTags', label: 'tags', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openNodes', label: 'nodes', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openDocs', label: 'documents in files pane', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openBookmarks', label: 'bookmarks in bookmarks pane', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
        { settingName: 'openTagsInTagsPane', label: 'tags in tags pane', callbackOn: () => this.reactivate(), callbackOff: () => this.reactivate() },
      ]
    })

    const popupPositionFragment = await this.settingsManager.buildSelectPopupElement({
      featureName: this.featureName, settingName: 'popupPosition', label: 'Default popup position', selected: await this.getSetting('popupPosition'), values: { 'left-top': 'left-top', 'left-center': 'left-center', 'left-bottom': 'left-bottom', 'center-top': 'center-top', center: 'center', 'center-bottom': 'center-bottom', 'right-top': 'right-top', 'right-center': 'right-center', 'right-bottom': 'right-bottom' }
    })

    const popupSizeFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'popupSize', label: 'Default popup size'
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, checkboxesFragment, popupPositionFragment, popupSizeFragment] })
  }

  async restorePanel({ position, featureData }) {
    if (await this.getSetting('status')) {
      this.guiManager.openInPanel({ position, content: iframeTemplate(createEmbeddableUrl(featureData.href)), featureName: this.featureName, featureData })
    }
  }

  async restorePopup({ id, header, size, position, status, featureData }) {
    if (await this.getSetting('status')) {
      if (status === '') {
        status = undefined
      }
      if (!header) {
        header = featureData.href
      }
      this.guiManager.showPopup({ id, content: iframeTemplate(createEmbeddableUrl(featureData.href)), header, size, position, status, featureName: this.featureName, featureData })
    }
  }

  async openInPanel({ data, position }) {
    if (await this.getSetting('status')) {
      this.guiManager.openInPanel({ position, content: iframeTemplate(createEmbeddableUrl(data)), featureName: this.featureName, featureData: { href: data } })
    }
  }
  async openInPopup({ data }) {
    if (await this.getSetting('status')) {
      this.guiManager.showPopup({ content: iframeTemplate(createEmbeddableUrl(data)), header: data, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href: data } })
    }
  }

  async activate() {
    this.status = true
    this.openTags = await this.getSetting('openTags')
    this.renderIconsInAllNodes()

    if (await this.getSetting('openNodes')) {
      const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>')
      const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>')
      const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>')
      const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>')
      const btnContent = $('<span>Open in panel: </span>').append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton)
      this.guiManager.addMenuItemToContextMenu({
        type: 'node', name: 'Open in popup', icon: '<i class="far fa-window-restore"></i>', classNames: 'powerpack3-open-link-in-popup', callback: async () => {
          let title = this.dlInterface.getContentFromNode(DYNALIST.app.app_document.ui.get_context_menu_node())
          const href = 'https://dynalist.io/d/' + this.dlInterface.getCurrentDocumentServerId() + '#z=' + DYNALIST.app.app_document.ui.get_context_menu_node().id
          const iframe = iframeTemplate(href)
          this.guiManager.showPopup({ content: iframe, header: title, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
        }
      })
      this.guiManager.addMenuItemToContextMenu({
        type: 'node', name: btnContent, classNames: 'powerpack3-open-link-in-panel', callback: async (e) => {
          const href = 'https://dynalist.io/d/' + this.dlInterface.getCurrentDocumentServerId() + '#z=' + DYNALIST.app.app_document.ui.get_context_menu_node().id
          const iframe = iframeTemplate(href)
          const clickedElement = $(e.target)
          if (clickedElement.is(rightPanelButton)) { this.guiManager.openInPanel({ position: 'right', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(leftPanelButton)) { this.guiManager.openInPanel({ position: 'left', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(topPanelButton)) { this.guiManager.openInPanel({ position: 'top', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(bottomPanelButton)) { this.guiManager.openInPanel({ position: 'bottom', content: iframe, featureName: this.featureName, featureData: { href } }) }
        }
      })
    }
    if (await this.getSetting('openDocs')) {
      this.guiManager.addMenuItemToContextMenu({
        type: 'document', name: 'Open in popup', icon: '<i class="far fa-window-restore"></i>', classNames: 'powerpack3-open-link-in-popup', callback: async () => {
          const title = DYNALIST.app.userspace.view.get_current_file().title
          const href = this.dlInterface.createAbsoluteUrlFromState({ document_server_id: DYNALIST.app.userspace.view.get_current_file().get_server_id() })
          const iframe = iframeTemplate(href)
          this.guiManager.showPopup({ content: iframe, header: title, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
        }
      })
      const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>')
      const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>')
      const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>')
      const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>')
      const btnContent = $('<span>Open in panel: </span>').append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton)
      this.guiManager.addMenuItemToContextMenu({
        type: 'document', name: btnContent, classNames: 'powerpack3-open-link-in-panel', callback: async (e) => {
          const href = this.dlInterface.createAbsoluteUrlFromState({ document_server_id: DYNALIST.app.userspace.view.get_current_file().get_server_id() })
          const iframe = iframeTemplate(href)
          const clickedElement = $(e.target)
          if (clickedElement.is(rightPanelButton)) { this.guiManager.openInPanel({ position: 'right', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(leftPanelButton)) { this.guiManager.openInPanel({ position: 'left', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(topPanelButton)) { this.guiManager.openInPanel({ position: 'top', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(bottomPanelButton)) { this.guiManager.openInPanel({ position: 'bottom', content: iframe, featureName: this.featureName, featureData: { href } }) }
        }
      })
    }
    if (await this.getSetting('openBookmarks')) {
      this.guiManager.addMenuItemToContextMenu({
        type: 'bookmark', name: 'Open in popup', icon: '<i class="far fa-window-restore"></i>', classNames: 'powerpack3-open-link-in-popup', callback: async () => {
          const title = DYNALIST.app.userspace.view.get_current_file().get_data_object().get_title()
          const href = this.dlInterface.createAbsoluteUrlFromState(DYNALIST.app.userspace.view.get_current_file().get_data_object().convert_to_url_state())
          const iframe = iframeTemplate(href)
          this.guiManager.showPopup({ content: iframe, header: title, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
        }
      })
      const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>')
      const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>')
      const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>')
      const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>')
      const btnContent = $('<span>Open in panel: </span>').append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton)
      this.guiManager.addMenuItemToContextMenu({
        type: 'bookmark', name: btnContent, classNames: 'powerpack3-open-link-in-panel', callback: async (e) => {
          const href = this.dlInterface.createAbsoluteUrlFromState(DYNALIST.app.userspace.view.get_current_file().get_data_object().convert_to_url_state())
          const iframe = iframeTemplate(href)
          const clickedElement = $(e.target)
          if (clickedElement.is(rightPanelButton)) { this.guiManager.openInPanel({ position: 'right', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(leftPanelButton)) { this.guiManager.openInPanel({ position: 'left', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(topPanelButton)) { this.guiManager.openInPanel({ position: 'top', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(bottomPanelButton)) { this.guiManager.openInPanel({ position: 'bottom', content: iframe, featureName: this.featureName, featureData: { href } }) }
        }
      })
    }
    if (await this.getSetting('openTagsInTagsPane')) {
      this.guiManager.addMenuItemToContextMenu({
        type: 'tag', name: 'Open in popup', icon: '<i class="far fa-window-restore"></i>', classNames: 'powerpack3-open-link-in-popup', callback: async () => {
          const title = $(DYNALIST.app.userspace.view.tag_pane_manager.context_menu_tag_el).find('.tag-instance-text').text()
          const href = window.location.href + '#q=' + encodeURIComponent(title)
          const iframe = iframeTemplate(href)
          this.guiManager.showPopup({ content: iframe, header: title, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
        }
      })
      const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>')
      const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>')
      const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>')
      const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>')
      const btnContent = $('<span>Open in panel: </span>').append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton)
      this.guiManager.addMenuItemToContextMenu({
        type: 'tag', name: btnContent, classNames: 'powerpack3-open-link-in-panel', callback: async (e) => {
          const title = $(DYNALIST.app.userspace.view.tag_pane_manager.context_menu_tag_el).find('.tag-instance-text').text()
          const href = window.location.href + '#q=' + encodeURIComponent(title)
          const iframe = iframeTemplate(href)
          const clickedElement = $(e.target)
          if (clickedElement.is(rightPanelButton)) { this.guiManager.openInPanel({ position: 'right', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(leftPanelButton)) { this.guiManager.openInPanel({ position: 'left', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(topPanelButton)) { this.guiManager.openInPanel({ position: 'top', content: iframe, featureName: this.featureName, featureData: { href } }) }
          else if (clickedElement.is(bottomPanelButton)) { this.guiManager.openInPanel({ position: 'bottom', content: iframe, featureName: this.featureName, featureData: { href } }) }
        }
      })
    }
  }

  deactivate() {
    this.status = false
    $('.powerpack3-open-link-in-popup').remove()
    $('.powerpack3-open-link-in-panel').remove()
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderIconsInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderIconsInAllNodes()
    }
  }

  onNodeBlur(node) {
    if (this.status) {
      if (this.openTags && (this.dlInterface.hasNodeUrlInContent(node) || this.dlInterface.hasNodeTagInContent(node))) {
        this.renderIconsInNode(node)
      } else if (this.dlInterface.hasNodeUrlInContent(node)) {
        this.renderIconsInNode(node)
      }
    }
  }

  onNoteBlur(node) {
    if (this.status) {
      if (this.openTags && (this.dlInterface.hasNodeUrlInNote(node) || this.dlInterface.hasNodeTagInNote(node))) {
        this.renderIconsInNote(node)
      } else if (this.dlInterface.hasNodeUrlInNote(node)) {
        this.renderIconsInNote(node)
      }
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderIconsInAllNodes(node)
    }
  }

  onExitDocumentSearch() {
    if (this.status) {
      this.reactivate()
    }
  }

  renderIconsInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.openTags && (this.dlInterface.hasNodeUrlInContent(node) || this.dlInterface.hasNodeTagInContent(node))) {
        this.renderIconsInNode(node)
      } else if (this.dlInterface.hasNodeUrlInContent(node)) {
        this.renderIconsInNode(node)
      }
      if (this.openTags && (this.dlInterface.hasNodeUrlInNote(node) || this.dlInterface.hasNodeTagInNote(node))) {
        this.renderIconsInNote(node)
      } else if (this.dlInterface.hasNodeUrlInNote(node)) {
        this.renderIconsInNote(node)
      }
    })
  }

  async renderIcons(anchorTag) {
    const href = $(anchorTag).attr('href')
    if (href.includes('https://dynalist.io/') && await this.getSetting('openInternalLinks')) {
      const text = $(anchorTag).text()
      const popupLink = this.renderIcon({ popupHeader: text, href, anchorTag })
      $(anchorTag).after(popupLink)
    } else if (!href.includes('https://dynalist.io/') && href.includes('https') && await this.getSetting('openExternalLinks')) {
      const text = $(anchorTag).text()
      const popupLink = this.renderIcon({ popupHeader: text, href, anchorTag })
      $(anchorTag).after(popupLink)
    } else if ($(anchorTag).hasClass('node-tag') && this.openTags) {
      const text = $(anchorTag).text()
      const popupLink = this.renderIcon({ popupHeader: text, href: `${window.location.href}#q=${encodeURIComponent(text)}`, anchorTag })
      $(anchorTag).after(popupLink)
    }
  }

  renderIconsInNode(node) {
    onNodeStateInitialized({
      node, callback: () => {
        let nodeRenderedContentEl = this.dlInterface.getNodeState(node).dom.rendered_content_el
        setTimeout(() => {
          _.each($(nodeRenderedContentEl).find('a.node-tag:visible, a.node-link'), async (value, key) => {
            if (!$(value).next().hasClass('powerpack3-open-link-in-popup')) {
              this.renderIcons(value)
            }
          })
        }, 200)
      }
    })
  }

  renderIconsInNote(node) {
    onNodeStateInitialized({
      node, callback: () => {
        let nodeRenderedNoteEl = this.dlInterface.getNodeState(node).dom.rendered_note_el
        setTimeout(() => {
          _.each($(nodeRenderedNoteEl).find('a.node-tag:visible, a.node-link'), async (value, key) => {
            if (!$(value).next().hasClass('powerpack3-open-link-in-popup')) {
              this.renderIcons(value)
            }
          })
        }, 200)
      }
    })
  }

  renderIcon({ popupHeader, href, anchorTag }) {
    const iframe = iframeTemplate(createEmbeddableUrl(href))
    const popupLink = $(`<a href="${href}" class="powerpack3-open-link-in-popup"><i class="far fa-window-restore"></i></a>`)
    popupLink.on('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
    }).on('mousedown', async (e) => {
      switch (e.which) {
        case 1:
          this.guiManager.showPopup({ content: iframe, header: popupHeader, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
          break
        case 3:
          let menuContainer = $('.AppContainer > .powerpack3-tooltip-menu-open-in')
          if (menuContainer.length === 0) {
            menuContainer = $('<ul>', { 'class': 'powerpack3-tooltip-menu-open-in' })
            $('.AppContainer').append(menuContainer)
          }
          let menuPopupButton = menuContainer.children('.powerpack3-tooltip-menu-open-in-popup')
          if (menuPopupButton.length === 0) {
            menuPopupButton = $('<li>', { 'class': 'powerpack3-tooltip-menu-open-in-popup' })
            menuPopupButton.html('<i class="far fa-window-restore"></i><span> Open in popup</span>')
            menuContainer.append(menuPopupButton)
          }
          let menuPanelButton = menuContainer.children('.powerpack3-tooltip-menu-open-in-panel')
          if (menuPanelButton.length === 0) {
            const topPanelButton = $('<i class="fas fa-chevron-circle-up"></i>')
            const bottomPanelButton = $('<i class="fas fa-chevron-circle-down"></i>')
            const leftPanelButton = $('<i class="fas fa-chevron-circle-left"></i>')
            const rightPanelButton = $('<i class="fas fa-chevron-circle-right"></i>')
            menuPanelButton = $('<li>', { 'class': 'powerpack3-tooltip-menu-open-in-panel' })
            menuPanelButton.html('<span> Open in panel: </span>')
            menuPanelButton.append(topPanelButton, bottomPanelButton, leftPanelButton, rightPanelButton)
            menuContainer.append(menuPanelButton)
          }
          const currentMenuContainer = menuContainer.clone(true)
          const tooltipId = 'powerpack3-tooltip'
          currentMenuContainer.children('.powerpack3-tooltip-menu-open-in-popup').on('mousedown', async () => {
            this.guiManager.showPopup({ content: iframe, header: popupHeader, size: await this.getSetting('popupSize'), position: await this.getSetting('popupPosition'), featureName: this.featureName, featureData: { href } })
          })
          currentMenuContainer.find('.fa-chevron-circle-up').on('mousedown', () => {
            this.guiManager.openInPanel({ position: 'top', content: iframe, featureName: this.featureName, featureData: { href } })
          })
          currentMenuContainer.find('.fa-chevron-circle-down').on('mousedown', () => {
            this.guiManager.openInPanel({ position: 'bottom', content: iframe, featureName: this.featureName, featureData: { href } })
          })
          currentMenuContainer.find('.fa-chevron-circle-left').on('mousedown', () => {
            this.guiManager.openInPanel({ position: 'left', content: iframe, featureName: this.featureName, featureData: { href } })
          })
          currentMenuContainer.find('.fa-chevron-circle-right').on('mousedown', () => {
            this.guiManager.openInPanel({ position: 'right', content: iframe, featureName: this.featureName, featureData: { href } })
          })
          this.guiManager.showTooltip({ id: tooltipId, target: popupLink[0], content: currentMenuContainer[0], mode: 'semisticky' })
          break
      }
      e.preventDefault()
      e.stopImmediatePropagation()
    }).on('contextmenu', () => {
      return false
    })
    return popupLink
  }

}