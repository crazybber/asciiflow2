import DrawFunction from "./function.js";
import {ERASE_CHAR} from "../constants.js";
import State from "../state.js";
import Vector from "../vector.js";

/**
 * @implements {DrawFunction}
 */
export default class DrawErase {
  /**
   * @param {State} state
   */
  constructor(state) {
    this.state = state;
    this.startPosition = null;
    this.endPosition = null;
  }

  /** @inheritDoc */
  start(position) {
    this.startPosition = position;
    this.move(position);
  }

  /** @inheritDoc */
  move(position) {
    this.state.clearDraw();
    this.endPosition = position;

    const startX = Math.min(this.startPosition.x, this.endPosition.x);
    const startY = Math.min(this.startPosition.y, this.endPosition.y);
    const endX = Math.max(this.startPosition.x, this.endPosition.x);
    const endY = Math.max(this.startPosition.y, this.endPosition.y);

    for (let i = startX; i <= endX; i++) {
      for (let j = startY; j <= endY; j++) {
        this.state.drawValue(new Vector(i, j), ERASE_CHAR);
      }
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
