
import { agendaTimeframedResultsLayout, agendaResultsLayout } from '../templates'

import { Filters } from '../Filters'
import { SortFunctions } from '../SortFunctions'

import { FoundedNode } from './FoundedNode'

let moment = require('moment')
moment.locale(window.navigator.language)
import _ from 'lodash'

export class AgendaQueries {

  constructor({ googleCalendar, dbManager, dlInterface }) {
    this.googleCalendar = googleCalendar
    this.dbManager = dbManager
    this.dlInterface = dlInterface
    this.filters = new Filters({ dlInterface: this.dlInterface })
    this.sorting = new SortFunctions({ dlInterface: this.dlInterface })

    this.initDb()
  }

  async initDb() {
    const db = await this.dbManager.getDatabase('settings')
    let coll = db.getCollection('agenda-queries')
    if (!coll) {
      coll = db.addCollection('agenda-queries')
      db.saveDatabase()
    }
  }

  async getQueries() {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-queries')
    return coll.find()
  }

  async getQueryById({ id }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-queries')
    return coll.findOne({ id })
  }

  async getQueryResult({ id, queryWrapper, startdateChange }) {
    let query = await this.getQueryById({ id })
    const nodes = await this.getNodesFromUrls(query.docs)
    if (!query.selectedSortId) {
      query.selectedSortId = '0'
    }
    const sortOptions = _.find(this.getSortOptions({ sortOptions: query.sortOptions }), (s) => { return s.id == query.selectedSortId })
    let foundedNodes
    if (query.groupByDate) {
      foundedNodes = await this.getDateGroupedQueryResult({ query, nodes, startdateChange })
      query = await this.getQueryById({ id })
      if (query.selectedSortId != '0') {
        foundedNodes = this.sortNodes({ foundedNodes, groupByDate: true, sortOptions })
      }
      if (query.groupByDoc) {
        foundedNodes = this.groupByDoc({ foundedNodes, groupByDate: true })
      }
      if (query.daysReversed) {
        foundedNodes = _.orderBy(foundedNodes, ['date'], ['desc'])
      }
      return agendaTimeframedResultsLayout({ query, foundedNodes, onTimeframeChange: this.onTimeframeChange.bind(this), onQueryRefreshNeeded: this.refreshQueryResult.bind(this), queryWrapper })
    } else {
      foundedNodes = await this.getNormalQueryResult({ query, nodes })
      if (query.selectedSortId != '0') {
        foundedNodes = this.sortNodes({ foundedNodes, groupByDate: false, sortOptions })
      }
      if (query.groupByDoc) {
        foundedNodes = this.groupByDoc({ foundedNodes, groupByDate: false })
      }
      return agendaResultsLayout({ foundedNodes, groupByDoc: query.groupByDoc, renderTags: query.renderTags, removeDates: query.removeDates, onQueryRefreshNeeded: this.refreshQueryResult.bind(this), queryWrapper })
    }
  }

  onTimeframeChange({ queryId, timeframe }) {
    this.updateQueryOption({ id: queryId, name: 'timeframe', value: timeframe })
    this.updateQueryOption({ id: queryId, name: 'startdate', value: moment() })
  }

