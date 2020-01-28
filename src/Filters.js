
import _ from 'lodash'
let moment = require('moment')
moment.locale(window.navigator.language)
let Sugar = require('sugar')



export class Filters {

  constructor({ dlInterface }) {
    this.dlInterface = dlInterface
  }

  item_content_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getContentFromNode(node))
      return regEx ? true : false
    } else {
      return this.dlInterface.getContentFromNode(node).includes(text)
    }
  }

  parent_content_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getContentFromNode(node.parent))
      return regEx ? true : false
    } else {
      return this.dlInterface.getContentFromNode(node.parent).includes(text)
    }
  }

  item_content_not_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getContentFromNode(node))
      return regEx ? false : true
    } else {
      return !this.dlInterface.getContentFromNode(node).includes(text)
    }
  }

  parent_content_not_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getContentFromNode(node.parent))
      return regEx ? false : true
    } else {
      return !this.dlInterface.getContentFromNode(node.parent).includes(text)
    }
  }
  item_note_content_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getNoteContentFromNode(node))
      return regEx ? true : false
    } else {
      return this.dlInterface.getNoteContentFromNode(node).includes(text)
    }
  }

  parent_note_content_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getNoteContentFromNode(node.parent))
      return regEx ? true : false
    } else {
      return this.dlInterface.getNoteContentFromNode(node.parent).includes(text)
    }
  }

  item_note_content_not_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getNoteContentFromNode(node))
      return regEx ? false : true
    } else {
      return !this.dlInterface.getNoteContentFromNode(node).includes(text)
    }
  }

  parent_note_content_not_contains(node, text) {
    if (text.includes('\*')) {
      let valForRegEx = _.replace(text, /\\\*/g, '(\\S)*')
      let regEx = new RegExp(valForRegEx, "i").exec(this.dlInterface.getNoteContentFromNode(node.parent))
      return regEx ? false : true
    } else {
      return !this.dlInterface.getNoteContentFromNode(node.parent).includes(text)
    }
  }

  item_is_checked(node, text) {
    if (node.get_meta_object().is_checked() && (text === '' || text === 'true')) {
      return true
    } else if (!node.get_meta_object().is_checked() && text === 'false') {
      return true
    }
    return false
  }

  parent_is_checked(node, text) {
    if (node.parent.get_meta_object().is_checked() && (text === '' || text === 'true')) {
      return true
    } else if (!node.parent.get_meta_object().is_checked() && text === 'false') {
      return true
    }
    return false
  }

  item_is_heading(node, values) {
    if (values == '' && node.get_meta_object().get_heading() > 0) {
      return true
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      for (let value of values) {
        if (parseInt(value) === node.get_meta_object().get_heading()) {
          return true
        }
      }
    } else {
      if (parseInt(values) === node.get_meta_object().get_heading()) {
        return true
      }
    }
  }

  parent_is_heading(node, values) {
    if (values == '' && node.parent.get_meta_object().get_heading() > 0) {
      return true
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      for (let value of values) {
        if (parseInt(value) === node.parent.get_meta_object().get_heading()) {
          return true
        }
      }
    } else {
      if (parseInt(values) === node.parent.get_meta_object().get_heading()) {
        return true
      }
    }
  }

  item_is_not_heading(node, values) {
    if (values == '' && node.get_meta_object().get_heading() > 0) {
      return false
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      let match = false
      for (let value of values) {
        if (parseInt(value) === node.get_meta_object().get_heading()) {
          match = true
        }
      }
      if (match) return false
      else return true
    } else {
      if (parseInt(values) !== node.get_meta_object().get_heading()) {
        return true
      }
    }
  }

  parent_is_not_heading(node, values) {
    if (values == '' && node.parent.get_meta_object().get_heading() > 0) {
      return false
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      let match = false
      for (let value of values) {
        if (parseInt(value) === node.parent.get_meta_object().get_heading()) {
          match = true
        }
      }
      if (match) return false
      else return true
    } else {
      if (parseInt(values) !== node.parent.get_meta_object().get_heading()) {
        return true
      }
    }
  }

  item_has_color(node, values) {
    if (values == '' && node.get_meta_object().get_color_label() > 0) {
      return true
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      for (let value of values) {
        if (parseInt(value) === node.get_meta_object().get_color_label()) {
          return true
        }
      }
    } else {
      if (parseInt(values) === node.get_meta_object().get_color_label()) {
        return true
      }
    }
  }

  parent_has_color(node, values) {
    if (values == '' && node.parent.get_meta_object().get_color_label() > 0) {
      return true
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      for (let value of values) {
        if (parseInt(value) === node.parent.get_meta_object().get_color_label()) {
          return true
        }
      }
    } else {
      if (parseInt(values) === node.parent.get_meta_object().get_color_label()) {
        return true
      }
    }
  }

  item_has_not_color(node, values) {
    if (values == '' && node.get_meta_object().get_color_label() > 0) {
      return false
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      let match = false
      for (let value of values) {
        if (parseInt(value) === node.get_meta_object().get_color_label()) {
          match = true
        }
      }
      if (match) return false
      else return true
    } else {
      if (parseInt(values) !== node.get_meta_object().get_color_label()) {
        return true
      }
    }
  }

  parent_has_not_color(node, values) {
    if (values == '' && node.parent.get_meta_object().get_color_label() > 0) {
      return false
    } else if (values.includes(',')) {
      values = values.replace(/\s/g, '').split(',')
      let match = false
      for (let value of values) {
        if (parseInt(value) === node.parent.get_meta_object().get_color_label()) {
          match = true
        }
      }
      if (match) return false
      else return true
    } else {
      if (parseInt(values) !== node.parent.get_meta_object().get_color_label()) {
        return true
      }
    }
  }

  item_has_note(node, text) {
    if (node.get_meta_object().get_note() && (text === '' || text === 'true')) {
      return true
    } else if (!node.get_meta_object().get_note() && text === 'false') {
      return true
    }
    return false
  }

  parent_has_note(node, text) {
    if (node.parent.get_meta_object().get_note() && (text === '' || text === 'true')) {
      return true
    } else if (!node.parent.get_meta_object().get_note() && text === 'false') {
      return true
    }
    return false
  }

  item_with_children(node, text) {
    if (node.has_children() && (text === '' || text === 'true')) {
      return true
    }
    return false
  }

  parent_with_children(node, text) {
    if (node.parent.has_children() && (text === '' || text === 'true')) {
      return true
    }
    return false
  }

  item_without_children(node, text) {
    if (!node.has_children() && (text === '' || text === 'true')) {
      return true
    }
    return false
  }

  parent_without_children(node, text) {
    if (!node.parent.has_children() && (text === '' || text === 'true')) {
      return true
    }
    return false
  }

  item_with_all_children_checked(node, text) {
    if (node.has_children() && (text === '' || text === 'true')) {
      for (let child of node.children.children) {
        if (!child.get_meta_object().is_checked()) {
          return false
        }
      }
      return true
    }
    return false
  }

  parent_with_all_children_checked(node, text) {
    if (node.parent.has_children() && (text === '' || text === 'true')) {
      for (let child of node.parent.children.children) {
        if (!child.get_meta_object().is_checked()) {
          return false
        }
      }
      return true
    }
    return false
  }

  item_with_one_or_more_children_unchecked(node, text) {
    if (node.has_children() && (text === '' || text === 'true')) {
      for (let child of node.children.children) {
        if (!child.get_meta_object().is_checked()) {
          return true
        }
      }
      return false
    }
    return false
  }

  parent_with_one_or_more_children_unchecked(node, text) {
    if (node.parent.has_children() && (text === '' || text === 'true')) {
      for (let child of node.parent.children.children) {
        if (!child.get_meta_object().is_checked()) {
          return true
        }
      }
      return false
    }
    return false
  }

  item_is_collapsed(node, text) {
    if (node.is_collapsed() && (text === '' || text === 'true')) {
      return true
    } else if (!node.is_collapsed() && text === 'false') {
      return true
    }
    return false
  }

  parent_is_collapsed(node, text) {
    if (node.parent.is_collapsed() && (text === '' || text === 'true')) {
      return true
    } else if (!node.parent.is_collapsed() && text === 'false') {
      return true
    }
    return false
  }

  item_is_empty(node, text) {
    if (this.dlInterface.getContentFromNode(node).length === 0 && (text === '' || text === 'true')) {
      return true
    } else if (this.dlInterface.getContentFromNode(node).length > 0 && text === 'false') {
      return true
    }
    return false
  }

  parent_is_empty(node, text) {
    if (this.dlInterface.getContentFromNode(node.parent).length === 0 && (text === '' || text === 'true')) {
      return true
    } else if (this.dlInterface.getContentFromNode(node.parent).length > 0 && text === 'false') {
      return true
    }
    return false
  }

  item_has_date(node, text) {
    let contentParseTree = node.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      if (text === '' || text === 'true') {
        return true
      } else if (text === 'false') {
        return false
      }
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isSame(dateProvided)) {
        return true
      } else if (text === 'today' && dateFromNode.isSame(dateProvided, 'day')) {
        return true
      }
    }
    if (!time && text === 'false') {
      return true
    }
    return false
  }

  parent_has_date(node, text) {
    let contentParseTree = node.parent.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      if (text === '' || text === 'true') {
        return true
      } else if (text === 'false') {
        return false
      }
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isSame(dateProvided)) {
        return true
      } else if (text === 'today' && dateFromNode.isSame(dateProvided, 'day')) {
        return true
      }
    }
    if (!time && text === 'false') {
      return true
    }
    return false
  }

  item_has_date_before(node, text) {
    let contentParseTree = node.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isBefore(dateProvided)) {
        return true
      }
    }
    return false
  }

  parent_has_date_before(node, text) {
    let contentParseTree = node.parent.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isBefore(dateProvided)) {
        return true
      }
    }
    return false
  }

  item_has_date_after(node, text) {
    let contentParseTree = node.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isAfter(dateProvided)) {
        return true
      }
    }
    return false
  }

  parent_has_date_after(node, text) {
    let contentParseTree = node.parent.get_content_parse_tree()
    let time = null
    contentParseTree.traverse(function (fragment) {
      if (fragment['time']) {
        return time = fragment['time']
      }
    })
    if (time) {
      let dateProvided = moment(Sugar.Date(text).raw)
      let dateFromNode = moment(time)
      if (dateFromNode.isAfter(dateProvided)) {
        return true
      }
    }
    return false
  }

}