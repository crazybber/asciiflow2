import * as c from "./constants.js";
import {Vector} from "./vector.js";
import {View} from "./view.js";
import {State} from "./state.js";
import {DrawFunction} from "./draw/function.js";
import {DrawBox} from "./draw/box.js";
import {DrawErase} from "./draw/erase.js";
import {DrawLine} from "./draw/line.js";
import {DrawSelect} from "./draw/select.js";
import {DrawText} from "./draw/text.js";
import {DrawMove} from "./draw/move.js";
import {DrawFreeform} from "./draw/freeform.js";


/**
 * Different modes of control.
 */
const Mode = {
  NONE: 0,
  DRAG: 1,
  DRAW: 2,
};

/**
 * Handles user input events and modifies state.
 */
export class Controller {
  /**
   * @param {!View} view
   * @param {!State} state
   */
  constructor(view, state) {
    /** @type {!View} */ this.view = view;
    /** @type {!State} */ this.state = state;

    /** @type {!DrawFunction} */ this.drawFunction = new DrawBox(state);

    /** @type {number} */ this.mode = Mode.NONE;
    /** @type {?Vector} */ this.dragOrigin = null;
    /** @type {?Vector} */ this.dragOriginCell = null;

    /** @type {?Vector} */ this.lastMoveCell = null;

    this.installBindings();
  }

  /**
   * @param {!Vector} position
   */
  startDraw(position) {
    this.mode = Mode.DRAW;
    this.drawFunction.start(this.view.screenToCell(position));
  }

  /**
   * @param {!Vector} position
   */
  startDrag(position) {
    this.mode = Mode.DRAG;
    this.dragOrigin = position;
    this.dragOriginCell = this.view.offset;
  }

  hideDialogs() {
    Array.prototype.forEach.call(document.getElementsByClassName("dialog"), el => el.classList.remove("visible"));
  }

  /**
   * @param {!Vector} position
   */
  handleMove(position) {
    const moveCell = this.view.screenToCell(position);

    // First move event, make sure we don't blow up here.
    if (this.lastMoveCell === null) {
      this.lastMoveCell = moveCell;
    }

    // Update the cursor pointer, depending on the draw function.
    if (!moveCell.equals(this.lastMoveCell)) {
      this.view.canvas.style.cursor = this.drawFunction.getCursor(moveCell);
    }

    // In drawing mode, so pass the mouse move on, but remove duplicates.
    if (this.mode === Mode.DRAW && !moveCell.equals(this.lastMoveCell)) {
      this.drawFunction.move(moveCell);
    }

    // Drag in progress, update the view origin.
    if (this.mode === Mode.DRAG) {
      this.view.setOffset(this.dragOriginCell.add(this.dragOrigin.subtract(position).scale(1 / this.view.zoom)));
    }
    this.lastMoveCell = moveCell;
  }

  /**
   * Ends the current operation.
   */
  endAll() {
    if (this.mode === Mode.DRAW) {
      this.drawFunction.end();
    }
    // Cleanup state.
    this.mode = Mode.NONE;
    this.dragOrigin = null;
    this.dragOriginCell = null;
    this.lastMoveCell = null;
  }

