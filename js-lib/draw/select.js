import {DrawFunction} from "./function.js";
import {ERASE_CHAR, KEY_COPY, KEY_CUT, KEY_PASTE} from "../constants.js";
import {Vector} from "../vector.js";
import {State} from "../state.js";
import {MappedValue, Box} from "../common.js";
import {DrawErase} from "./erase.js";

/**
 * @implements {DrawFunction}
 */
export class DrawSelect {
  /**
   * @param {!State} state
   */
  constructor(state) {
    this.state = state;

    /** @type {?Vector} */
    this.startPosition = null;

    /** @type {?Vector} */
    this.endPosition = null;

    /** @type {?Vector} */
    this.dragStart = null;

    /** @type {?Vector} */
    this.dragEnd = null;

    /** @type {boolean} */
    this.finished = true;

    /** @type {!Array<!MappedValue>} */
    this.selectedCells = [];
  }

  /** @inheritDoc */
  start(position) {
    // Must be dragging.
    if (this.startPosition !== null &&
      this.endPosition !== null &&
      new Box(this.startPosition, this.endPosition).contains(position)
    ) {
      this.dragStart = position;
      this.copyArea(this.startPosition, this.endPosition);
      this.dragMove(position, this.dragStart);
    } else {
      this.startPosition = position;
      this.endPosition = null;
      this.finished = false;
      this.move(position);
    }
  }

  copyArea(startPosition, endPosition) {
    const nonEmptyCells = this.state.scratchCells.filter(value => {
      const rawValue = value.cell.getRawValue();
      return rawValue !== null && rawValue !== ERASE_CHAR;
    });
    const topLeft = new Box(startPosition, endPosition).topLeft();
    this.selectedCells = nonEmptyCells.map(
      value => new MappedValue(value.position.subtract(topLeft), value.cell.getRawValue())
    );
  }

  /** @inheritDoc */
  move(position) {
    if (this.dragStart !== null) {
      this.dragMove(position, this.dragStart);
      return;
    }

    if (this.finished) {
      return;
    }
    this.endPosition = position;
    this.state.clearDraw();

    const box = new Box(this.startPosition, position);

    for (let i = box.startX; i <= box.endX; i++) {
      for (let j = box.startY; j <= box.endY; j++) {
        const current = new Vector(i, j);
        // Effectively highlights the cell.
        const currentValue = this.state.getCell(current).getRawValue();
        this.state.drawValue(current,
          currentValue === null ? ERASE_CHAR : currentValue);
      }
    }
  }

  dragMove(position, dragStart) {
    this.dragEnd = position;
    this.state.clearDraw();
    const eraser = new DrawErase(this.state);
    eraser.start(this.startPosition);
    eraser.move(this.endPosition);
    const startPos = this.dragEnd.subtract(dragStart).add(
      new Box(this.startPosition, this.endPosition).topLeft()
    );
    this.drawSelected(startPos);
  }

  drawSelected(startPos) {
    for (const {position, value} of this.selectedCells) {
      this.state.drawValue(position.add(startPos), value);
    }
  }

  /** @inheritDoc */
  end() {
    if (this.dragStart !== null) {
      this.state.commitDraw();
      this.startPosition = null;
      this.endPosition = null;
    }
    this.dragStart = null;
    this.dragEnd = null;
    this.finished = true;
  }

  /** @inheritDoc */
  getCursor(position) {
    if (this.startPosition !== null &&
      this.endPosition !== null &&
      new Box(this.startPosition, this.endPosition).contains(position)
    ) {
      return "pointer";
    }
    return "default";
  }

  /** @inheritDoc */
  handleKey(value) {
    if (this.startPosition !== null && this.endPosition !== null) {
      if (value === KEY_COPY || value === KEY_CUT) {
        this.copyArea(this.startPosition, this.endPosition);
      }
      if (value === KEY_CUT) {
        const eraser = new DrawErase(this.state);
        eraser.start(this.startPosition);
        eraser.move(this.endPosition);
        this.state.commitDraw();
      }
    }
    if (value === KEY_PASTE) {
      this.drawSelected(this.startPosition);
      this.state.commitDraw();
    }
  }
}
