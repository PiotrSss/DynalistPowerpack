import { onNodeStateInitialized } from '../helpers'
import _ from 'lodash'

export class Backlinks {

  constructor({ dlInterface }) {
    this.dlInterface = dlInterface
  }

  onDocumentFullyRendered() {
    if (DYNALIST.app.app_document.document.server_id === 'xxxxx') {
      $('.backlinks-wrapper').remove()
      this.renderBacklinks()
    }
  }

  onDocumentZoomed() {
    if (DYNALIST.app.app_document.document.server_id === 'xxxxx') {
      $('.backlinks-wrapper').remove()
      this.renderBacklinks()
    }
  }

  // onNodeBlur(node) {
  //   this.renderBacklinks()
  // }

  renderBacklinks() {
    const currentRootId = DYNALIST.app.app_document.ui.current_root.id
    const nodes = []
    _.forEach(this.dlInterface.getCurrentDocumentNodeCollection().nodes, (node, nodeId) => {
      if (node.index > -1 && this.dlInterface.getContentFromNode(node).includes(currentRootId) && !nodes.includes(node.id)) {
        nodes.push(node.id)
      }
    })
    const wrapper = $('<div>', { 'class': 'backlinks-wrapper' }).hide().html('Backlinki: ')
    $('.is-currentRoot > .Node-self').append(wrapper)
    nodes.map(nodeId => {
      let node = this.getNode(DYNALIST.Powerpack3.dlInterface.getCurrentDocumentNodeCollection().nodes[nodeId])
      if (node) {
        const link = 'https://dynalist.io/d/xxxxx#z=' + node.id
        const text = this.dlInterface.getContentFromNode(node)
        wrapper.show().append(`<a href="${link}">${text}</a>`)
      }
    })
  }

  getNode(node) {
    if (node.id === 'root') {
      return
    }

    if (node.meta_obj.data.n && node.meta_obj.data.n.includes(node.id)) {
      return node
    }

    return this.getNode(node.parent)
  }

}