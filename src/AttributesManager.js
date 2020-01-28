import _ from 'lodash'

const moment = require('moment')
moment.locale(window.navigator.language)

export class AttributesManager {

  constructor({ dbManager, dlInterface, guiManager }) {
    this.dbManager = dbManager
    this.dlInterface = dlInterface
    this.guiManager = guiManager

    this.dbName = 'attributes'

    this.SR_ATTRIBUTE_ID = 'j3FXD7IIde'
  }

  async initAttributesDatabase() {

    this.db = await this.dbManager.getDatabaseWrapperNode(this.dbName)
    if (!this.db) {
      this.dbManager.createDatabaseWrapperNode(this.dbName)
    }
    this.db = await this.dbManager.getDatabaseWrapperNode(this.dbName)

    this.cleanup()
  }

  parseNode(node) {
    const content = this.dlInterface.getContentFromNode(node)
    const attributes = {}
    node.children.children.map(attributeWrapper => {
      const attrId = this.dlInterface.getContentFromNode(attributeWrapper)
      let attrContent = this.dlInterface.getContentFromNode(attributeWrapper.children.children[0])
      attributes[attrId] = JSON.parse(attrContent)
    })
    return {
      node_id: content.split('||')[0],
      document_id: content.split('||')[1],
      document_server_id: content.split('||')[2],
      attributes,
      node
    }
  }

  getItem({ nodeId }) {
    const node = _.find(this.db.children.children, (item) => item.index > -1 && item.meta.includes(nodeId))
    if (node) {
      return this.parseNode(node)
    }
    return null
  }

  getItemsByAttributeId({ attributeId }) {
    const nodes = this.db.children.children.filter(node => {
      if (node.index > -1) {
        let found = false
        node.children.children.map(attributeWrapper => {
          if (this.dlInterface.getContentFromNode(attributeWrapper) === attributeId) {
            found = true
          }
        })
        return found
      }
    })
    return nodes.map(node => this.parseNode(node))
  }

  getItemsNodesIdsByAttributeId({ attributeId }) {
    const nodes = this.db.children.children.filter(node => {
      if (node.index > -1) {
        let found = false
        node.children.children.map(attributeWrapper => {
          if (this.dlInterface.getContentFromNode(attributeWrapper) === attributeId) {
            found = true
          }
        })
        return found
      }
    })
    return nodes.map(node => {
      return this.dlInterface.getContentFromNode(node).split('||')[0]
    })
  }

  async saveItem({ nodeId, documentId, documentServerId, attrId, attrValue }) {
    const dbObject = await this.getItem({ nodeId })
    const item = dbObject ? dbObject : {}
    item.id = nodeId + '||' + documentId + '||' + documentServerId
    item.attributes = item.attributes ? item.attributes : {}
    item.attributes[attrId] = JSON.stringify(attrValue)
    if (dbObject) {
      this.dlInterface.insertNodeContent({ node: dbObject.node, content: item.id, doc: this.dbManager.dbDoc })
      let found = false
      dbObject.node.children.children.map(attributeWrapper => {
        if (this.dlInterface.getContentFromNode(attributeWrapper) === attrId) {
          found = true
          this.dlInterface.insertNodeContent({ node: attributeWrapper.children.children[0], content: item.attributes[attrId], doc: this.dbManager.dbDoc })
        }
      })
      if (!found) {
        const attributeWrapper = this.dlInterface.createNode({ content: attrId, doc: this.dbManager.dbDoc })
        this.dlInterface.attachFirstChildNode(attributeWrapper, dbObject.node, this.dbManager.dbDoc)
        const attrContent = this.dlInterface.createNode({ content: item.attributes[attrId], doc: this.dbManager.dbDoc })
        this.dlInterface.attachFirstChildNode(attrContent, attributeWrapper, this.dbManager.dbDoc)
      }
    } else {
      const node = this.dlInterface.createNode({ content: item.id, doc: this.dbManager.dbDoc })
      this.dlInterface.attachFirstChildNode(node, this.db, this.dbManager.dbDoc)
      _.forEach(item.attributes, (value, id) => {
        const attributeWrapper = this.dlInterface.createNode({ content: id, doc: this.dbManager.dbDoc })
        this.dlInterface.attachFirstChildNode(attributeWrapper, node, this.dbManager.dbDoc)
        const attrContent = this.dlInterface.createNode({ content: value, doc: this.dbManager.dbDoc })
        this.dlInterface.attachFirstChildNode(attrContent, attributeWrapper, this.dbManager.dbDoc)
      })
    }
  }

