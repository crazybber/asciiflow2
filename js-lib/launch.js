import {State} from "./state.js";
import {View} from "./view.js";
import {Controller} from "./controller.js";
import {TouchController, DesktopController} from "./input-controller.js";

/* Apple added ES6 Module support to Safari 10.1 and iOS 10.3 without adding
 * support for the nomodule attribute, thus kind of defeating the point of the
 * nomodule attribute.
 */
if (window["ASCIIFLOW2_LOADED"]) {
  throw new Error("Unexpected double initialization of JS.");
} else {
  window["ASCIIFLOW2_LOADED"] = true;
}

/**
 * Runs the application.
 */
(function main() {
  const state = new State();
  const view = new View(state);
  const controller = new Controller(view, state);
  const touchController = new TouchController(controller);
  const desktopController = new DesktopController(controller);
  view.animate();
})();
