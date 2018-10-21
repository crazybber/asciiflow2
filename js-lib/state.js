import {Vector} from "./vector.js";
import {Cell, MappedValue, MappedCell, CellContext, Box} from "./common.js";
import {
  ALT_SPECIAL_VALUES,
  ERASE_CHAR,
  MAX_GRID_HEIGHT,
  MAX_GRID_WIDTH,
  MAX_UNDO,
  SPECIAL_ARROW_DOWN,
  SPECIAL_ARROW_LEFT,
  SPECIAL_ARROW_RIGHT,
  SPECIAL_ARROW_UP,
  SPECIAL_LINE_H,
  SPECIAL_LINE_V,
  SPECIAL_VALUE,
  SPECIAL_VALUES,
} from "./constants.js";

/**
 * Holds the entire state of the diagram as a 2D array of cells
 * and provides methods to modify the current state.
 */
export class State {
  constructor() {
    /** @type {!Array<!Array<!Cell>>} */
    this.cells = new Array(MAX_GRID_WIDTH);

    /** @type {!Array<!MappedCell>} */
    this.scratchCells = [];

    /** @type {boolean} */
    this.dirty = true;

    /** @type {!Array<!Array<!MappedValue>>|!Iterable<!Iterable<!MappedValue>>} */
    this.undoStates = [];

    /** @type {!Array<!Array<!MappedValue>>|!Iterable<!Iterable<!MappedValue>>} */
    this.redoStates = [];

    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = new Array(MAX_GRID_HEIGHT);
      for (let j = 0; j < this.cells[i].length; j++) {
        this.cells[i][j] = new Cell();
      }
    }
  }

  /**
   * This clears the entire state, but is undoable.
   */
  clear() {
    for (let i = 0; i < this.cells.length; i++) {
      for (let j = 0; j < this.cells[i].length; j++) {
        if (this.cells[i][j].getRawValue() !== null) {
          this.drawValue(new Vector(i, j), ERASE_CHAR);
        }
      }
    }
    this.commitDraw();
  }

  /**
   * Returns the cell at the given coordinates.
   *
   * @param {!Vector} vector
   * @return {!Cell}
   */
  getCell(vector) {
    const cell = this.cells[vector.x][vector.y];
    if (cell === undefined || cell === null) {
      throw new Error("Cell not found");
    }
    return cell;
  }

  /**
   * Sets the cells scratch (uncommitted) value at the given position.
   *
   * @param {!Vector} position
   * @param {?string} value
   */
  drawValue(position, value) {
    const cell = this.getCell(position);
    this.scratchCells.push(new MappedCell(position, cell));
    cell.scratchValue = value;
    this.dirty = true;
  }

  /**
   * Sets the cells scratch (uncommitted) value at the given position
   * iff the value is different to what it already is.
   *
   * @param {!Vector} position
   * @param {?string} value
   */
  drawValueIncremental(position, value) {
    if (this.getCell(position).getRawValue() !== value) {
      this.drawValue(position, value);
    }
  }

  /**
   * Clears the current drawing scratchpad.
   */
  clearDraw() {
    for (const {cell} of this.scratchCells) {
      cell.scratchValue = null;
    }
    this.scratchCells.length = 0;
  }

  /**
   * Returns the draw value of a cell at the given position.
   *
   * @param {!Vector} position
   * @return {?string}
   */
  getDrawValue(position) {
    const cell = this.getCell(position);
    const value = cell.getRawValue();
    const isSpecial = SPECIAL_VALUES.includes(value);
    const isAltSpecial = ALT_SPECIAL_VALUES.includes(value);
    if (!isSpecial && !isAltSpecial) {
      return value;
    }

    // Because the underlying state only stores actual cell values and there is
    // no underlying representation of shapes, we do a lot of crazy logic here
    // to make diagrams display as expected.
    const context = this.getContext(position);

    if (isSpecial && context.left && context.right && !context.up && !context.down) {
      return SPECIAL_LINE_H;
    }
    if (isSpecial && !context.left && !context.right && context.up && context.down) {
      return SPECIAL_LINE_V;
    }
    if (context.sum() === 4) {
      return SPECIAL_LINE_H;
    }
    if (isAltSpecial && context.sum() === 3) {
      if (!context.left) {
        return SPECIAL_ARROW_LEFT;
      }
      if (!context.up) {
        return SPECIAL_ARROW_UP;
      }
      if (!context.down) {
        return SPECIAL_ARROW_DOWN;
      }
      if (!context.right) {
        return SPECIAL_ARROW_RIGHT;
      }
    }
    if ((isSpecial || isAltSpecial) && context.sum() === 3) {
      this.extendContext(position, context);
      if (!context.right && context.leftup && context.leftdown) {
        return SPECIAL_LINE_V;
      }
      if (!context.left && context.rightup && context.rightdown) {
        return SPECIAL_LINE_V;
      }
      if (!context.down && context.leftup && context.rightup) {
        return SPECIAL_LINE_H;
      }
      if (!context.up && context.rightdown && context.leftdown) {
        return SPECIAL_LINE_H;
      }
      const leftupempty = this.getCell(position.left().up()).isEmpty();
      const rightupempty = this.getCell(position.right().up()).isEmpty();
      if (context.up && context.left && context.right && (!leftupempty || !rightupempty)) {
        return SPECIAL_LINE_H;
      }
      const leftdownempty = this.getCell(position.left().down()).isEmpty();
      const rightdownempty = this.getCell(position.right().down()).isEmpty();
      if (context.down && context.left && context.right && (!leftdownempty || !rightdownempty)) {
        return SPECIAL_LINE_H;
      }
      return SPECIAL_VALUE;
    }

    if (isAltSpecial && context.sum() === 1) {
      if (context.left) {
        return SPECIAL_ARROW_RIGHT;
      }
      if (context.up) {
        return SPECIAL_ARROW_DOWN;
      }
      if (context.down) {
        return SPECIAL_ARROW_UP;
      }
      if (context.right) {
        return SPECIAL_ARROW_LEFT;
      }
    }
    return value;
  }

  /**
   * @param {!Vector} position
   * @return {!CellContext}
   */
  getContext(position) {
    const left = this.getCell(position.left()).isSpecial();
    const right = this.getCell(position.right()).isSpecial();
    const up = this.getCell(position.up()).isSpecial();
    const down = this.getCell(position.down()).isSpecial();
    return new CellContext(left, right, up, down);
  }

  /**
   * @param {!Vector} position
   * @param {!CellContext} context
   */
  extendContext(position, context) {
    context.leftup = this.getCell(position.left().up()).isSpecial();
    context.rightup = this.getCell(position.right().up()).isSpecial();
    context.leftdown = this.getCell(position.left().down()).isSpecial();
    context.rightdown = this.getCell(position.right().down()).isSpecial();
  }

  /**
   * Ends the current draw, commiting anything currently drawn the scratchpad.
   * @param {boolean=} opt_undo
   */
  commitDraw(opt_undo) {
    const oldValues = [];

    // Dedupe the scratch values, or this causes havoc for history management.
    const positions = this.scratchCells.map(
      value => value.position.x.toString() + value.position.y.toString()
    );
    const scratchCellsUnique = this.scratchCells.filter(
      (value, index, arr) => positions.indexOf(positions[index]) === index
    );

    this.scratchCells.length = 0;

    for (const {position, cell} of scratchCellsUnique) {
      // Push the effective old value unto the array.
      oldValues.push(new MappedValue(position,
        cell.value === null ? " " : cell.value));

      let newValue = cell.getRawValue();
      if (newValue === ERASE_CHAR || newValue === " ") {
        newValue = null;
      }
      // Let's store the actual drawed value, so behaviour matches what the user sees.
      if (cell.isSpecial()) {
        newValue = this.getDrawValue(position);
      }
      cell.scratchValue = null;
      cell.value = newValue;
    }

    const stateStack = opt_undo ? this.redoStates : this.undoStates;
    if (oldValues.length > 0) {
      // If we have too many states, clear one out.
      if (stateStack.length > MAX_UNDO) {
        stateStack.shift();
      }
      stateStack.push(oldValues);
    }
    this.dirty = true;
  }

  /**
   * Undoes the last committed state.
   */
  undo() {
    if (this.undoStates.length === 0) {
      return;
    }

    const lastState = this.undoStates.pop();
    for (const {position, value} of lastState) {
      this.drawValue(position, value);
    }
    this.commitDraw(true);
  }

  /**
   * Redoes the last undone.
   */
  redo() {
    if (this.redoStates.length === 0) {
      return;
    }

    const lastState = this.redoStates.pop();
    for (const {position, value} of lastState) {
      this.drawValue(position, value);
    }
    this.commitDraw();
  }

  /**
   * Outputs the entire contents of the diagram as text.
   * @param {?Box=} opt_box
   * @return {string}
   */
  outputText(opt_box) {
    // Find the first/last cells in the diagram so we don't output everything.
    let start = new Vector(Number.MAX_VALUE, Number.MAX_VALUE);
    let end = new Vector(-1, -1);

    if (opt_box) {
      start = opt_box.topLeft();
      end = opt_box.bottomRight();
    } else {
      for (let i = 0; i < this.cells.length; i++) {
        for (let j = 0; j < this.cells[i].length; j++) {
          if (this.cells[i][j].getRawValue() !== null) {
            if (i < start.x) {
              start.x = i;
            }
            if (j < start.y) {
              start.y = j;
            }
            if (i > end.x) {
              end.x = i;
            }
            if (j > end.y) {
              end.y = j;
            }
          }
        }
      }
      if (end.x < 0) {
        return "";
      }
    }

    let output = "";
    for (let j = start.y; j <= end.y; j++) {
      let line = "";
      for (let i = start.x; i <= end.x; i++) {
        const val = this.getDrawValue(new Vector(i, j));
        line += val === null || val === ERASE_CHAR ? " " : val;
      }
      // Trim end whitespace.
      output += line.replace(/\s+$/, "");
      output += "\n";
    }
    return output;
  }

  /**
   * Loads the given text into the diagram starting at the given offset (centered).
   * @param {string} value
   * @param {!Vector} offset
   */
  fromText(value, offset) {
    const lines = value.split("\n");
    const middle = new Vector(0, Math.round(lines.length / 2));
    for (let j = 0; j < lines.length; j++) {
      middle.x = Math.max(middle.x, Math.round(lines[j].length / 2));
    }
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      for (let i = 0; i < line.length; i++) {
        let ch = line.charAt(i);
        // Convert special output back to special chars.
        // TODO: This is a horrible hack, need to handle multiple special chars
        // correctly and preserve them through line drawing etc.
        if (SPECIAL_VALUES.includes(ch)) {
          ch = SPECIAL_VALUE;
        }
        this.drawValue(new Vector(i, j).add(offset).subtract(middle), ch);
      }
    }
  }
}