  async removeItem({ nodeId }) {
    const item = await this.getItem({ nodeId })
    this.dlInterface.removeNodeFromDoc({ node: item.node, doc: this.dbManager.dbDoc })
  }

  async removeAttribute({ attrId, nodeId }) {
    const item = await this.getItem({ nodeId })
    if (item.node.children.children.length <= 1) {
      this.removeItem({ nodeId })
    } else {
      item.node.children.children.map(attributeWrapper => {
        if (this.dlInterface.getContentFromNode(attributeWrapper) === attrId) {
          this.dlInterface.removeNodeFromDoc({ node: attributeWrapper, doc: this.dbManager.dbDoc })
        }
      })
    }
  }

  async onNodeCloned({ oldNode, newNode, newDoc }) {
    const item = await this.getItem({ nodeId: oldNode.id })
    this.dlInterface.insertNodeContent({ node: item.node, content: newNode.id + '||' + newDoc.id + '||' + newDoc.server_id, doc: this.dbManager.dbDoc })
  }

  async cleanup({ forced = false } = {}) {

    const nodeName = 'last attributes cleanup: '

    const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(this.dbManager.dbDoc)
    let cleanUpNode = null
    for (let node of nodes) {
      const nodeContent = this.dlInterface.getContentFromNode(node)
      if (nodeContent.includes(nodeName)) {
        cleanUpNode = node
      }
    }
    if (!cleanUpNode) {
      cleanUpNode = this.dlInterface.createNode({ content: nodeName + '!(' + moment().subtract(1, 'd').format('YYYY-MM-DD HH:mm:ss') + ')', doc: this.dbManager.dbDoc })
      this.dlInterface.attachNodeToDocumentOnBottom({ node: cleanUpNode, doc: this.dbManager.dbDoc })
    }
    let date = this.dlInterface.getContentFromNode(cleanUpNode).replace(nodeName, '').replace('!(', '').replace(')', '')
    if (moment(date).isBefore(moment()) || forced) {
      this.db.children.children.map(child => {
        if (child.children.children.length === 0) {
          this.dlInterface.removeNodeFromDoc({ node: child, doc: this.dbManager.dbDoc })
          return
        }
        const content = this.dlInterface.getContentFromNode(child)
        const item = {
          node_id: content.split('||')[0],
          document_id: content.split('||')[1],
          document_server_id: content.split('||')[2]
        }
        const doc = _.find(this.dlInterface.getDocuments(), (document) => document.server_id === item.document_server_id)
        if (doc) {
          const interval = setInterval(() => {
            if (doc.node_collection.available) {
              clearInterval(interval)
              const node = doc.node_collection.nodes[item.node_id]
              if (!node || node.index < 0) {
                this.removeItem({ nodeId: item.node_id })
              }
            } else {
              DYNALIST.app.find_or_add_app_document(doc)
            }
          }, 100)
        } else {
          this.removeItem({ nodeId: item.node_id })
        }
      })
      this.dlInterface.insertNodeContent({ node: cleanUpNode, content: nodeName + '!(' + moment().add(7, 'd').format('YYYY-MM-DD HH:mm:ss') + ')', doc: this.dbManager.dbDoc })
    }
  }

  async copyNodeToDatabase({ nodeId, documentId, documentServerId, under }) {
    let dbParentNode = await this.dbManager.getDatabaseWrapperNode(under)
    if (!dbParentNode) {
      this.dbManager.createDatabaseWrapperNode(under)
    }
    dbParentNode = await this.dbManager.getDatabaseWrapperNode(under)

    const doc = _.find(this.dlInterface.getDocuments(), document => document.server_id === documentServerId)
    if (doc) {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          if (doc.node_collection.available) {
            clearInterval(interval)
            // const node = this.dlInterface.cloneNodeAndTree(doc.node_collection.nodes[nodeId], doc.node_collection.nodes[nodeId].parent, 0)
            const node = DYNALIST.app.app_document.controller.clone_node_and_children(doc.node_collection.nodes[nodeId], doc.node_collection.nodes[nodeId].parent, 0)
            const node2 = DYNALIST.app.app_documents[this.dbManager.dbDoc.id].controller.clone_node_and_children(node, dbParentNode, 0)
            DYNALIST.app.app_document.view.detach_nodes([node])
            // console.log(node)
            // this.dlInterface.moveNodes([node], dbParentNode, 0, this.dbDoc)

            resolve({ node_id: node2.id, document_id: this.dbManager.dbDoc.id, document_server_id: this.dbManager.dbDoc.server_id })
          } else {
            DYNALIST.app.find_or_add_app_document(doc)
          }
        }, 100)
      })
    }
  }

}