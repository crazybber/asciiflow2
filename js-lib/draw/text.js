import DrawFunction from "./function.js";
import {ERASE_CHAR} from "../constants.js";
import State from "../state.js";
import Vector from "../vector.js";
import {drawText} from "./utils.js";

/**
 * @implements {DrawFunction}
 */
export default class DrawText {
  /**
   * @param {State} state
   */
  constructor(state, view) {
    this.state = state;
    this.startPosition = null;
    this.endPosition = null;
  }

  /** @inheritDoc */
  start(position) {
    this.state.commitDraw();
    document.getElementById("text-tool-input").value = "";
    this.startPosition = position;

    // TODO: Not working yet, needs fixing so that it can
    // remove the underlying text completely.
    // this.loadExistingText(position);

    // Effectively highlights the starting cell.
    const currentValue = this.state.getCell(this.startPosition).getRawValue();
    this.state.drawValue(this.startPosition,
      currentValue === null ? ERASE_CHAR : currentValue);
  }

  /** @inheritDoc */
  move(position) {}

  /** @inheritDoc */
  end() {
    if (this.startPosition !== null) {
      this.endPosition = this.startPosition;
      this.startPosition = null;
      // Valid end click/press, show the textbox and focus it.
      document.getElementById("text-tool-widget").style.display = "none";
      setTimeout(() => {
        document.getElementById("text-tool-widget").style.display = "block";
        setTimeout(() => {
          document.getElementById("text-tool-input").focus();
        }, 0);
      }, 0);
    }
  }

  /** @inheritDoc */
  getCursor(position) {
    return "pointer";
  }

  /** @inheritDoc */
  handleKey(value) {
    const text = /** @type {string} */ document.getElementById("text-tool-input").value;
    this.state.clearDraw();
    drawText(this.state, this.endPosition, text);
  }

  /**
   * Loads any existing text if it is present.
   * TODO: This is horrible, and does not quite work, fix it.
   */
  loadExistingText(position) {
    let currentPosition = position.clone();
    let cell = this.state.getCell(position);
    let spacesCount = 0;
    // Go back to find the start of the line.
    while ((!cell.isSpecial() && cell.getRawValue() !== null) || spacesCount < 1) {
      if (cell.getRawValue() === null) {
        spacesCount += 1;
      } else if (!cell.isSpecial()) {
        spacesCount = 0;
      }
      currentPosition.x -= 1;
      cell = this.state.getCell(currentPosition);
    }
    this.startPosition = currentPosition.right(spacesCount + 1);
    let text = "";
    spacesCount = 0;
    currentPosition = this.startPosition.clone();
    // Go forward to load the text.
    while ((!cell.isSpecial() && cell.getRawValue() !== null) || spacesCount < 1) {
      cell = this.state.getCell(currentPosition);
      if (cell.getRawValue() === null) {
        spacesCount += 1;
        text += " ";
      } else if (!cell.isSpecial()) {
        spacesCount = 0;
        text += cell.getRawValue();
        this.state.drawValue(currentPosition, cell.getRawValue());
      }
      currentPosition.x += 1;
    }
    document.getElementById("text-tool-input").value = text.substr(0, text.length - 1);
  }
}