  async getDateGroupedQueryResult({ query, nodes, startdateChange }) {
    let foundedNodes
    let startdate
    let date
    let enddate
    let dates
    switch (query.timeframe) {
      case 'day':
        startdate = moment(query.startdate)
        if (startdateChange === 'prev') {
          startdate.subtract(1, 'd')
        } else if (startdateChange === 'next') {
          startdate.add(1, 'd')
        }
        this.updateQueryOption({ id: query.id, name: 'startdate', value: startdate })
        date = startdate.clone()
        dates = [date]
        foundedNodes = this.findNodesForPeriodOfTime({ integrateWithGoogleCalendar: query.integrateWithGoogleCalendar, dates, nodes, filtersGroups: query.filtersGroups, archives: query.archives, daysWithResults: query.daysWithResults })
        break
      case 'week':
        let weekday = 0
        if (query.firstDay === 'sunday') { weekday = 7 } else if (query.firstDay === 'monday') { weekday = 1 } else if (query.firstDay === 'tuesday') { weekday = 2 } else if (query.firstDay === 'wednesday') { weekday = 3 }
        startdate = moment(query.startdate).startOf('isoWeek').isoWeekday(weekday)
        if (startdateChange === 'prev') {
          startdate.subtract(7, 'd')
        } else if (startdateChange === 'next') {
          startdate.add(7, 'd')
        }
        this.updateQueryOption({ id: query.id, name: 'startdate', value: startdate })
        enddate = startdate.clone().add(6, 'd')
        dates = [startdate]
        date = startdate.clone()
        while (!date.isSame(enddate, 'day')) {
          date = date.clone()
          date.add(1, 'd')
          dates.push(date)
        }
        foundedNodes = this.findNodesForPeriodOfTime({ integrateWithGoogleCalendar: query.integrateWithGoogleCalendar, dates, nodes, filtersGroups: query.filtersGroups, archives: query.archives, daysWithResults: query.daysWithResults })
        break
      case 'month':
        startdate = moment(query.startdate).startOf('month')
        if (startdateChange === 'prev') {
          startdate.subtract(1, 'month')
        } else if (startdateChange === 'next') {
          startdate.add(1, 'month')
        }
        this.updateQueryOption({ id: query.id, name: 'startdate', value: startdate })
        enddate = startdate.clone().add(1, 'month').subtract(1, 'd')
        dates = [startdate]
        date = startdate.clone()
        while (!date.isSame(enddate, 'day')) {
          date = date.clone()
          date.add(1, 'd')
          dates.push(date)
        }
        foundedNodes = this.findNodesForPeriodOfTime({ integrateWithGoogleCalendar: query.integrateWithGoogleCalendar, dates, nodes, filtersGroups: query.filtersGroups, archives: query.archives, daysWithResults: query.daysWithResults })
        break
      case 'year':
        startdate = moment(query.startdate).startOf('isoYear')
        if (startdateChange === 'prev') {
          startdate.subtract(1, 'year')
        } else if (startdateChange === 'next') {
          startdate.add(1, 'y')
        }
        this.updateQueryOption({ id: query.id, name: 'startdate', value: startdate })
        enddate = startdate.clone().add(1, 'year').subtract(1, 'd')
        dates = [startdate]
        date = startdate.clone()
        while (!date.isSame(enddate, 'day')) {
          date = date.clone()
          date.add(1, 'd')
          dates.push(date)
        }
        foundedNodes = this.findNodesForPeriodOfTime({ integrateWithGoogleCalendar: query.integrateWithGoogleCalendar, dates, nodes, filtersGroups: query.filtersGroups, archives: query.archives, daysWithResults: query.daysWithResults })
        break
    }
    return foundedNodes
  }

  async getNormalQueryResult({ query, nodes }) {
    return this.findAllNodes({ nodes, filtersGroups: query.filtersGroups, archives: query.archives })
  }

  async refreshQueryResult({ queryWrapper, startdateChange }) {
    $(queryWrapper).find('.agenda-query-content').html('<div class="loader" style="display:block"></div>')
    const results = await this.getQueryResult({ id: $(queryWrapper).attr('data-id'), queryWrapper, startdateChange })
    $(queryWrapper).find('.agenda-query-content .loader').fadeOut({ complete: () => { $(queryWrapper).find('.agenda-query-content').html(results) } })
  }

  getSortOptions({ sortOptions }) {
    const defaults = [
      { id: 0, name: 'none' },
      { id: 1, name: 'content', by: ['content'], order: ['asc'] },
      { id: 2, name: 'content|desc', by: ['content'], order: ['desc'] },
      { id: 4, name: 'checked', by: ['checked'], order: ['asc'] },
      { id: 5, name: 'checked|desc', by: ['checked'], order: ['desc'] },
      { id: 6, name: 'color', by: ['color'], order: ['asc'] },
      { id: 7, name: 'color|desc', by: ['color'], order: ['desc'] },
      { id: 8, name: 'date', by: ['date'], order: ['asc'] },
      { id: 9, name: 'date|desc', by: ['date'], order: ['desc'] },
    ]
    return sortOptions.concat(defaults)
  }

  async updateQueryOption({ id, name, value }) {
    const query = await this.getQueryById({ id })
    query[name] = value
    this.saveQuery({ query })
  }

  // async getSearchResults({ timeframe, sortOptions, startdate, filtersGroups, groupByDoc, renderTags, removeDates, callback }) {
  //   const nodes = await this.getNodesFromUrls(view.documents)
  //   let date = view.startdate.clone()
  //   let dateTimeRegex = new RegExp('{dt [a-zA-Z]+?}', 'g')
  // }

