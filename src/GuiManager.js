import _ from 'lodash'
import { jsPanel } from 'jspanel4'
import '../node_modules/jspanel4/es6module/extensions/tooltip/jspanel.tooltip.min.js'

import { generateId, isIframe } from './helpers'
import { Panel } from './Panel'

export class GuiManager {

  constructor({ dlInterface, dbManager, panelsManager, popupsManager, features }) {
    this.dlInterface = dlInterface
    this.dbManager = dbManager
    this.panelsManager = panelsManager
    this.popupsManager = popupsManager
    this.features = features
    this.panels = {}
  }

  showPopup({
    id = 'powerpack3-popup-' + Math.floor(Math.random() * 10000),
    hasHeader = true,
    header = '',
    position = 'center',
    size = '450 250',
    content = '',
    callback,
    featureName,
    featureData,
    status = '',
    onClose,
    onBeforeClose,
    savePopup = true
  } = {}) {
    const popupsManager = this.popupsManager
    return jsPanel.create({
      id,
      theme: 'default',
      header: hasHeader,
      headerTitle: header,
      position: position,
      panelSize: size,
      content: content,
      iconfont: 'fas',
      closeOnEscape: false,
      setStatus: status,
      resizeit: {
        stop: function () {
          if (savePopup) {
            popupsManager.updatePopupOption({ id: this.id, option: 'position', value: `left-top ${$(this).css('left')} ${$(this).css('top')}` })
            popupsManager.updatePopupOption({ id: this.id, option: 'size', value: { width: $(this).outerWidth(), height: $(this).outerHeight() } })
          }
        }
      },
      dragit: {
        stop: function (panel, position) {
          if (savePopup) {
            popupsManager.updatePopupOption({ id: this.id, option: 'position', value: `left-top ${$(this).css('left')} ${$(this).css('top')}` })
          }
        }
      },
      callback: function () {
        if (status !== 'minimized' && savePopup) {
          popupsManager.savePopup({ id: $(this).attr('id'), header: $(this).find('.jsPanel-title').html(), size: { width: $(this).outerWidth(), height: $(this).outerHeight() }, position: `left-top ${$(this).css('left')} ${$(this).css('top')}`, status: '', featureName, featureData })
        }
        if (callback) { callback() }
      },
      onclosed: function () {
        if (savePopup) {
          popupsManager.removePopup({ id: this.id })
        }
        if (onClose) { onClose() }
      },
      onbeforeclose: function () {
        if (onBeforeClose) { onBeforeClose() }
        return true
      },
      onminimized: function () {
        if (savePopup) {
          popupsManager.updatePopupOption({ id: this.id, option: 'status', value: 'minimized' })
        }
      },
      onnormalized: function () {
        if (savePopup) {
          popupsManager.updatePopupOption({ id: this.id, option: 'status', value: '' })
          popupsManager.updatePopupOption({ id: this.id, option: 'position', value: `left-top ${$(this).css('left')} ${$(this).css('top')}` })
        }
      },
      animateIn: 'jsPanelFadeIn',
    })
  }

  showTooltip({ id = generateId(), target, content = '', hasHeader = false, position = { my: 'center-top', at: 'center-bottom' }, mode = 'sticky', connector = '#fffcf3fffcf3', ttipEvent = 'contextmenu' }) {
    jsPanel.tooltip.create({
      id,
      content,
      target,
      mode,
      ttipEvent,
      connector,
      delay: 0,
      position,
      contentSize: 'auto',
      theme: '#fffcf3',
      border: false,
      header: hasHeader,
      headerControls: 'closeonly',
      closeOnEscape: true,
    })
  }

  addMenuItemToContextMenu({ type, name, icon = null, classNames = '', position = 'top', callback }) {
    const menuName = $('<span>', { 'class': 'MenuItem-name' }).html(name)
    const menuItem = $('<li>', { 'class': 'MenuItem MenuItem--noIcon' }).on('click', (e) => {
      callback(e)
      this.dlInterface.closeContextMenu()
      e.stopImmediatePropagation()
    }).append(menuName)
    const menuGroup = $('<ul>', { 'class': `MenuGroup powerpack3-context-menu-group ${classNames}` }).append(menuItem)
    if (icon) {
      menuItem.removeClass('MenuItem--noIcon')
      menuItem.prepend(icon)
    }
    switch (type) {
      case 'document':
        this.attachMenuGroupToContextMenu({ menuGroup, contextMenuClass: 'DocumentItemContextMenu', position })
        break
      case 'bookmark':
        this.attachMenuGroupToContextMenu({ menuGroup, contextMenuClass: 'BookmarkItemContextMenu', position })
        break
      case 'node':
        this.attachMenuGroupToContextMenu({ menuGroup, contextMenuClass: 'NodeMenu', position })
        break
      case 'tag':
        this.attachMenuGroupToContextMenu({ menuGroup, contextMenuClass: 'tag-context-menu', position })
        break
      case 'main-menu':
        this.attachMenuGroupToContextMenu({ menuGroup, contextMenuClass: 'main-menu', position })
        break
    }
  }

