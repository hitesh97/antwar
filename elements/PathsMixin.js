'use strict';
var React = require('react');

var paths = require('../paths');
var _ = require('lodash');
var config = require('config');


module.exports = {
  contextTypes: {
    router: React.PropTypes.func
  },

  getAllItems: function () {
    return paths.allItems();
  },
  getSection: function () {
    return config.paths[this.getSectionName()];
  },
  getSectionTitle: function () {
    return this.getSection().title;
  },
  getSectionName: function () {
    let routes = this.context.router.getCurrentRoutes();
    return this.getItem().section || routes && routes[1] && routes[1].name;
  },
  getSectionItems: function () {
    let section = this.getSectionName();
    return _.filter(this.getAllItems(), function (item) {
      return item.section == section;
    })
  },
  getItem: function() {
    let router = this.context.router;
    let params = router.getCurrentParams();
    let item = params.item;
    let splat = params.splat;

    if(splat) {
      return this.getItemForPath(splat + '/' + item);
    }

    return this.getItemForPath(item ? item : '/index');
  },
  getItemForPath: function(path) {
    return paths.itemForPath(path);
  },
  // TODO: rename as getItemTitle?
  getPageTitle: function() {
    let item = this.getItem();

    if(item && item.title) {
      return item.title;
    }

    let router = this.context.router;
    let routes = router.getCurrentRoutes();

    let routeName = routes[routes.length - 1].name;

    if(routeName) {
      return routeName.replace('/', '');
    }

    return '';
  },
};
