import loki from 'lokijs'
import { LokiDynalistAdapter } from './LokiDynalistAdapter'

export class DatabaseManager {

  constructor({ dbName, dlInterface }) {
    this.dbName = dbName
    this.dlInterface = dlInterface

    this.lokiDynalistAdapter = new LokiDynalistAdapter({ dlInterface: this.dlInterface, dbManager: this })

    this.databases = {}
  }

  async prepareDynalistDatabaseDocument() {
    this.dbDoc = this.dlInterface.checkIfDocumentExistByName(this.dbName)
    if (!this.dbDoc) {
      this.createDynalistDatabaseDocument()
    }
    return new Promise(resolve => {
      let docExistInterval = setInterval(async () => {
        this.dbDoc = this.dlInterface.checkIfDocumentExistByName(this.dbName)
        DYNALIST.app.find_or_add_app_document(this.dbDoc)
        if (this.dbDoc) {
          clearInterval(docExistInterval)
          resolve()
        }
      }, 100)
    })
  }

  createDynalistDatabaseDocument() {
    this.dlInterface.createDocument(this.dbName)
  }

  async getDatabase(name) {

    if (this.databases.hasOwnProperty(name)) {
      return this.databases[name]
    }
    let dbWrapperNode = await this.getDatabaseWrapperNode(name)
    if (!dbWrapperNode) {
      this.createDatabaseWrapperNode(name)
    }
    dbWrapperNode = await this.getDatabaseWrapperNode(name)
    let loaded = false

    const db = new loki(name, {
      adapter: this.lokiDynalistAdapter,
      autoload: true,
      autoloadCallback: () => { loaded = true },
      autosave: true,
      autosaveInterval: 4000,
      env: 'BROWSER'
    })
    return new Promise(resolve => {
      const dbLoaded = setInterval(async () => {
        if (loaded) {
          clearInterval(dbLoaded)
          this.databases[name] = db
          resolve(db)
        }
      }, 100)
    })
  }

  async getDatabaseWrapperNode(name) {
    const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(this.dbDoc)
    for (let node of nodes) {
      if (node.index > -1) {
        const nodeContent = this.dlInterface.getContentFromNode(node)
        if (nodeContent === name) {
          return node
        }
      }
    }
  }

  createDatabaseWrapperNode(name) {
    const node = this.dlInterface.createNode({ content: name, doc: this.dbDoc })
    node.collapsed = true
    this.dlInterface.attachNodeToDocumentOnBottom({ node: node, doc: this.dbDoc })
    const childNote = this.dlInterface.attachFirstChildNode(this.dlInterface.createNode({ doc: this.dbDoc }), node)
  }

  async getDatabaseNode(name) {
    const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(this.dbDoc)
    for (let node of nodes) {
      const nodeContent = this.dlInterface.getContentFromNode(node)
      if (nodeContent === name) {
        return this.dlInterface.getFirstChildNodeFromNode(node)
      }
    }
  }

  async getRawDatabaseData(name) {
    const databaseNode = await this.getDatabaseNode(name)
    return this.dlInterface.getContentFromNode(databaseNode)
    // const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(this.dbDoc)
    // for (let node of nodes) {
    //   const nodeContent = this.dlInterface.getContentFromNode(node)
    //   if (nodeContent === name) {
    //     const childNode = this.dlInterface.getFirstChildNodeFromNode(node)
    //     return this.dlInterface.getContentFromNode(childNode)
    //   }
    // }
  }

  async saveRawDatabaseData({ name, data }) {
    const databaseNode = await this.getDatabaseNode(name)
    return this.dlInterface.insertNodeContent({ node: databaseNode, content: data, doc: this.dbDoc })
    // const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(this.dbDoc)
    // for (let node of nodes) {
    //   const nodeContent = this.dlInterface.getContentFromNode(node)
    //   if (nodeContent === name) {
    //     let childNode = this.dlInterface.getFirstChildNodeFromNode(node)
    //     return this.dlInterface.insertNodeContent({ node: childNode, content: content, doc: this.dbDoc })
    //   }
    // }
  }





  // async getDatabase() {

  //   // if (!this.database) {
  //   let doc = this.dlInterface.checkIfDocumentExistByName(this.dbName)

  //   if (!doc) {
  //     this.createDatabase()
  //   }

  //   return new Promise(resolve => {
  //     let docExistInterval = setInterval(async () => {
  //       doc = this.dlInterface.checkIfDocumentExistByName(this.dbName)
  //       if (doc) {
  //         clearInterval(docExistInterval)
  //         const nodes = await this.dlInterface.getFirstLevelNodesFromDocument(doc)
  //         this.database = {}
  //         // for (let node of nodes) {
  //         //   const nodeContent = this.dlInterface.getContentFromNode(node)
  //         //   if (nodeContent) {
  //         //     let childNode = this.dlInterface.getFirstChildNodeFromNode(node)
  //         //     if (!childNode) {
  //         //       childNode = this.dlInterface.attachFirstChildNode(this.dlInterface.createNode(), node)
  //         //     }
  //         //     this.database[nodeContent] = this.dlInterface.getContentFromNode(childNode)
  //         //   }
  //         // }
  //         resolve(this.database)
  //       }
  //     }, 100)
  //   })
  //   // }

  //   // return this.database

  // }



  hideDatabase() {

  }

  // createDatabase(name) {
  //   const node = this.dlInterface.createNode({ content: name, doc: this.dbDoc })
  //   this.dlInterface.attachNodeToDocumentOnBottom({ node: node, doc: this.dbDoc })
  //   const childNote = this.dlInterface.attachFirstChildNode(this.dlInterface.createNode({ doc: this.dbDoc }), node)
  // }



  insertToDatabase({ name, value }) {

  }


}