  // findNodesForDay({ date, nodes, filtersGroups, archives, daysWithResults }) {
  //   const dateTimeRegex = new RegExp('{dt [a-zA-Z]+?}', 'g')
  //   const foundedNodes = []
  //   const foundedNodesForDate = []
  //   for (let node of nodes) {
  //     let added = false
  //     for (let filtersGroup of filtersGroups) {
  //       if (added) { break }
  //       let found = true
  //       for (let filter of filtersGroup) {
  //         let { name, target, value } = filter
  //         let dateTimeMatches = value.match(dateTimeRegex)
  //         dateTimeMatches = dateTimeMatches ? dateTimeMatches : []
  //         for (let match of dateTimeMatches) {
  //           let format = match.replace('{dt ', '').replace('}', '')
  //           value = value.replace(match, date.format(format))
  //         }
  //         if (value.includes('{dl_date}')) {
  //           value = value.replace(/{dl_date}/g, '!(' + date.format('YYYY') + '-' + date.format('MM') + '-' + date.format('DD'))
  //         }
  //         if (!this.filters[target + '_' + name](node, value)) {
  //           found = false
  //           break
  //         }
  //       }
  //       if (found) {
  //         foundedNodesForDate.push(new FoundedNode({ node, dlInterface: this.dlInterface, archives }))
  //         added = true
  //         break
  //       }
  //     }
  //   }
  //   foundedNodes.push({ date, foundedNodesForDate })
  //   return foundedNodes
  // }

  async findNodesForPeriodOfTime({ integrateWithGoogleCalendar, dates, nodes, filtersGroups, archives, daysWithResults }) {
    const dateTimeRegex = new RegExp('{dt [a-zA-Z]+?}', 'g')
    const foundedNodes = []
    for (let date of dates) {
      const foundedNodesForDate = []
      for (let node of nodes) {
        let added = false
        for (let filtersGroup of filtersGroups) {
          if (added) { break }
          let found = true
          for (let filter of filtersGroup) {
            let { name, target, value } = filter
            let dateTimeMatches = value.match(dateTimeRegex)
            dateTimeMatches = dateTimeMatches ? dateTimeMatches : []
            for (let match of dateTimeMatches) {
              let format = match.replace('{dt ', '').replace('}', '')
              value = value.replace(match, date.format(format))
            }
            if (value.includes('{dl_date}')) {
              value = value.replace(/{dl_date}/g, '!(' + date.format('YYYY') + '-' + date.format('MM') + '-' + date.format('DD'))
            }
            if (!this.filters[target + '_' + name](node, value)) {
              found = false
              break
            }
          }
          if (found) {
            foundedNodesForDate.push(new FoundedNode({ node, dlInterface: this.dlInterface, archives }))
            added = true
            break
          }
        }
      }
      if (integrateWithGoogleCalendar && DYNALIST.PLATFORM === 'web') {
        const events = await this.googleCalendar.getEventsForDay({ day: date.clone() })
        events.map(event => {
          let when = event.start.dateTime
          if (!when) {
            when = event.start.date;
          }
          when = moment(when)
          const content = event.summary + ' !(' + when.format('YYYY') + '-' + when.format('MM') + '-' + when.format('DD') + ' ' + when.format('HH') + ':' + when.format('mm') + ')'
          const node = this.dlInterface.createNode({ content: content, doc: this.dbManager.dbDoc })
          node.document = this.dbManager.dbDoc
          node.fromGoogleCalendar = true
          foundedNodesForDate.push(new FoundedNode({ node, dlInterface: this.dlInterface, archives }))
        })
      }
      if (daysWithResults && foundedNodesForDate.length > 0) {
        foundedNodes.push({ date, foundedNodesForDate })
      } else if (!daysWithResults) {
        foundedNodes.push({ date, foundedNodesForDate })
      }
    }
    return foundedNodes
  }

  findAllNodes({ nodes, filtersGroups, archives }) {
    let foundedNodes = []
    let date = moment()
    let dateTimeRegex = new RegExp('{dt [a-zA-Z]+?}', 'g')
    for (let node of nodes) {
      let added = false
      for (let filtersGroup of filtersGroups) {
        if (added) { break }
        let found = true
        let dlDate = null
        for (let filter of filtersGroup) {
          let { name, target, value } = filter
          let dateTimeMatches = value.match(dateTimeRegex)
          dateTimeMatches = dateTimeMatches ? dateTimeMatches : []
          for (let match of dateTimeMatches) {
            let format = match.replace('{dt ', '').replace('}', '')
            value = value.replace(match, date.format(format))
          }
          if (value.includes('{dl_date}')) {
            value = value.replace(/{dl_date}/g, dlDate)
          }
          if (!this.filters[target + '_' + name](node, value)) {
            found = false
            break
          }
        }
        if (found) {
          foundedNodes.push(new FoundedNode({ node, dlInterface: this.dlInterface, archives }))
          added = true
          break
        }
      }
    }
    return foundedNodes
  }

