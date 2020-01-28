
import { onNodeStateInitialized, traverseNotCollapsedNodeTree } from '../helpers'

export class ItemsStyling {

  constructor({ settingsManager, dlInterface }) {
    this.settingsManager = settingsManager
    this.dlInterface = dlInterface

    this.featureName = 'ItemsStyling'
    this.featureTitle = 'Items styling'

    this.status = false
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

    return this.settingsManager.buildFeaturePopupSection({ featureName: this.featureName, featureTitle: this.featureTitle, settingsFragments: [statusFragment] })
  }

  activate() {
    this.status = true
    this.renderStylingInAllNodes()
  }

  deactivate() {
    this.status = false
    $('.ItemsStyling').attr('style', '')
  }

  onDocumentFullyRendered() {
    if (this.status) {
      this.renderStylingInAllNodes()
    }
  }

  onDocumentZoomed() {
    if (this.status) {
      this.renderStylingInAllNodes()
    }
  }

  onNodeBlur(node) {
    if (this.status && this.dlInterface.hasTag(node.get_content_parse_tree(), 's|')) {
      this.style(node)
    }
  }

  onNodeCollapseChange(node) {
    if (this.status && !node.collapsed) {
      this.renderStylingInAllNodes(node)
    }
  }

  renderStylingInAllNodes(node = DYNALIST.app.app_document.ui.current_root) {
    traverseNotCollapsedNodeTree(node, node => {
      if (this.dlInterface.hasTag(node.get_content_parse_tree(), 's|')) {
        this.style(node)
      }
    })
  }

  style(node) {

    onNodeStateInitialized({
      node, callback: () => {
        const nodeState = this.dlInterface.getNodeState(node)
        $(nodeState.dom.rendered_content_el).find('.node-tag:contains("s|")').hide()
        let tags = this.dlInterface.getFullTagsFromFragment(this.dlInterface.getContentFromNode(node), 's|')

        for (let tag of tags) {

          let options = { b: null, c: null, d: null, f: null, s: null, w: null, italic: null, bl: null, bt: null, bb: null, br: null, css: null }

          for (let [key, value] of Object.entries(options)) {
            if (tag.includes('|' + key + ':')) {
              let regex = '\\|' + key + ':(.+?)(\\||\\s|$)'
              options[key] = new RegExp(regex).exec(tag)[0].replace('|' + key + ':', '').replace(/\|/g, '').trim()
            }
          }
          if (tag.includes('italic')) { options.italic = true }

          if (tag.includes('|i|')) {
            this.styleItem(nodeState, options)
          } else if (tag.includes('|t|')) {
            this.styleTree(nodeState, options)
          } else if (tag.includes('|ch|')) {
            this.styleChildren(nodeState, options)
          } else if (tag.includes('|n|')) {
            this.styleNote(nodeState, options)
          } else {
            this.styleAll(nodeState, options)
          }
        }
      }
    })
  }

  styleItem(nodeState, options) {
    if (options.b) {
      $(nodeState.dom.content_container_el).css('background', options.b).css('padding-left', '6px')
    }
    if (options.c) {
      $(nodeState.dom.content_container_el).css('color', options.c)
    }
    if (options.d) {
      $(nodeState.dom.content_el).css('text-decoration', options.d.replace(/_/g, ' '))
      $(nodeState.dom.content_container_el).find('span').css('text-decoration', options.d.replace(/_/g, ' '))
    }
    if (options.f) {
      $(nodeState.dom.content_container_el).css('font-family', options.f.replace(/_/g, ' '))
    }
    if (options.s) {
      $(nodeState.dom.content_container_el).css('font-size', options.s)
    }
    if (options.w) {
      $(nodeState.dom.content_container_el).css('font-weight', options.w)
    }
    if (options.italic) {
      $(nodeState.dom.content_container_el).css('font-style', 'italic')
    }
    if (options.bl) {
      if (options.bl.includes('_')) {
        $(nodeState.dom.content_container_el).css('border-left', options.bl.replace(/_/g, ' ')).css('padding-left', '6px')
      } else {
        $(nodeState.dom.content_container_el).css('border-left', '3px solid ' + options.bl).css('padding-left', '6px')
      }
    }
    if (options.bt) {
      if (options.bt.includes('_')) {
        $(nodeState.dom.content_container_el).css('border-top', options.bt.replace(/_/g, ' ')).css('padding-top', '2px').css('margin-top', '-4px')
      } else {
        $(nodeState.dom.content_container_el).css('border-top', '3px solid ' + options.bt).css('padding-top', '2px').css('margin-top', '-4px')
      }
    }
    if (options.br) {
      if (options.br.includes('_')) {
        $(nodeState.dom.content_container_el).css('border-right', options.br.replace(/_/g, ' '))
      } else {
        $(nodeState.dom.content_container_el).css('border-right', '3px solid ' + options.br)
      }
    }
    if (options.bb) {
      if (options.bb.includes('_')) {
        $(nodeState.dom.content_container_el).css('border-bottom', options.bb.replace(/_/g, ' ')).css('padding-bottom', '1px')
      } else {
        $(nodeState.dom.content_container_el).css('border-bottom', '3px solid ' + options.bb).css('padding-bottom', '1px')
      }
    }
    if (options.css) {
      $(nodeState.dom.content_container_el).attr('style', options.css.replace(/_/g, ' '))
    }

    $(nodeState.dom.content_container_el).css('border-radius', 0).addClass('ItemsStyling')
  }

