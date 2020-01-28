import { jsPanel } from 'jspanel4'

/* jspanel.tooltip.js (c) Stefan Sträßer(Flyer53) <info@jspanel.de> license: MIT */
/* global jsPanel */
'use strict';

// TODO: autoreposition tooltip after creation if it intersects window boundaries

if (!jsPanel.tooltip) {

  jsPanel.tooltip = {

    version: '1.0.0',
    date: '2018-03-13 09:40',

    defaults: {
      //position: is set in jsPanel.tooltip.create()
      border: '1px solid',
      dragit: false,
      resizeit: false,
      headerControls: 'none',
      delay: 400,
      ttipEvent: 'mouseover'
    },

    create(options = {}, callback) {

      options.paneltype = 'tooltip';
      if (!options.id) {
        options.id = `jsPanel-${jsPanel.idCounter += 1}`;
      } else if (typeof options.id === 'function') {
        options.id = options.id();
      }
      let target = options.target,
        mode = options.mode || 'default',
        timer;

      if (!target) {
        return false;
      }

      if (typeof target === 'string') {
        target = document.querySelector(target);
      }

      // don't close tooltip ot contextmenu on mousedown in target
      target.addEventListener(jsPanel.evtStart, e => {
        e.stopPropagation();
      }, false);

      let opts = options;
      if (options.config) {
        opts = Object.assign({}, options.config, options);
        delete opts.config;
      }
      opts = Object.assign({}, this.defaults, opts);
      opts.position = Object.assign({}, options.position);
      opts.position.of = options.position.of || target;

      target.addEventListener(opts.ttipEvent, () => {

        timer = window.setTimeout(function () {

          // do nothing if id already exsists in document
          if (document.getElementById(options.id)) {
            return false;
          }

          jsPanel.create(opts, tooltip => {
            // by default tooltip will close when mouse leaves trigger
            if (mode === 'default') {
              target.addEventListener('mouseleave', () => {
                tooltip.close();
              }, false);
            } else if (mode === 'semisticky') {
              // close tooltip when mouse leaves tooltip
              tooltip.addEventListener('mouseleave', () => {
                tooltip.close();
              }, false);
            }
            // some more tooltip specifics

            tooltip.classList.add('jsPanel-tooltip');
            tooltip.style.overflow = 'visible';
            tooltip.header.style.cursor = 'default';
            tooltip.footer.style.cursor = 'default';

            // check whether contextmenu is triggered from within a modal panel or panel and if so update z-index
            if (target.closest('.jsPanel-modal')) {
              tooltip.style.zIndex = target.closest('.jsPanel-modal').style.zIndex;
            } else {
              if (target.closest('.jsPanel')) {
                target.closest('.jsPanel').front();
              }
              tooltip.style.zIndex = jsPanel.zi.next();
            }

            // do not use 'click' instead of jsPanel.evtStart
            tooltip.addEventListener(jsPanel.evtStart, function (e) {
              e.stopPropagation();
            }, false);

            // add tooltip connector
            if (opts.connector) {
              let oPof = typeof opts.position.of === 'string' ? document.querySelector(opts.position.of) : opts.position.of,
                tipPos = jsPanel.tooltip.relativeTipPos(tooltip, oPof);
              tooltip.append(jsPanel.tooltip.addConnector(tooltip, tipPos));
            }

            if (callback) {
              callback.call(tooltip, tooltip);
            }


          });

        }, opts.delay);

      }, false);

      // do not create tooltip if mouse leaves target before delay elapsed
      target.addEventListener('mouseout', () => {
        window.clearTimeout(timer);
      }, false);

    },

    relativeTipPos(tip, positionof) {
      // returns the basic position of the tooltip relative to option.position.of (top, right, right-bottom etc.)
      let tipRect = tip.getBoundingClientRect(),
        pofRect = positionof.getBoundingClientRect(),
        deltaLeft = Math.round(pofRect.left - tipRect.right),
        deltaTop = Math.round(pofRect.top - tipRect.bottom),
        deltaRight = Math.round(tipRect.left - pofRect.right),
        deltaBottom = Math.round(tipRect.top - pofRect.bottom),
        relativePosition;

      if (deltaTop >= 0) {
        if (deltaLeft >= 0) { relativePosition = 'left-top'; }
        else if (deltaRight >= 0) { relativePosition = 'right-top'; }
        else { relativePosition = 'top'; }
      } else if (deltaBottom >= 0) {
        if (deltaLeft >= 0) { relativePosition = 'left-bottom'; }
        else if (deltaRight >= 0) { relativePosition = 'right-bottom'; }
        else { relativePosition = 'bottom'; }
      } else if (deltaLeft >= 0) {
        relativePosition = 'left';
      } else if (deltaRight >= 0) {
        relativePosition = 'right';
      } else {
        relativePosition = 'over';
      }

      return relativePosition;
    },

    addConnector(tip, relposition) {
      let left, top, connCSS, connBg,
        conn = document.createElement('div');
      conn.className = `jsPanel-connector jsPanel-connector-${relposition}`;

      // rest of tooltip positioning is in jspanel.sass
      if (relposition === 'top') {
        tip.style.top = (parseFloat(tip.style.top) - 12) + 'px';
      } else if (relposition === 'right') {
        tip.style.left = (parseFloat(tip.style.left) + 12) + 'px';
      } else if (relposition === 'bottom') {
        tip.style.top = (parseFloat(tip.style.top) + 12) + 'px';
      } else if (relposition === 'left') {
        tip.style.left = (parseFloat(tip.style.left) - 12) + 'px';
      }

      if (typeof tip.options.connector === 'string') {
        connBg = tip.options.connector;
      } else {
        connBg = window.getComputedStyle(tip).borderBottomColor;
      }

      if (relposition.match(/-/)) {
        connCSS = {
          left: left,
          top: top,
          backgroundColor: connBg
        };
      } else {
        connCSS = {
          left: left,
          top: top,
          [`border-${relposition}-color`]: connBg
        };
      }

      jsPanel.setStyle(conn, connCSS);

      return conn;
    },

    removeConnector(tip) {
      const conn = tip.querySelector('.jsPanel-connector');
      tip.removeChild(conn);
    }

  };

  // close tooltips on pointerdown in document
  document.addEventListener(jsPanel.pointerdown, function (e) {
    document.querySelectorAll('.jsPanel-tooltip').forEach(function (item) {
      if (!e.target.closest('.jsPanel-tooltip')) {
        item.close();
      }
    });
  }, false);

}