
let keyboardjs = require('keyboardjs')

export class FocusMode {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'FocusMode'
    this.featureTitle = 'Focus & Hide UI'

    this.focus = false
    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        focus: false,
        shortcutFocus: '',
        button: false,
        hideUi: false,
        shortcutHideUi: ''
      }
    })

    if (await this.getSetting('focus')) {
      this.activateFocusMode()
    }
    if (await this.getSetting('button')) {
      this.showFocusButton()
    }
    if (await this.getSetting('hide-ui')) {
      this.hideUi()
    }
  }

  async getSetting(settingName) {
    return await this.settingsManager.getSetting({ featureName: this.featureName, settingName: settingName })
  }

  updateSetting({ name, value }) {
    this.settingsManager.updateSetting({ featureName: this.featureName, settingName: name, value: value })
  }

  async getPopupSettingsSection() {

    const focusFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'focus', label: 'Enable Focus Mode', callbackOn: () => this.activateFocusMode(), callbackOff: () => this.deactivateFocusMode()
    })

    const shortcutFocusFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutFocus', label: 'Shortcut to enable/disable Focus Mode:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutFocus'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    const buttonFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'button', label: 'Show Focus! button on the right, under search&filters icons', callbackOn: () => this.showFocusButton(), callbackOff: () => this.hideFocusButton()
    })

    const hideUiFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'hideUi', label: 'Hide UI (hover over top/left bar to see it again after activation)', callbackOn: () => this.hideUi(), callbackOff: () => this.showUi()
    })

    const shortcutHideUiFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutHideUi', label: 'Shortcut to hide/show ui:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutHideUi'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [focusFragment, shortcutFocusFragment, buttonFragment, hideUiFragment, shortcutHideUiFragment] })
  }

  async updateKeyboardBindings() {
    const shortcutFocus = await this.getSetting('shortcutFocus')
    keyboardjs.unbind(shortcutFocus);
    if (shortcutFocus.length > 0) {
      keyboardjs.bind(shortcutFocus, e => {
        e.preventDefault();
        this.settingsManager.toggleSetting({ featureName: this.featureName, settingName: 'status', callback: () => { this.toggleFocusMode() } })
      });
    }
    const shortcutHideUi = await this.getSetting('shortcutHideUi')
    keyboardjs.unbind(shortcutHideUi);
    if (shortcutHideUi.length > 0) {
      keyboardjs.bind(shortcutHideUi, e => {
        e.preventDefault();
        this.settingsManager.toggleSetting({ featureName: this.featureName, settingName: 'lineNumbers', callback: () => { this.toggleUiVisibility() } })
      });
    }
  }

  async onDocumentFullyRendered() {
    if (await this.getSetting('button')) {
      this.showFocusButton()
    }
    if (this.focus) {
      setTimeout(() => {
        if (!DYNALIST.app.app_document.ui.is_focused_on_doc_searchbar()) {
          let node = this.dlInterface.getCurrentlyEditedNode()
          if (!node) {
            let children = this.dlInterface.getNodeFromDomEl($('.is-currentRoot > .Node-self')[0]).children.children
            if (children.length > 0) {
              this.dlInterface.setCursorToPositionInNode(children[0], 0)
            }
          } else {
            let nodeState = this.dlInterface.getNodeState(node)
            if (nodeState && nodeState.is_current_root()) {
              let children = node.children.children
              if (children.length > 0) {
                this.dlInterface.setCursorToPositionInNode(children[0], 0)
              }
            }
          }
        }
      }, 500)
      this.activateFocusMode()
    }
  }

  onNodeZoom(node) {
    if (this.focus) {
      this.onDocumentFullyRendered()
    }
  }

  async onNodeFocus(node) {
    if (this.focus) {
      let nodeState = this.dlInterface.getNodeState(node)
      if (nodeState) {
        while (!nodeState.ui_parent_node_state.is_current_root()) {
          nodeState = nodeState.ui_parent_node_state
        }
        if (!this.dlInterface.hasTag(nodeState.node.get_content_parse_tree(), 'f:no', true)) {
          $(nodeState.dom.node_outer_el).addClass('focused-node')
        }
      }
    }
  }

  async onNodeBlur(node) {
    if (this.focus) {
      let nodeState = this.dlInterface.getNodeState(node)
      if (nodeState) {
        $(nodeState.dom.content_container_el).find('.node-tag').filter(function () { return $(this).text() === '#f:yes' || $(this).text() === '#f:no' }).hide()
        while (!nodeState.ui_parent_node_state.is_current_root()) {
          nodeState = nodeState.ui_parent_node_state
        }
        if (!this.dlInterface.hasTag(nodeState.node.get_content_parse_tree(), 'f:yes', true)) {
          $(nodeState.dom.node_outer_el).removeClass('focused-node')
        }
      }
    }
  }

  async activateFocusMode() {
    this.focus = true
    if (await this.getSetting('button')) {
      $('.btn-focus').text('Unfocus').addClass('active')
    }

    this.dlInterface.traverseTreeDfs(this.dlInterface.getCurrentDocumentNodeCollection(), (node) => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 'f:yes')) {
        const nodeState = this.dlInterface.getNodeState(node)
        if (nodeState) {
          $(nodeState.dom.node_outer_el).addClass('focused-node')
        }
      }
    })

    $('.node-tag').filter(function () { return $(this).text() === '#f:yes' }).hide()
    $('.node-tag').filter(function () { return $(this).text() === '#f:no' }).hide()

    let $stylesActive = $("<style>", { id: "dynalist-powerpack3-FocusMode-focus", "type": "text/css" });
    $stylesActive.append('.is-currentRoot > .Node-children > .Node-outer { opacity: .1; filter: grayscale(100%); transition: 1s; }');
    $stylesActive.append('.is-currentRoot > .Node-children > .Node-outer:hover { opacity: 1; filter: none; transition: 1s; }');
    $stylesActive.append('.focused-node { filter: none !important; opacity: 1 !important; transition: 1s; }');
    $stylesActive.append('.grabbing .is-currentRoot > .Node-children > .Node-outer { filter: none !important; opacity: 1 !important; transition: 1s; }');
    $('head').append($stylesActive);

    if (await this.getSetting('hideUi')) {
      this.hideUi()
    }
  }

  async deactivateFocusMode() {
    this.focus = false
    $('style#dynalist-powerpack3-FocusMode-focus').remove()
    if (await this.getSetting('button')) {
      $('.btn-focus').text('Focus!').removeClass('active')
    }
    this.showUi()
  }

  async toggleFocusMode() {
    await this.updateSetting({ name: 'focus', value: !await this.getSetting('focus') })
    await this.getSetting('focus') ? this.activateFocusMode() : this.deactivateFocusMode()
  }

  async showFocusButton() {
    let btnText = await this.getSetting('focus') ? 'Unfocus' : 'Focus!'
    let btn = $('<div class="btn-focus"></div>').text(btnText)
    if ($('.btn-focus').length === 0) {
      $('.DocumentTools').append(btn);
    }

    if (await this.getSetting('focus')) {
      btn.addClass('active')
    }

    btn.on('click', () => {
      this.toggleFocusMode();
    });
  }

  hideFocusButton() {
    $('.DocumentTools .btn-focus').remove()
  }

  hideUi() {
    let $stylesHideUi = $("<style>", { id: "dynalist-powerpack3-FocusMode-hide-ui", "type": "text/css" });
    $stylesHideUi.append('.AppHeader { opacity: 0; transition: 1s; }');
    $stylesHideUi.append('.AppHeader:hover { opacity: 1; transition: 1s; }');
    $stylesHideUi.append('.LeftPaneSlidebarContainer, .LeftPaneSplitter { opacity: 0; transition: 1s; }');
    $stylesHideUi.append('.LeftPaneSlidebarContainer:hover, .LeftPaneSplitter:hover { opacity: 1; transition: 1s; }');
    $stylesHideUi.append('.DocumentTools-overlay, .DocumentTools-icon { opacity: .1; transition: 1s; }');
    $stylesHideUi.append('.DocumentTools-overlay:hover, .DocumentTools-icon:hover { opacity: 1; transition: 1s; }');
    $('head').append($stylesHideUi);
  }

  showUi() {
    $('style#dynalist-powerpack3-FocusMode-hide-ui').remove()
  }

  async toggleUiVisibility() {
    await this.updateSetting({ name: 'hideUi', value: !await this.getSetting('hideUi') })
    await this.getSetting('hideUi') ? this.hideUi() : this.showUi()
  }

}