  styleTree(nodeState, options) {
    if (options.b) {
      $(nodeState.dom.children_el).css('background', options.b).css('padding-left', '6px')
      options.b = null
    }
    if (options.bl) {
      if (options.bl.includes('_')) {
        $(nodeState.dom.children_el).css('border-left', options.bl.replace(/_/g, ' ')).css('padding-left', '6px')
      } else {
        $(nodeState.dom.children_el).css('border-left', '3px solid ' + options.bl).css('padding-left', '6px')
      }
      options.bl = null
    }
    if (options.bt) {
      if (options.bt.includes('_')) {
        $(nodeState.dom.children_el).css('border-top', options.bt.replace(/_/g, ' ')).css('padding-top', '2px').css('margin-top', '-4px')
      } else {
        $(nodeState.dom.children_el).css('border-top', '3px solid ' + options.bt).css('padding-top', '2px').css('margin-top', '-4px')
      }
      options.bt = null
    }
    if (options.br) {
      if (options.br.includes('_')) {
        $(nodeState.dom.children_el).css('border-right', options.br.replace(/_/g, ' '))
      } else {
        $(nodeState.dom.children_el).css('border-right', '3px solid ' + options.br)
      }
      options.br = null
    }
    if (options.bb) {
      if (options.bb.includes('_')) {
        $(nodeState.dom.children_el).css('border-bottom', options.bb.replace(/_/g, ' ')).css('padding-bottom', '1px')
      } else {
        $(nodeState.dom.children_el).css('border-bottom', '3px solid ' + options.bb).css('padding-bottom', '1px')
      }
      options.bb = null
    }
    if (options.css) {
      $(nodeState.dom.children_el).attr('style', options.css.replace(/_/g, ' '))
      options.css = null
    }

    this.traverseTree(nodeState, options)

  }

  styleChildren(nodeState, options) {
    let children = nodeState.node.children.children
    for (let child of children) {
      onNodeStateInitialized({
        node: child, callback: () => {
          const childNodeState = this.dlInterface.getNodeState(child)
          if (childNodeState) {
            this.styleItem(childNodeState, options)
          }
        }
      })
    }
  }

