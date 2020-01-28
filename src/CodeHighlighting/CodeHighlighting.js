const styles = (ctx => {
  let keys = ctx.keys();
  let values = keys.map(ctx);
  return keys.reduce((o, k, i) => { o[k.replace('./', '').replace('.css', '')] = values[i]; return o; }, {});
})(require.context('./styles', false, /css/));

const hljs = require('./index')
const codeHighlightLinenums = require('code-highlight-linenums')
const keyboardjs = require('keyboardjs')

import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class CodeHighlighting {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'CodeHighlighting'
    this.featureTitle = 'Code highlighting'

    this.status = false
    this.init()

  }

  async init() {
    await this.settingsManager.initFeatureSettings({
      featureName: this.featureName, defaults: {
        status: false,
        shortcutStatus: '',
        lineNumbers: false,
        shortcutLineNumbers: '',
        theme: 'railscasts'
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

    const shortcutStatusFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutStatus', label: 'Shortcut to activate/deactivate:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutStatus'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    const lineNumbersFragment = await this.settingsManager.buildCheckboxPopupElement({
      featureName: this.featureName, settingName: 'lineNumbers', label: 'With line numbers?', callbackOn: () => this.activate(), callbackOff: () => this.deactivate()
    })

    const shortcutLineNumbersFragment = await this.settingsManager.buildInputPopupElement({
      featureName: this.featureName, settingName: 'shortcutLineNumbers', label: 'Shortcut to show/hide line numbers:', help: '<p>look <a href="https://dynalist.io/d/OzuUqkYwKBE-g5QOJBFIkVbg#z=UGGH1CAMlqaFCkgQS5iGCaNA" target="_blank">here</a> for all possible key names.</p>',
      onBeforeSave: async () => {
        keyboardjs.unbind(await this.getSetting('shortcutLineNumbers'))
      },
      onAfterSave: () => {
        this.updateKeyboardBindings()
      }
    })

    let themes = {}
    for (let name of Object.keys(styles)) {
      themes[name] = name.replace(/[\-\.]/g, ' ').replace(/(^| )(\w)/g, s => s.toUpperCase())
    }

    const themeFragment = await this.settingsManager.buildSelectPopupElement({
      featureName: this.featureName, settingName: 'theme', label: 'Theme:', selected: await this.getSetting('theme'), values: themes, onChange: () => { this.reactivate() }
    })

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment, shortcutStatusFragment, lineNumbersFragment, shortcutLineNumbersFragment, themeFragment] })
  }

  async activate() {
    this.status = true
    const theme = await this.getSetting('theme')
    $('.dynalist-powerpack3').text($('.dynalist-powerpack3').text() + styles[theme].toString())
    this.highlightCodeInAllNodes()
  }

  deactivate() {
    this.status = false
    $('.hljs').each(function (i, codeBlock) {
      let lang = $(codeBlock).attr("class").replace('node-inline-code', '').replace('hljs', '').trim()
      if ($(codeBlock).text().split('\n').length > 1) {
        $(codeBlock).html(lang + '\n' + $(codeBlock).text())
      } else {
        $(codeBlock).html(lang + ' ' + $(codeBlock).text())
      }
    })
  }

  async reactivate() {
    this.deactivate()
    if (await this.getSetting('status')) {
      this.activate()
    }
  }

  async updateKeyboardBindings() {
    const shortcutStatus = await this.getSetting('shortcutStatus')
    keyboardjs.unbind(shortcutStatus);
    if (shortcutStatus.length > 0) {
      keyboardjs.bind(shortcutStatus, e => {
        e.preventDefault();
        this.settingsManager.toggleSetting({ featureName: this.featureName, settingName: 'status', callback: () => { this.reactivate() } })
      });
    }
    const shortcutLineNumbers = await this.getSetting('shortcutLineNumbers')
    keyboardjs.unbind(shortcutLineNumbers);
    if (shortcutLineNumbers.length > 0) {
      keyboardjs.bind(shortcutLineNumbers, e => {
        e.preventDefault();
        this.settingsManager.toggleSetting({ featureName: this.featureName, settingName: 'lineNumbers', callback: () => { this.reactivate() } })
      });
    }
  }

  async onDocumentFullyRendered() {
    if (this.status) {
      this.highlightCodeInAllNodes()
    }
  }
  async onDocumentZoomed() {
    if (this.status) {
      this.highlightCodeInAllNodes()
    }
  }

  async onNoteBlur(node) {
    if (this.status) {
      if (node.meta.includes('`')) {
        this.highlightCodeInNode(node)
      }
    }
  }

  async onNodeBlur(node) {
    if (this.status) {
      if (node.meta.includes('`')) {
        this.highlightCodeInNode(node)
      }
    }
  }

  async onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.highlightCodeInAllNodes(node)
    }
  }

  async onExitDocumentSearch() {
    if (this.status) {
      this.reactivate()
    }
  }

  async highlightCodeInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (node.meta.includes('`')) {
        this.highlightCodeInNode(node)
      }
    })
  }

  highlightCodeInNode(node) {
    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        $([nodeState.dom.rendered_content_el, nodeState.dom.rendered_note_el]).find('.node-inline-code').each((i, codeBlock) => {
          this.highlightCode(codeBlock)
        })
      }
    })
  }

  async highlightCode(codeBlock) {
    let lang
    if ($(codeBlock).is('code')) {
      lang = $(codeBlock).attr('class').replace('node-inline-code', '').replace('language-', '').trim()
    } else {
      lang = codeBlock.text().split(/\s/)[0];
    }
    if ($.inArray(lang, hljs.listLanguages()) >= 0) {
      codeBlock.addClass(lang).addClass('hljs');
      codeBlock.text(codeBlock.text().replace(lang, '').trim());
      if (codeBlock.text().split('\n')[0].length === 0) {
        codeBlock.text(codeBlock.text().split('\n').slice(1).join("\n"))
      }

      if (await this.getSetting('lineNumbers') && $(codeBlock).text().split('\n').length > 1) {
        let formattedCode = codeHighlightLinenums(codeBlock.text(), {
          hljs: hljs,
          lang: lang,
          start: 1,
        });
        codeBlock.html(formattedCode)
      } else {
        hljs.highlightBlock(codeBlock);
      }
    }
  }

}