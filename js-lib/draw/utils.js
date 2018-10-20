import {SPECIAL_VALUE} from "../constants.js";
import {Box} from "../common.js";
import State from "../state.js";
import Vector from "../vector.js";

/**
 * Draws a line on the diagram state.
 *
 * @param {State} state
 * @param {Vector} startPosition
 * @param {Vector} endPosition
 * @param {boolean} clockwise
 * @param {string=} value
 */
export function drawLine(
  state, startPosition, endPosition, clockwise, value = SPECIAL_VALUE
) {
  const box = new Box(startPosition, endPosition);
  const {endX, endY} = box;

  const midX = clockwise ? endPosition.x : startPosition.x;
  const midY = clockwise ? startPosition.y : endPosition.y;

  for (let startX = box.startX; startX < endX; startX++) {
    const position = new Vector(startX, midY);
    const context = state.getContext(new Vector(startX, midY));
    // Don't erase any lines that we cross.
    if (value !== " " || context.up + context.down !== 2) {
      state.drawValueIncremental(position, value);
    }
  }
  for (let startY = box.startY; startY < endY; startY++) {
    const position = new Vector(midX, startY);
    const context = state.getContext(new Vector(midX, startY));
    // Don't erase any lines that we cross.
    if (value !== " " || context.left + context.right !== 2) {
      state.drawValueIncremental(position, value);
    }
  }

  state.drawValue(startPosition, value);
  state.drawValue(endPosition, value);
  state.drawValueIncremental(new Vector(midX, midY), value);
}

/**
 * Sets the cells scratch (uncommitted) values to the given text.
 * Handles newlines appropriately.
 * @param {State} state
 * @param {Vector} position
 * @param {string} text
 */
export function drawText(state, position, text) {
  let x = 0;
  let y = 0;
  for (const ch of text) {
    if (ch === "\n") {
      y += 1;
      x = 0;
      continue;
    }
    state.drawValue(position.add(new Vector(x, y)), ch);
    x += 1;
  }
}