  attachMenuGroupToContextMenu({ menuGroup, contextMenuClass, position }) {
    if (position === 'top') {
      $(`.${contextMenuClass}`).prepend(menuGroup)
    } else if (position === 'bottom') {
      $(`.${contextMenuClass}`).append(menuGroup)
    }
  }

  async openInPanel({ position, content, featureName, featureData }) {
    if (isIframe()) { return }
    if (!this.panels.hasOwnProperty(position)) {
      this.panels[position] = new Panel({ position, guiManager: this, featureName, featureData, panelsManager: this.panelsManager })
      // this.panels[position] = new Panel({ position, guiManager: this, panelsManager: this.panelsManager })
    }
    await this.panels[position].setOptions({ content, featureName, featureData })
    // await this.panels[position].setContent({ content })
    // this.panels[position].setFeatureData({ featureData })
    // this.panels[position].setFeatureName({ featureName })
    this.adjustPanelsSizes()
    this.attachMouseEventsForPanels()
    return this.panels[position].getPanel()
  }

  closePanel({ position }) {
    if (this.panels.hasOwnProperty(position)) {
      this.panels[position].closePanel()
    }
  }

  removePanel({ position }) {
    delete this.panels[position]
  }


  attachMouseEventsForPanels() {
    if (!this.eventsAttached) {
      $(document).on('mousemove', (e) => {

        if (!this.isResizingPanels) return

        if (!this.dragBar) {
          this.dragBar = $(e.target)
          this.draggedPanelJqNode = this.dragBar.parent()
          this.draggedPanel = this.draggedPanelJqNode.attr('class').split('-').slice(-1)[0]
        }
        e.stopImmediatePropagation()
        if (this.draggedPanel === 'right') {
          if ($(DYNALIST.app.userspace.ui.document_container_el).width() < 100) {
            this.draggedPanelJqNode.css({ width: $('.normal-view').width() - (parseInt($(DYNALIST.app.userspace.ui.document_container_el).css('left')) + 150) })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          if (this.draggedPanelJqNode.width() < 30) {
            this.draggedPanelJqNode.css({ width: 40 })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          this.draggedPanelJqNode.css({ width: $('.normal-view').width() - e.clientX })
          this.adjustPanelsSizes()
        } else if (this.draggedPanel === 'left') {
          if ($(DYNALIST.app.userspace.ui.document_container_el).width() < 100) {
            this.draggedPanelJqNode.css({ width: $('.normal-view').width() - (parseInt($(DYNALIST.app.userspace.ui.document_container_el).css('right')) + 150) - parseInt(this.draggedPanelJqNode.css('left')) })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          if (this.draggedPanelJqNode.width() < 30) {
            this.draggedPanelJqNode.css({ width: 40 })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          const dynalistLeftPaneWidth = $(DYNALIST.app.userspace.ui.pane_ui.left_pane_container_el[1]).width() + 7
          this.draggedPanelJqNode.css({ width: e.clientX - dynalistLeftPaneWidth })
          this.adjustPanelsSizes()
        } else if (this.draggedPanel === 'top') {
          if ($(DYNALIST.app.userspace.ui.document_container_el).height() < 100) {
            this.draggedPanelJqNode.css({ height: $(window).height() - $('.AppHeader').outerHeight() - (parseInt($(DYNALIST.app.userspace.ui.document_container_el).css('bottom')) + 150) })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          if (this.draggedPanelJqNode.height() < 30) {
            this.draggedPanelJqNode.css({ height: 40 })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          this.draggedPanelJqNode.css({ height: e.clientY - $('.AppHeader').outerHeight() })
          this.adjustPanelsSizes()
        } else if (this.draggedPanel === 'bottom') {
          if ($(DYNALIST.app.userspace.ui.document_container_el).height() < 100) {
            this.draggedPanelJqNode.css({ height: $(window).height() - $('.AppHeader').outerHeight() - (parseInt($(DYNALIST.app.userspace.ui.document_container_el).css('top')) + 150) })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          if (this.draggedPanelJqNode.height() < 30) {
            this.draggedPanelJqNode.css({ height: 40 })
            this.adjustPanelsSizes()
            $(document).mouseup()
            this.onMouseUp()
            return
          }
          this.draggedPanelJqNode.css({ height: $(window).height() - e.clientY })
          this.adjustPanelsSizes()
        }
        $('.DocumentContainer > .powerpack3-panel-overlay').css({ height: $('.DocumentContainer')[0].scrollHeight })
      }).on('mouseup', (e) => {
        this.onMouseUp()
      })

      this.eventsAttached = true
    }
  }
  onMouseUp() {
    if (this.isResizingPanels === true) {
      this.isResizingPanels = false
      this.dragBar = null
      this.draggedPanel = null
      this.draggedPanelJqNode = null
      $('.powerpack3-panel-overlay').remove()
      $('.dragbar').removeClass('dragged')

      _.forEach(this.panels, (panelObj, position) => {
        let css = { width: '100%', height: '100%', left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' }
        if (position === 'top' || position === 'bottom') {
          css.height = panelObj.panel.height()
          if (css.height === 40) {
            panelObj.minimized = true
            this.panelsManager.updatePanelOption({ position, option: 'minimized', value: true })
            panelObj.panel.addClass('minimized')
          } else {
            panelObj.minimized = false
            this.panelsManager.updatePanelOption({ position, option: 'minimized', value: false })
            this.panelsManager.updatePanelOption({ position, option: 'css', value: css })
            panelObj.panel.removeClass('minimized')
          }
        } else {
          css.width = panelObj.panel.width()
          if (css.width === 40) {
            panelObj.minimized = true
            this.panelsManager.updatePanelOption({ position, option: 'minimized', value: true })
            panelObj.panel.addClass('minimized')
          } else {
            panelObj.minimized = false
            this.panelsManager.updatePanelOption({ position, option: 'minimized', value: false })
            this.panelsManager.updatePanelOption({ position, option: 'css', value: css })
            panelObj.panel.removeClass('minimized')
          }
        }

      })
    }
  }

  adjustPanelsSizes() {
    const dynalistLeftPaneWidth = $(DYNALIST.app.userspace.ui.pane_ui.left_pane_container_el[1]).width() + 7
    let docContainerWidth = $('.normal-view').width() - dynalistLeftPaneWidth
    let docContainerHeight = $('.normal-view').height()
    let docContainerLeft = dynalistLeftPaneWidth
    let docContainerTop = 0

    let leftPanelWidth = 0
    if (this.panels.hasOwnProperty('left')) {
      leftPanelWidth = this.panels['left'].getPanel().outerWidth()
      this.panels['left'].getPanel().css({ left: dynalistLeftPaneWidth })
      docContainerLeft = docContainerLeft + leftPanelWidth
      docContainerWidth = docContainerWidth - leftPanelWidth
    }

    let rightPanelWidth = 0
    if (this.panels.hasOwnProperty('right')) {
      rightPanelWidth = this.panels['right'].getPanel().outerWidth()
      docContainerWidth = docContainerWidth - rightPanelWidth
    }

    let topPanelHeight = 0
    if (this.panels.hasOwnProperty('top')) {
      topPanelHeight = this.panels['top'].getPanel().outerHeight()
      this.panels['top'].getPanel().css({ width: docContainerWidth, left: docContainerLeft })
      docContainerTop = topPanelHeight
      docContainerHeight = docContainerHeight - topPanelHeight
    }

    if (this.panels.hasOwnProperty('bottom')) {
      const bottomPanelHeight = this.panels['bottom'].getPanel().outerHeight()
      this.panels['bottom'].getPanel().css({ width: docContainerWidth, left: docContainerLeft })
      docContainerHeight = docContainerHeight - bottomPanelHeight
    }

    const docContainer = $(DYNALIST.app.userspace.ui.document_container_el)
    setTimeout(() => {
      docContainer.css({ width: docContainerWidth, height: docContainerHeight, top: docContainerTop, left: docContainerLeft })
    }, 300);


  }

  appendToUnderNodePanel(nodeState, element) {
    let contentContainerInterval = setInterval(() => {
      if (nodeState.dom.self_el) {
        let panel = this.getUnderNodePanel(nodeState)
        if (panel.find('[data-id="' + element.attr('data-id') + '"]').length === 0) {
          panel.append(element)
        }
        clearInterval(contentContainerInterval)
      }
    }, 100)
  }

  getElementsFromNodeAndUnderNodePanel(nodeState, options) {
    let elements = []
    elements = elements.concat(this.getElementsFromUnderNodePanel(nodeState, options), this.getElementsFromNodeRenderedContent(nodeState, options))
    return elements
  }

  getElementsFromUnderNodePanel(nodeState, options) {
    let elements = []
    let panel = this.getUnderNodePanel(nodeState)

    if (options['id'] && panel.find(`#${options.id}`).length > 0) {
      elements = elements.concat(panel.find(`#${options.id}`).toArray())
    }
    if (options['class'] && panel.find(`.${options.class}`).length > 0) {
      elements = elements.concat(panel.find(`.${options.class}`).toArray())
    }

    return elements
  }

  getElementsFromNodeRenderedContent(nodeState, options) {
    let elements = []

    let renderedContentElement = $(nodeState.dom.self_el).find('.Node-renderedContent')

    if (options['id'] && renderedContentElement.find(`#${options.id}`).length > 0) {
      elements = elements.concat(renderedContentElement.find(`#${options.id}`).toArray())
    }
    if (options['class'] && renderedContentElement.find(`.${options.class}`).length > 0) {
      elements = elements.concat(renderedContentElement.find(`.${options.class}`).toArray())
    }

    return elements
  }

  getUnderNodePanel(nodeState) {
    let panel = $(nodeState.dom.self_el).find('.Node-contentContainer').children('.Powerpack-UnderNodePanel')
    if (panel.length === 0) {
      panel = $('<div>', { class: 'Powerpack-UnderNodePanel' })
      $(nodeState.dom.self_el).find('.Node-contentContainer').append(panel)
    }
    return panel
  }
}