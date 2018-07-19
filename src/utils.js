/**
 * Utility helper functions
 *
 * @type {{isNumeric: (function(*=): boolean), isBase64: isBase64, isJson: isJson, generateNumber: generateNumber, sumArray: (function(Array): *), equateNumbers: (function(number, number, string): number), compareNumbers: (function(number, number, string): boolean)}}
 */
export default {
  /**
   * Checks if the given val is a valid number
   *
   * @param val
   * @returns {boolean}
   */
  isNumeric(val){
    return !Array.isArray(val) && !Number.isNaN(val) && Number.isFinite(parseInt(val, 10));
  },
  isBase64(val){
    try{
      return !!(val && (btoa(atob(val)) === val));
    }catch(e){
      return false;
    }
  },
  isJson(val){
    try{
      let parsed = val ? JSON.parse(val) : false;

      return !!(parsed && (typeof parsed === 'object'));
    }catch(e){
      return false;
    }
  },
  /**
   * Generates a random number between the
   * min and max, inclusive
   *
   * @param {number|string} min
   * @param {number|string} max
   * @returns {*}
   */
  generateNumber(min, max){
    min = min ? parseInt(min, 10) : 1;
    max = max ? parseInt(max, 10) : min;

    if(max <= min){
      return min;
    }

    return Math.floor(Math.random() * (max - min + 1) + min);
  },
  /**
   * @returns {function(Array): number}
   */
  get sumArray(){
    /**
     * Takes an array of numbers and adds them together,
     * returning the result
     *
     * @param {Array} numbers
     * @returns {number}
     */
    return numbers => (
      !Array.isArray(numbers) ? 0 : numbers.reduce((prev, current) => (
        prev + (this.isNumeric(current) ? parseFloat(current) : 0)
      ), 0)
    );
  },
  /**
   * @returns {function(number, number, string=): number}
   */
  get equateNumbers(){
    /**
     * Takes two numbers and runs a
     * mathematical equation on them,
     * using the given operator
     *
     * @param {number} a
     * @param {number} b
     * @param {string=} operator A valid arithmetic operator (+, -, /, *)
     * @returns {number}
     */
    return (a, b, operator = '+') => {
      // ensure values are numeric
      a = this.isNumeric(a) ? parseFloat(a + '') : 0;
      b = this.isNumeric(b) ? parseFloat(b + '') : 0;

      // only carry out operation if we have both values
      switch(operator){
        case '*':
          // multiply the value
          a *= b;
          break;
        case '/':
          // divide the value (Handle division by zero)
          a = b ? a / b : 0;
          break;
        case '-':
          // subtract from the value
          a -= b;
          break;
        default:
          // add to the value
          a += b;
          break;
      }

      return a;
    };
  },
  /**
   * Checks if `a` is comparative to `b` with the given operator.
   * Returns true or false.
   *
   * @param {number} a
   * @param {number} b
   * @param {string} operator A valid comparative operator (=, <, >, <=, >=, !=)
   * @returns {boolean}
   */
  compareNumbers(a, b, operator){
    let result;

    a = parseFloat(a);
    b = parseFloat(b);

    switch(operator){
      case '=':
      case '==':
        result = a === b;
        break;
      case '<':
        result = a < b;
        break;
      case '>':
        result = a > b;
        break;
      case '<=':
        result = a <= b;
        break;
      case '>=':
        result = a >= b;
        break;
      case '!':
      case '!=':
        result = a !== b;
        break;
      default:
        result = false;
        break;
    }

    return result;
  }
};
