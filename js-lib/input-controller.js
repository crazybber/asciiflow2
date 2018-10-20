import * as c from './constants.js';
import Controller from './controller.js';
import Vector from './vector.js';

/**
 * Handles desktop inputs, and passes them onto the main controller.
 */
export class DesktopController {
  /**
   * @param {Controller} controller
   */
  constructor(controller) {
    /** @type {Controller} */ this.controller = controller;
    /** @type {boolean} */ this.isDragging = false;

    this.installBindings();
  }

  /**
   * @param {number} delta
   */
  handleZoom(delta) {
    let newzoom = this.controller.view.zoom * Math.pow(0.9, delta);
    // Limit to +-16 deltas from default.
    newzoom = Math.max(Math.min(newzoom, 5.396595277354286), 0.18530201888518424);
    this.controller.view.setZoom(newzoom);
  }

  /**
   * Installs input bindings associated with keyboard controls.
   */
  installBindings() {
    var canvas = this.controller.view.canvas;
    canvas.addEventListener("wheel", e => {
      this.handleZoom(e.deltaMode === 0 ? e.deltaY / 120 : Math.sign(e.deltaY));
    });

    canvas.addEventListener('mousedown', (/** @type {MouseEvent} */ e) => {
      // Can drag by holding either the control or meta (Apple) key.
      if (e.ctrlKey || e.metaKey) {
        this.controller.startDrag(Vector.fromMouseEvent(e));
      } else {
        this.controller.startDraw(Vector.fromMouseEvent(e));
      }
    });

    // Pass these events through to the main controller.
    canvas.addEventListener('mouseup', e => {
      this.controller.endAll();
    });

    canvas.addEventListener('mouseleave', e => {
      this.controller.endAll();
    });

    canvas.addEventListener('mousemove', (/** @type {MouseEvent} */ e) => {
      this.controller.handleMove(Vector.fromMouseEvent(e));
    });
  }
}

/**
 * Handles touch inputs, and passes them onto the main controller.
 */
export class TouchController {
  /**
   * @param {Controller} controller
   */
  constructor(controller) {
    /** @type {Controller} */ this.controller = controller;

    /** @type {Vector} */ this.pressVector;

    /** @type {number} */ this.originalZoom;
    /** @type {number} */ this.zoomLength;

    /** @type {number} */ this.pressTimestamp;
    /** @type {boolean} */ this.dragStarted = false;
    /** @type {boolean} */ this.zoomStarted = false;

    this.installBindings();
  }

  /**
   * @param {Vector} position
   */
  handlePress(position) {
    this.pressVector = position;
    this.pressTimestamp = Date.now();
    this.dragStarted = false;

    // If a drag or zoom didn't start and if we didn't release already, then handle it as a draw.
    window.setTimeout(() => {
      if (!this.dragStarted && !this.zoomStarted && this.pressVector != null) {
        this.controller.startDraw(position);
      }
    }, c.DRAG_LATENCY);
  }

  /**
   * The multi-touch version of handlePress.
   * @param {Vector} positionOne
   * @param {Vector} positionTwo
   */
  handlePressMulti(positionOne, positionTwo) {
    // A second finger as been placed, cancel whatever we were doing.
    this.controller.endAll();
    this.zoomStarted = true;
    this.dragStarted = false;
    this.zoomLength = positionOne.subtract(positionTwo).length();
    this.originalZoom = this.controller.view.zoom;
  }

  /**
   * @param {Vector} position
   */
  handleMove(position) {
    // Initiate a drag if we have moved enough, quickly enough.
    if (!this.dragStarted &&
      (Date.now() - this.pressTimestamp) < c.DRAG_LATENCY &&
      position.subtract(this.pressVector).length() > c.DRAG_ACCURACY
    ) {
      this.dragStarted = true;
      this.controller.startDrag(position);
    }
    // Pass on the event.
    this.controller.handleMove(position);
  }

  /**
   * The multi-touch version of handleMove, effectively only deals with zooming.
   * @param {Vector} positionOne
   * @param {Vector} positionTwo
   */
  handleMoveMulti(positionOne, positionTwo) {
    if (this.zoomStarted) {
      var newZoom = this.originalZoom *
        positionOne.subtract(positionTwo).length() / this.zoomLength;
      newZoom = Math.max(Math.min(newZoom, 5), 0.5);
      this.controller.view.setZoom(newZoom);
    }
  }

  /**
   * Ends all current actions, cleans up any state.
   */
  reset() {
    this.dragStarted = false;
    this.zoomStarted = false;
    this.pressVector = null;
  }

  /**
   * Installs input bindings associated with touch controls.
   */
  installBindings() {
    var canvas = this.controller.view.canvas;

    canvas.addEventListener('touchstart', (/** @type {TouchEvent} */ e) => {
      e.preventDefault();
      if (e.touches.length == 1) {
        this.handlePress(Vector.fromTouchEvent(e));
      } else if (e.touches.length > 1) {
        this.handlePressMulti(
          Vector.fromTouchEvent(e, 0),
          Vector.fromTouchEvent(e, 1));
      }
    });

    canvas.addEventListener('touchmove', (/** @type {TouchEvent} */ e) => {
      e.preventDefault();
      if (e.touches.length == 1) {
        this.handleMove(Vector.fromTouchEvent(e));
      } else if (e.touches.length > 1) {
        this.handleMoveMulti(
          Vector.fromTouchEvent(e, 0),
          Vector.fromTouchEvent(e, 1));
      }
    });

    // Pass through, no special handling.
    canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.reset();
      this.controller.endAll();
    });
  }
}