  groupByDoc({ foundedNodes, groupByDate }) {
    if (groupByDate) {
      let groupedFoundedNodes = []
      _.forEach(foundedNodes, (nodesObj, key) => {
        groupedFoundedNodes.push({
          date: nodesObj.date, foundedNodesForDate: _.groupBy(nodesObj.foundedNodesForDate, (n) => {
            if (n.node.fromGoogleCalendar) {
              return 'Google Calendar'
            }
            return n.node.document.title
          })
        })
      })
      return groupedFoundedNodes
    } else {
      return _.groupBy(foundedNodes, (n) => { return n.node.document.title })
    }
  }

  sortNodes({ foundedNodes, groupByDate, sortOptions }) {
    let sortParams = this.sorting.parseSortParams(sortOptions.name)
    if (groupByDate) {
      let sortedNodes = []
      _.forEach(foundedNodes, (nodesObj, key) => {
        if (nodesObj.foundedNodesForDate.length < 2) {
          sortedNodes.push({ date: nodesObj.date, foundedNodesForDate: nodesObj.foundedNodesForDate })
        } else {
          const ordered = _.orderBy(this.sorting.prepareNodesToSort(nodesObj.foundedNodesForDate, sortParams), sortParams.map(p => p.name + p.fragment), sortParams.map(p => p.order))
          const foundedOrderedNodes = []
          _.forEach(ordered, (orderedObj, key) => {
            foundedOrderedNodes.push(orderedObj.node)
          })
          sortedNodes.push({ date: nodesObj.date, foundedNodesForDate: foundedOrderedNodes })
        }
      })
      return sortedNodes
    } else {
      if (foundedNodes.length > 1) {
        const ordered = _.orderBy(this.sorting.prepareNodesToSort(foundedNodes, sortParams), sortParams.map(p => p.name + p.fragment), sortParams.map(p => p.order))
        foundedNodes = []
        _.forEach(ordered, (orderedObj, key) => {
          foundedNodes.push(orderedObj.node)
        })
      }
      return foundedNodes
    }
  }

  async getNodesFromUrls(urls) {
    let nodesFromUrls = []
    for (const url of urls) {
      const nodeId = null
      const documentId = null
      if (url.includes('#z=')) {
        nodeId = url.split('#z=')[1]
        documentId = url.split('#z=')[0].split('/d/')[1]
      } else {
        documentId = url.split('/d/')[1]
      }
      let docObj = null
      if (documentId) {
        docObj = await this.getDocumentObj(documentId)
      }
      if (docObj) {
        const document = docObj.document
        nodesFromUrls = nodesFromUrls.concat(await this.getNodes(document, nodeId))
      }
    }
    return nodesFromUrls
  }

  getDocumentObj(documentId) {
    let i = 1
    return new Promise(resolve => {
      let interval = setInterval(() => {
        let docObj = _.find(DYNALIST.app.app_documents, (docObj) => { return docObj.document.server_id === documentId })
        if (docObj) {
          resolve(docObj)
          clearInterval(interval)
        } else if (!docObj && i >= 20) {
          clearInterval(interval)
          resolve(null)
        }
        i++
      }, 1000)
    })
  }

  getNodes(document, nodeId) {
    return new Promise(resolve => {
      let interval = setInterval(() => {
        if (document.node_collection.is_available()) {
          if (nodeId) {
            let root = null
            this.dlInterface.traverseTreeBfs(document.node_collection, (node) => {
              if (node.id === nodeId) {
                return root = node
              }
            })
            if (root) {
              resolve(this.getNodesRecursive(root, document))
            }
          } else {
            resolve(this.getNodesRecursive(document.node_collection.root, document))
          }
          clearInterval(interval)
          resolve([])
        } else {
          DYNALIST.app.find_or_add_app_document(document)
        }
      }, 100)
    })

  }

  getNodesRecursive(node, document, nodes = []) {
    node.document = document
    if (node.index > -1 && this.dlInterface.getContentFromNode(node).length > 0) {
      nodes.push(node)
    }
    if (node.has_children()) {
      for (let child of node.get_children().children) {
        nodes = nodes.concat(this.getNodesRecursive(child, document))
      }
    }
    return nodes
  }

  async saveQuery({ query }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-queries')
    let queryDbObj = coll.find({ id: query.id })[0]
    if (!queryDbObj) {
      query.timeframe = 'week'
      queryDbObj = query
      coll.insert(queryDbObj)
    } else {
      queryDbObj.filtersGroups = query.filtersGroups
      queryDbObj.sortOptions = query.sortOptions
      queryDbObj.docs = query.docs
      queryDbObj.archives = query.archives
      _.defaultsDeep(query, queryDbObj)
      coll.update(query)
    }
    await db.saveDatabase()
  }

  async removeQuery({ id }) {
    const db = await this.dbManager.getDatabase('settings')
    const coll = db.getCollection('agenda-queries')
    coll.findAndRemove({ id })
  }
}