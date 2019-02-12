import {DrawFunction} from "./function.js";
import {drawLine} from "./utils.js";
import {SPECIAL_ARROW_LEFT, SPECIAL_ARROW_UP, SPECIAL_ARROW_RIGHT, SPECIAL_ARROW_DOWN} from "../constants.js";
import {State} from "../state.js";
import {Vector} from "../vector.js";

/**
 * @implements {DrawFunction}
 */
export class DrawLine {
  /**
   * @param {!State} state
   * @param {boolean} isArrow
   */
  constructor(state, isArrow) {
    this.state = state;
    this.isArrow = isArrow;
    /** @type {?Vector} */ this.startPosition = null;
  }

  /** @inheritDoc */
  start(position) {
    this.startPosition = position;
  }

  /** @inheritDoc */
  move(position) {
    this.state.clearDraw();

    // Try to infer line orientation.
    // TODO: Split the line into two lines if we can't satisfy both ends.
    const startContext = this.state.getContext(this.startPosition);
    const endContext = this.state.getContext(position);
    const clockwise = (startContext.up && startContext.down) ||
      (endContext.left && endContext.right);

    drawLine(this.state, this.startPosition, position, clockwise);
    if (this.isArrow) {
      let endValue;

      if (endContext.up) {
        endValue = SPECIAL_ARROW_UP;
      } else if (endContext.down) {
        endValue = SPECIAL_ARROW_DOWN;
      } else if (endContext.left) {
        endValue = SPECIAL_ARROW_LEFT;
      } else {
        endValue = SPECIAL_ARROW_RIGHT;
      }

      this.state.drawValue(position, endValue);
    }
  }

  /** @inheritDoc */
  end() {
    this.state.commitDraw();
  }

  /** @inheritDoc */
  getCursor(position) {
    return "crosshair";
  }

  /** @inheritDoc */
  handleKey(value) {}
}
