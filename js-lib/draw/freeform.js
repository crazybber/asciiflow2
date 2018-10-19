import { DrawFunction } from './function';
import { TOUCH_ENABLED } from '../constants';
import State from '../state';

/**
 * @implements {DrawFunction}
 */
export default class DrawFreeform {
  /**
   * @param {State} state
   * @param {?string} value
   */
  constructor(state, value) {
    this.state = state;
    this.value = value;
    if (TOUCH_ENABLED) {
      document.getElementById('freeform-tool-input').value = '';
      document.getElementById('freeform-tool-input').style.display = 'none';
      setTimeout(function() {
        document.getElementById('freeform-tool-input').style.display = 'block';
        setTimeout(function() {
          document.getElementById('freeform-tool-input').focus();
        }, 0);
      }, 0);
    }
  }

  /** @inheritDoc */
  start(position) {
    this.state.drawValue(position, this.value);
  }

  /** @inheritDoc */
  move(position) {
    this.state.drawValue(position, this.value);
  }

  /** @inheritDoc */
  end() {
    this.state.commitDraw();
  }

  /** @inheritDoc */
  getCursor(position) {
    return 'crosshair';
  }

  /** @inheritDoc */
  handleKey(value) {
    if (TOUCH_ENABLED) {
      this.value = document.getElementById('freeform-tool-input').value.charAt(0);
      document.getElementById('freeform-tool-input').blur();
      document.getElementById('freeform-tool-input').style.display = 'none';
    }
    if (value.length == 1) {
      // The value is not a special character, so lets use it.
      this.value = value;
    }
  }
}