  styleAll(nodeState, options) {
    if (options.b) {
      $(nodeState.dom.node_el).css('background', options.b).css('padding-left', '6px')
      options.b = null
    }
    if (options.bl) {
      if (options.bl.includes('_')) {
        $(nodeState.dom.node_el).css('border-left', options.bl.replace(/_/g, ' ')).css('padding-left', '6px')
      } else {
        $(nodeState.dom.node_el).css('border-left', '3px solid ' + options.bl).css('padding-left', '6px')
      }
      options.bl = null
    }
    if (options.bt) {
      if (options.bt.includes('_')) {
        $(nodeState.dom.node_el).css('border-top', options.bt.replace(/_/g, ' ')).css('padding-top', '2px').css('margin-top', '-4px')
      } else {
        $(nodeState.dom.node_el).css('border-top', '3px solid ' + options.bt).css('padding-top', '2px').css('margin-top', '-4px')
      }
      options.bt = null
    }
    if (options.br) {
      if (options.br.includes('_')) {
        $(nodeState.dom.node_el).css('border-right', options.br.replace(/_/g, ' '))
      } else {
        $(nodeState.dom.node_el).css('border-right', '3px solid ' + options.br)
      }
      options.br = null
    }
    if (options.bb) {
      if (options.bb.includes('_')) {
        $(nodeState.dom.node_el).css('border-bottom', options.bb.replace(/_/g, ' ')).css('padding-bottom', '1px')
      } else {
        $(nodeState.dom.node_el).css('border-bottom', '3px solid ' + options.bb).css('padding-bottom', '1px')
      }
      options.bb = null
    }

    this.styleItem(nodeState, options)
    this.traverseTree(nodeState, options)
  }

  styleNote(nodeState, options) {
    if (options.b) {
      $(nodeState.dom.note_container_el).css('background', options.b).css('padding-left', '6px')
    }
    if (options.c) {
      $(nodeState.dom.note_el).css('color', options.c)
      $(nodeState.dom.rendered_note_el).find('span').css('color', options.c)
    }
    if (options.d) {
      $(nodeState.dom.note_el).css('text-decoration', options.d.replace(/_/g, ' '))
      $(nodeState.dom.rendered_note_el).find('span').css('text-decoration', options.d.replace(/_/g, ' '))
    }
    if (options.f) {
      $(nodeState.dom.note_el).css('font-family', options.f.replace(/_/g, ' '))
      $(nodeState.dom.rendered_note_el).find('span').css('font-family', options.f.replace(/_/g, ' '))
    }
    if (options.s) {
      $(nodeState.dom.note_el).css('font-size', options.s)
      $(nodeState.dom.rendered_note_el).find('span').css('font-size', options.s)
    }
    if (options.w) {
      $(nodeState.dom.note_el).css('font-weight', options.w)
      $(nodeState.dom.rendered_note_el).find('span').css('font-weight', options.w)
    }
    if (options.italic) {
      $(nodeState.dom.note_el).css('font-style', 'italic')
      $(nodeState.dom.rendered_note_el).find('span').css('font-style', 'italic')
    }
    if (options.bl) {
      if (options.bl.includes('_')) {
        $(nodeState.dom.note_container_el).css('border-left', options.bl.replace(/_/g, ' ')).css('padding-left', '6px')
      } else {
        $(nodeState.dom.note_container_el).css('border-left', '3px solid ' + options.bl).css('padding-left', '6px')
      }
    }
    if (options.bt) {
      if (options.bt.includes('_')) {
        $(nodeState.dom.note_container_el).css('border-top', options.bt.replace(/_/g, ' ')).css('padding-top', '2px').css('margin-top', '-4px')
      } else {
        $(nodeState.dom.note_container_el).css('border-top', '3px solid ' + options.bt).css('padding-top', '2px').css('margin-top', '-4px')
      }
    }
    if (options.br) {
      if (options.br.includes('_')) {
        $(nodeState.dom.note_container_el).css('border-right', options.br.replace(/_/g, ' '))
      } else {
        $(nodeState.dom.note_container_el).css('border-right', '3px solid ' + options.br)
      }
    }
    if (options.bb) {
      if (options.bb.includes('_')) {
        $(nodeState.dom.note_container_el).css('border-bottom', options.bb.replace(/_/g, ' ')).css('padding-bottom', '1px')
      } else {
        $(nodeState.dom.note_container_el).css('border-bottom', '3px solid ' + options.bb).css('padding-bottom', '1px')
      }
    }
    if (options.css) {
      $(nodeState.dom.note_container_el).attr('style', options.css.replace(/_/g, ' '))
    }
  }

  traverseTree(nodeState, options) {
    if (nodeState.node.has_children()) {
      for (let child of nodeState.node.get_children().children) {
        onNodeStateInitialized({
          node: child, callback: () => {
            const childNodeState = this.dlInterface.getNodeState(child)
            if (childNodeState) {
              this.styleItem(childNodeState, options)
              this.traverseTree(childNodeState, options)
            }
          }
        })
      }
    }
  }

}