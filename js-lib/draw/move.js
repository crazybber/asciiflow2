import {DrawFunction} from "./function.js";
import {drawLine} from "./utils.js";
import {State} from "../state.js";
import {Vector} from "../vector.js";
import * as c from "../constants.js";

/**
 * @implements {DrawFunction}
 */
export class DrawMove {
  /**
   * @param {!State} state
   */
  constructor(state) {
    this.state = state;

    /** @type {?Vector} */ this.startPosition = null;

    /** @type {!Array<{position, clockwise, startIsAlt, midPointIsAlt, endIsAlt}>} */
    this.ends = [];
  }

  /** @inheritDoc */
  start(position) {
    this.startPosition =
      c.TOUCH_ENABLED ? this.snapToNearest(position) : position;
    this.ends = [];

    // If this isn't a special cell then quit, or things get weird.
    if (!this.state.getCell(this.startPosition).isSpecial()) {
      return;
    }

    const ends = [];
    for (const i of c.DIRECTIONS) {
      const midPoints = this.followLine(this.startPosition, i);
      for (const midPoint of midPoints) {
        // Clockwise is a lie, it is true if we move vertically first.
        const clockwise = i.x !== 0;
        const startIsAlt = c.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(position).getRawValue()) !== -1;
        const midPointIsAlt = c.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(midPoint).getRawValue()) !== -1;

        const midPointContext = this.state.getContext(midPoint);
        // Special case, a straight line with no turns.
        if (midPointContext.sum() === 1) {
          ends.push({position: midPoint, clockwise, startIsAlt, endIsAlt: midPointIsAlt});
          continue;
        }
        // Continue following lines from the midpoint.
        for (const j of c.DIRECTIONS) {
          if (i.add(j).length() === 0 || i.add(j).length() === 2) {
            // Don't go back on ourselves, or don't carry on in same direction.
            continue;
          }
          const secondEnds = this.followLine(midPoint, j);
          // Ignore any directions that didn't go anywhere.
          if (secondEnds.length === 0) {
            continue;
          }
          const [secondEnd] = secondEnds;
          const endIsAlt = c.ALT_SPECIAL_VALUES.indexOf(this.state.getCell(secondEnd).getRawValue()) !== -1;
          // On the second line we don't care about multiple
          // junctions, just the last.
          ends.push({position: secondEnd, clockwise, startIsAlt, midPointIsAlt, endIsAlt});
        }
      }
    }
    this.ends = ends;
    // Redraw the new lines after we have cleared the existing ones.
    this.move(this.startPosition);
  }

  /** @inheritDoc */
  move(position) {
    this.state.clearDraw();
    // Clear all the lines so we can draw them afresh.
    for (const end of this.ends) {
      drawLine(this.state, this.startPosition, end.position, end.clockwise, " ");
    }
    for (const end of this.ends) {
      drawLine(this.state, position, end.position, end.clockwise);
    }
    for (const end of this.ends) {
      // If the ends or midpoint of the line was a alt character (arrow), need to preserve that.
      if (end.startIsAlt) {
        this.state.drawValue(position, c.ALT_SPECIAL_VALUE);
      }
      if (end.endIsAlt) {
        this.state.drawValue(end.position, c.ALT_SPECIAL_VALUE);
      }
      if (end.midPointIsAlt) {
        const midX = end.clockwise ? end.position.x : position.x;
        const midY = end.clockwise ? position.y : end.position.y;
        this.state.drawValue(new Vector(midX, midY), c.ALT_SPECIAL_VALUE);
      }
    }
  }

  /** @inheritDoc */
  end() {
    this.state.commitDraw();
  }

  /**
   * Follows a line in a given direction from the startPosition.
   * Returns a list of positions that were line 'junctions'. This is a bit of a
   * loose definition, but basically means a point around which we resize things.
   * @param {!Vector} startPosition
   * @param {!Vector} direction
   * @return {!Array<!Vector>}
   */
  followLine(startPosition, direction) {
    let endPosition = startPosition.clone();
    const junctions = [];
    while (true) {
      const nextEnd = endPosition.add(direction);
      if (!this.state.getCell(nextEnd).isSpecial()) {
        // Junctions: Right angles and end T-Junctions.
        if (!startPosition.equals(endPosition)) {
          junctions.push(endPosition);
        }
        return junctions;
      }

      endPosition = nextEnd;
      const context = this.state.getContext(endPosition);
      // Junctions: Side T-Junctions.
      if (context.sum() === 3) {
        junctions.push(endPosition);
      }
    }
  }

  /**
   * For a given position, finds the nearest cell that is of any interest to the
   * move tool, e.g. a corner or a line. Will look up to 1 cell in each direction
   * including diagonally.
   * @param {!Vector} position
   * @return {!Vector}
   */
  snapToNearest(position) {
    if (this.state.getCell(position).isSpecial()) {
      return position;
    }
    const allDirections = c.DIRECTIONS.concat([
      c.DIR_LEFT.add(c.DIR_UP),
      c.DIR_LEFT.add(c.DIR_DOWN),
      c.DIR_RIGHT.add(c.DIR_UP),
      c.DIR_RIGHT.add(c.DIR_DOWN),
    ]);

    let bestDirection = null;
    let bestContextSum = 0;
    for (const direction of allDirections) {
      // Find the most connected cell, essentially.
      const newPos = position.add(direction);
      const contextSum = this.state.getContext(newPos).sum();
      if (this.state.getCell(newPos).isSpecial() &&
        contextSum > bestContextSum
      ) {
        bestDirection = direction;
        bestContextSum = contextSum;
      }
    }
    if (bestDirection === null) {
      // Didn't find anything, so just return the current cell.
      return position;
    }
    return position.add(bestDirection);
  }

  /** @inheritDoc */
  getCursor(position) {
    if (this.state.getCell(position).isSpecial()) {
      return "pointer";
    }
    return "default";
  }

  /** @inheritDoc */
  handleKey(value) {}
}
