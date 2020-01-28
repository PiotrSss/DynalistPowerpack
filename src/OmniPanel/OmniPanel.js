
import _ from 'lodash'

let keyboardjs = require('keyboardjs')

export class OmniPanel {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'OmniPanel'
    this.featureTitle = 'OmniPanel'

    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        panes: 'Files+Bookmarks',
        shortcut: '',
        opened: false,
        resized: false,
        first: { height: null },
        second: { height: null, top: null },
        third: { height: null, top: null }
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

    const panesFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'panes', label: 'Panes to include, from top to bottom', help: '<p>Use minimum 2 from: Files, Bookmarks, Tags. Use "+" as a delimiter.</p>',
      onAfterSave: async () => {
        this.deactivate()
        this.updateSetting({ name: 'opened', value: true })
        this.activate()
      }
    })

    const shortcutFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcut', label: 'Shortcut to show/hide Omni Panel:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcut'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, panesFragment, shortcutFragment] })
  }

  async activate() {
    const panes = await this.getSetting('panes')
    if (panes.split('+').length > 1 && panes.split('+').length < 4) {
      await this.prepareOmniPanel()

      if (await this.getSetting('opened')) {
        this.openOmniPanel()
      }
    }
  }

  deactivate() {
    this.clearSize()
    this.closeOmniPanel()
    $('style#dynalist-powerpack-OmniPanel').remove()
    $('.omniPane').removeClass('omniPane omniPane-first omniPane-second omniPane-third').css({ height: '100%', top: '0', zIndex: 1 })
    $('.Pane').hide()
    $('.LeftPaneContainer-navItem--omni').remove()
    $('.LeftPaneContainer-navItem--myFiles').show()
    $('.FilePane .Pane-headerToolbarItem--collapse').show()
    $('.LeftPaneContainer-navItem--bookmarks').show()
    $('.BookmarkPane .Pane-headerToolbarItem--collapse').show()
    $('.LeftPaneContainer-navItem--tags').show()
    $('.TagPane .Pane-headerToolbarItem--collapse').show()
  }

  async onOpenPane(name) {
    if (await this.getSetting('status')) {
      const panes = await this.getSetting('panes')
      if (name === 'bookmark' && panes.includes('Bookmarks') && panes.split('+').length > 1 && panes.split('+').length < 4) {
        this.openOmniPanel()
      }
    }
  }

  async updateKeyboardBindings() {
    const shortcut = await this.getSetting('shortcut')
    keyboardjs.unbind(shortcut);
    if (shortcut.length > 0) {
      keyboardjs.bind(shortcut, e => {
        e.preventDefault();
        this.toggleOmniPanel()
      });
    }
  }

  async prepareOmniPanel() {
    const panesDb = await this.getSetting('panes')
    let panes = panesDb.split('+')
    let first = this.dlInterface.getPaneEl(panes[0])
    let second = this.dlInterface.getPaneEl(panes[1])
    let third = panes[2] ? this.dlInterface.getPaneEl(panes[2]) : null

    await this.setSizes(first, second, third)

    this.prepareIconsForOmniPanel()

    // resizing
    let isResizingPanes = false, draggedHeader = null, headerHeight = $('.Pane-header').height()
    // $('.omniPane-second .Pane-header, .omniPane-third .Pane-header').on('mousedown', function (e) {
    //   console.log('mousedown')
    //   isResizingPanes = true
    //   draggedHeader = $(this).parent()
    // });
    second.children('.Pane-header').on('mousedown', function (e) {
      isResizingPanes = true
      draggedHeader = $(this).parent()
    })
    if (third) {
      third.children('.Pane-header').on('mousedown', function (e) {
        isResizingPanes = true
        draggedHeader = $(this).parent()
      })
    }

    let firstSettings = await this.getSetting('first')
    let secondSettings = await this.getSetting('second')
    let thirdSettings = await this.getSetting('third')

    $(document).on('mousemove', async (e) => {
      if (!isResizingPanes) return
      await this.updateSetting({ name: 'resized', value: true })

      if (third) {

        if (draggedHeader.hasClass('omniPane-second')) {
          let firstH = ((100 * (e.clientY - headerHeight - headerHeight)) / $('.LeftPaneContainer-panes').height()) + '%';
          firstSettings.height = firstH
          first.css('height', firstH)
          let secondT = ((100 * (e.clientY - headerHeight - headerHeight)) / $('.LeftPaneContainer-panes').height()) + '%';
          secondSettings.top = secondT
          second.css('top', secondT)
          let secondH = ((100 * (third.offset().top - e.clientY + headerHeight - 5) / $('.LeftPaneContainer-panes').height()) + '%');
          secondSettings.height = secondH
          second.css('height', secondH)
          if (!thirdSettings.height) {
            thirdSettings = { height: '33%', top: '66%' }
          }
        } else {
          let secondH = ((100 * (e.clientY - second.offset().top - headerHeight + 5)) / $('.LeftPaneContainer-panes').height()) + '%'
          secondSettings.height = secondH
          second.css('height', secondH)
          let thirdT = ((100 * (e.clientY - headerHeight - headerHeight)) / $('.LeftPaneContainer-panes').height()) + '%'
          thirdSettings.top = thirdT
          third.css('top', thirdT)
          let thirdH = ((100 * ($('.LeftPaneContainer-panes').height() - e.clientY + headerHeight + headerHeight) / $('.LeftPaneContainer-panes').height()) + '%')
          thirdSettings.height = thirdH
          third.css('height', thirdH)
          if (!firstSettings.height) {
            firstSettings = { height: '33%' }
          }
        }
      } else {
        let firstH = ((100 * (e.clientY - headerHeight - headerHeight)) / $('.LeftPaneContainer-panes').height()) + '%'
        firstSettings.height = firstH
        first.css('height', firstH)
        let secondT = ((100 * (e.clientY - headerHeight - headerHeight)) / $('.LeftPaneContainer-panes').height()) + '%'
        secondSettings.top = secondT
        second.css('top', secondT)
        let secondH = (100 * ($('.LeftPaneContainer-panes').height() - e.clientY + headerHeight + headerHeight) / $('.LeftPaneContainer-panes').height()) + '%'
        secondSettings.height = secondH
        second.css('height', secondH)
      }
    }).on('mouseup', async (e) => {
      if (!isResizingPanes) return
      isResizingPanes = false
      draggedHeader = null
      await this.updateSetting({ name: 'first', value: firstSettings })
      await this.updateSetting({ name: 'second', value: secondSettings })
      await this.updateSetting({ name: 'third', value: thirdSettings })
    })
  }

  async setSizes(first, second, third) {
    if (!third) {
      if (await this.getSetting('resized')) {
        const firstSettings = await this.getSetting('first')
        const secondSettings = await this.getSetting('second')
        first.addClass('omniPane omniPane-first').css({ height: firstSettings.height, top: '0' })
        second.addClass('omniPane omniPane-second').css({ height: secondSettings.height, top: secondSettings.top, zIndex: 3 })
      } else {
        first.addClass('omniPane omniPane-first').css({ height: '50%', top: '0' })
        second.addClass('omniPane omniPane-second').css({ height: '50%', top: '50%', zIndex: 3 })
      }
    } else {
      if (await this.getSetting('resized')) {
        const firstSettings = await this.getSetting('first')
        const secondSettings = await this.getSetting('second')
        const thirdSettings = await this.getSetting('third')
        first.addClass('omniPane omniPane-first').css({ height: firstSettings.height, top: '0' })
        second.addClass('omniPane omniPane-second').css({ height: secondSettings.height, top: secondSettings.top, zIndex: 2 })
        third.addClass('omniPane omniPane-third').css({ height: thirdSettings.height, top: thirdSettings.top, zIndex: 3 })
      } else {
        first.addClass('omniPane omniPane-first').css({ height: '33%', top: '0' })
        second.addClass('omniPane omniPane-second').css({ height: '33%', top: '33%', zIndex: 2 })
        third.addClass('omniPane omniPane-third').css({ height: '33%', top: '66%', zIndex: 3 })
      }
    }
  }

  async clearSize() {
    this.updateSetting({ name: 'resized', value: false })
    this.updateSetting({ name: 'first', value: { height: null } })
    this.updateSetting({ name: 'second', value: { height: null, top: null } })
    this.updateSetting({ name: 'third', value: { height: null, top: null } })
  }

  populateOmniPanelTags() {
    if ($('.TagPane-tags.Pane-content').height() >= 30) {
      setTimeout(() => {
        this.dlInterface.openPane('tag')
      }, 5000)
    }
  }

  async prepareIconsForOmniPanel() {
    if ($('.LeftPaneContainer-nav').children('.LeftPaneContainer-navItem--omni').length === 0) {
      let omniBtn = $('<div class="LeftPaneContainer-navItem LeftPaneContainer-navItem--omni"><div class="tooltip mod-feature mod-right" data-name="app-toggle-omni-pane" data-title="Toggle Omni Panel"></div></div>');
      $('.LeftPaneContainer-nav').prepend(omniBtn);
      omniBtn.on('mousedown', async () => {
        if ($('.LeftPaneSlidebarContainer').hasClass('is-closed')) { // panel was closed
          this.openOmniPanel()
        } else if (!$('.LeftPaneSlidebarContainer').hasClass('is-closed') && (await this.getSetting('opened') && $('.omniPane').hasClass('is-active'))) { // panel was opened with Omni Panel visible
          this.closeOmniPanel()
        } else {//if (!$('.LeftPaneSlidebarContainer').hasClass('is-closed') && (!this.settings.getSetting('opened') && !$('.omniPane').hasClass('is-active'))) { // panel was opened with native pane
          this.openOmniPanel()
        }
      })

      const panes = await this.getSetting('panes')
      if (panes.includes('Files')) {
        $('.LeftPaneContainer-navItem--myFiles').hide()
        $('.FilePane .Pane-headerToolbarItem--collapse').hide()
      }
      if (panes.includes('Bookmarks')) {
        $('.LeftPaneContainer-navItem--bookmarks').hide()
        $('.BookmarkPane .Pane-headerToolbarItem--collapse').hide()
      }
      if (panes.includes('Tags')) {
        $('.LeftPaneContainer-navItem--tags').hide()
        $('.TagPane .Pane-headerToolbarItem--collapse').hide()
      }

      $('.LeftPaneContainer-navItem--myFiles, .LeftPaneContainer-navItem--bookmarks, .LeftPaneContainer-navItem--tags').on('mousedown', () => {
        this.closeOmniPanel(false)
      })
    }
  }

  async toggleOmniPanel() {
    if (await this.getSetting('opened')) {
      this.closeOmniPanel()
    } else {
      this.openOmniPanel()
    }
  }

  async openOmniPanel() {
    $('.LeftPaneContainer-navItem').removeClass('is-active')
    $('.Pane').removeClass('is-active')
    $('.LeftPaneContainer-navItem--omni').addClass('is-active')
    this.dlInterface.closePane()
    this.dlInterface.openPane()

    const panesDb = await this.getSetting('panes')
    let panes = panesDb.split('+')
    for (let pane of panes) {

      this.dlInterface.getPaneEl(pane).addClass('is-active')
      if (pane === 'Tags') { this.populateOmniPanelTags(); }
    }

    this.updateSetting({ name: 'opened', value: true })
  }

  async closeOmniPanel(closeAll = true) {
    $('.LeftPaneContainer-navItem--omni').removeClass('is-active')
    if (closeAll) {
      this.dlInterface.closePane()
    }
    const panesDb = await this.getSetting('panes')
    let panes = panesDb.split('+')
    for (let pane of panes) {
      this.dlInterface.getPaneEl(pane).removeClass('is-active')
    }

    this.updateSetting({ name: 'opened', value: false })
  }

}