  /**
   * Installs input bindings for common use cases devices.
   */
  installBindings() {
    window.addEventListener("resize", () => {
      this.view.resizeCanvas();
    });

    Array.prototype.forEach.call(document.querySelectorAll("#draw-tools > button.tool"), el => el.addEventListener("click", (/** @type {!MouseEvent} */ e) => {
      document.getElementById("text-tool-widget").style.display = "none";
      this.handleDrawButton(e.target.id);
    }));

    Array.prototype.forEach.call(document.querySelectorAll("#file-tools > button.tool"), el => el.addEventListener("click", (/** @type {!MouseEvent} */ e) => {
      this.handleFileButton(e.target.id);
    }));

    Array.prototype.forEach.call(document.querySelectorAll("button.close-dialog-button"), el => el.addEventListener("click", () => {
      this.hideDialogs();
    }));

    document.getElementById("import-submit-button").addEventListener("click", () => {
      this.state.clear();

      /** @type {string} */
      const importText = document.getElementById("import-area").value;
      this.state.fromText(
        importText,
        this.view.screenToCell(new Vector(this.view.canvas.width / 2, this.view.canvas.height / 2))
      );
      this.state.commitDraw();
      document.getElementById("import-area").value = "";
      this.hideDialogs();
    });

    document.getElementById("use-lines-button").addEventListener("click", () => {
      this.hideDialogs();
      this.view.setUseLines(true);
    });

    document.getElementById("use-ascii-button").addEventListener("click", () => {
      this.hideDialogs();
      this.view.setUseLines(false);
    });

    window.addEventListener("keydown", (/** @type {!KeyboardEvent} */ e) => {
      this.handleKeyDown(e);
    });

    // Bit of a hack, just triggers the text tool to get a new value.
    document.getElementById("text-tool-input").addEventListener("keyup", () => {
      this.drawFunction.handleKey("");
    });
    document.getElementById("freeform-tool-input").addEventListener("keyup", () => {
      this.drawFunction.handleKey("");
    });
    document.getElementById("text-tool-input").addEventListener("change", () => {
      this.drawFunction.handleKey("");
    });
    document.getElementById("freeform-tool-input").addEventListener("change", () => {
      this.drawFunction.handleKey("");
    });
    document.getElementById("text-tool-close").addEventListener("click", () => {
      document.getElementById("text-tool-widget").style.display = "none";
      this.state.commitDraw();
    });
  }

  /**
   * Handles the buttons in the UI.
   * @param {string} id The ID of the element clicked.
   */
  handleDrawButton(id) {
    Array.prototype.forEach.call(document.querySelectorAll("#draw-tools > button.tool"), el => el.classList.remove("active"));
    document.getElementById(id).classList.toggle("active");
    this.hideDialogs();

    // Install the right draw tool based on button pressed.
    if (id === "box-button") {
      this.drawFunction = new DrawBox(this.state);
    }
    if (id === "line-button") {
      this.drawFunction = new DrawLine(this.state, false);
    }
    if (id === "arrow-button") {
      this.drawFunction = new DrawLine(this.state, true);
    }
    if (id === "freeform-button") {
      this.drawFunction = new DrawFreeform(this.state, "X");
    }
    if (id === "erase-button") {
      this.drawFunction = new DrawErase(this.state);
    }
    if (id === "move-button") {
      this.drawFunction = new DrawMove(this.state);
    }
    if (id === "text-button") {
      this.drawFunction = new DrawText(this.state);
    }
    if (id === "select-button") {
      this.drawFunction = new DrawSelect(this.state);
    }
    this.state.commitDraw();
    this.view.canvas.focus();
  }

  /**
   * Handles the buttons in the UI.
   * @param {string} id The ID of the element clicked.
   */
  handleFileButton(id) {
    this.hideDialogs();
    const dialog = document.getElementById(`${id}-dialog`);
    if (dialog) {
      dialog.classList.toggle("visible");
    }

    if (id === "import-button") {
      document.getElementById("import-area").value = "";
      document.getElementById("import-area").focus();
    }

    if (id === "export-button") {
      document.getElementById("export-area").value = this.state.outputText();
      document.getElementById("export-area").select();
    }
    if (id === "clear-button") {
      this.state.clear();
    }
    if (id === "undo-button") {
      this.state.undo();
    }
    if (id === "redo-button") {
      this.state.redo();
    }
  }

  /**
   * Handles key down events.
   * @param {!KeyboardEvent} event
   */
  handleKeyDown(event) {
    // Override some special characters so that they can be handled in one place.
    let specialKeyCode = null;

    // event.metaKey is the Command key on Mac
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
      if (event.key === "c") {
        specialKeyCode = c.KEY_COPY;
      }
      if (event.key === "v") {
        specialKeyCode = c.KEY_PASTE;
      }
      if (event.key === "z") {
        this.state.undo();
        return;
      }
      if (event.key === "y") {
        this.state.redo();
        return;
      }
      if (event.key === "x") {
        specialKeyCode = c.KEY_CUT;
      }
    }

    this.drawFunction.handleKey(
      specialKeyCode === null ? event.key : specialKeyCode
    );
  }
}
