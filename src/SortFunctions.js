
import _ from 'lodash'

export class SortFunctions {

  constructor({ dlInterface }) {
    this.dlInterface = dlInterface
  }

  parseSortParams(sortParamsString) {

    sortParamsString = sortParamsString.trim()

    let params = []

    let parts = sortParamsString.split('+').map(p => p.trim())

    for (let part of parts) {
      let param = { name: '', order: 'asc', type: 'string', fragment: '' }
      if (part.includes('|desc')) {
        param.order = 'desc'
      }
      part = part.replace('|desc', '').replace('|asc', '')
      if (part.includes('|num')) {
        param.type = 'number'
      }
      if (part.includes('|alpha')) {
        param.type = 'string'
      }
      part = part.replace('|num', '').replace('|alpha', '')

      if (part.split('|').length > 1) {
        param.name = part.split('|')[0]
        param.fragment = part.split('|')[1]
      } else {
        param.name = part
      }

      params.push(param)
    }
    return params
  }

  prepareNodesToSort(nodesToSort, sortParamsArr) {
    let nodesToSortPrepared = []
    for (let nodeToSort of nodesToSort) {
      let valuesToCompare = { node: nodeToSort }
      if (nodeToSort.node) {
        nodeToSort = nodeToSort.node
      }
      for (let sortParams of sortParamsArr) {
        if (sortParams.name.includes('content')) {
          let nodeContent = this.getNodeContent(nodeToSort, sortParams)
          valuesToCompare[sortParams.name + sortParams.fragment] = nodeContent ? nodeContent.toLowerCase() : nodeContent
        }
        if (sortParams.name === 'color') {
          valuesToCompare['color'] = this.getNodeColor(nodeToSort)
        }
        if (sortParams.name === 'checked') {
          valuesToCompare['checked'] = this.isNodeChecked(nodeToSort)
        }
        if (sortParams.name === 'date') {
          valuesToCompare['date'] = this.getDateFromNode(nodeToSort)
        }
        if (sortParams.name === 'date_oldest') {
          valuesToCompare['date_oldest'] = this.getOldestDateFromNode(nodeToSort)
        }
        if (sortParams.name === 'date_newest') {
          valuesToCompare['date_newest'] = this.getNewestDateFromNode(nodeToSort)
        }
        if (sortParams.name === 'edited') {
          valuesToCompare['edited'] = this.getEditedTimeFromNode(nodeToSort)
        }
        if (sortParams.name === 'created') {
          valuesToCompare['created'] = this.getCreatedTimeFromNode(nodeToSort)
        }
        if (sortParams.name === 'number_of_children') {
          valuesToCompare['number_of_children'] = this.getNumberOfNodeDirectChildren(nodeToSort)
        }
        if (sortParams.name === 'size_of_tree') {
          valuesToCompare['size_of_tree'] = this.getNumberOfNodeChildren(nodeToSort)
        }
        if (sortParams.name === 'last_time_edited_in_tree') {
          valuesToCompare['last_time_edited_in_tree'] = this.getEditedInTree(nodeToSort)
        }
      }
      nodesToSortPrepared.push(valuesToCompare)
    }
    return nodesToSortPrepared
  }

  getNodeContent(node, sortParams) {
    let nodeContent = this.dlInterface.getContentFromNode(node)

    let result = null

    if (sortParams.fragment) {
      let val = sortParams.fragment
      if (val.includes('*')) {
        let valForRegEx = _.replace(val, /\*/g, '(\\S)*')
        let regEx = new RegExp(valForRegEx, "i").exec(nodeContent)
        result = regEx ? regEx[0] : null
      } else {
        let valForRegEx = '(' + val + '\\s|' + val + '$)'

        let regEx = new RegExp(valForRegEx, "i").exec(nodeContent)
        result = regEx ? 1 : 0
      }
    } else {
      result = nodeContent
    }

    if (sortParams.type === 'string') {
      result = result ? result.toString() : null
    } else if (sortParams.type === 'number') {
      if (typeof result === 'string') {
        result = result.replace(/\D/g, '')
      }
      result = result ? Number(result) : null
    }

    return result
  }

  getNodeColor(node) {
    return node.get_meta_object().data.cl ? node.get_meta_object().data.cl : 99
  }

  isNodeChecked(node) {
    return node.get_meta_object().data.checked ? node.get_meta_object().data.checked : 0
  }

  getDateFromNode(nodeToSort) {
    let contentParseTree = nodeToSort.get_content_parse_tree()
    let time = 0
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        time = fragment['time']
      }
    })
    return time
  }

  getOldestDateFromNode(nodeToSort) {
    let contentParseTree = nodeToSort.get_content_parse_tree()
    let time = 0
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        if (time === 0 || time > fragment['time']) {
          time = fragment['time']
        }
      }
    })
    return time
  }

  getNewestDateFromNode(nodeToSort) {
    let contentParseTree = nodeToSort.get_content_parse_tree()
    let time = 0
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        if (time === 0 || time < fragment['time']) {
          time = fragment['time']
        }
      }
    })
    return time
  }

  getEditedTimeFromNode(nodeToSort) {
    return nodeToSort.edited_ts
  }

  getCreatedTimeFromNode(nodeToSort) {
    return nodeToSort.created_ts
  }

  getNumberOfNodeDirectChildren(nodeToSort) {
    return nodeToSort.children.children.length
  }

  getNumberOfNodeChildren(node, num = 0) {
    if (node.has_children()) {
      num += node.get_children().children.length
      for (let child of node.get_children().children) {
        num = this.getNumberOfNodeChildren(child, num)
      }
    }
    return num
  }

  getEditedInTree(node, time = 0) {
    if (time === 0 || time < node.edited_ts) {
      time = node.edited_ts
    }
    for (let child of node.children.children) {
      time = this.getEditedInTree(child, time)
    }
    return time
  }

}