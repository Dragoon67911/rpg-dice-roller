import diceUtils from './utils';
import DiceRoll from './dice-roll';


const DiceRoller = (() => {
  /**
   * history of log rolls
   *
   * @type {symbol}
   */
  const _log = Symbol('log');

  /**
   * A DiceRoller handles dice rolling functionality,
   * keeps track of rolls and can output logs etc.
   *
   * @param {{}=} data
   */
  class DiceRoller{
    /**
     * Initialises the object
     *
     * @constructor
     * @param data
     */
    constructor(data){
      this[_log] = [];

      if(data){
        if(Array.isArray(data.log)){
          // loop through each log entry and import it
          data.log.forEach(roll => {
            this[_log].push(DiceRoll.import(roll));
          });
        }else if(data.log){
          throw new Error('DiceRoller: Roll log must be an Array');
        }
      }
    }

    /**
     * Returns the roll notation and rolls in the format of:
     * 2d20+1d6: [20,2]+[2] = 24; 1d8: [6] = 6
     *
     * @returns {string}
     */
    get output(){
      // return the log as a joined string
      return this.log.join('; ');
    }

    /**
     * Rolls the given dice notation.
     * Returns a list of results
     *
     * @param {string} notation
     * @returns {DiceRoll}
     */
    roll(notation){
      let diceRoll = new DiceRoll(notation);

      // add the roll log to our global log
      this[_log].push(diceRoll);

      // return the current DiceRoll
      return diceRoll;
    }

    /**
     * Rolls the given list of dice notations
     * and returns a list of the DiceRolls
     *
     * @param {Array} notations
     * @returns {Array}
     */
    rollMany(notations){
      if(!notations){
        throw new Error('DiceRoller: No notations specified');
      }else if(!Array.isArray(notations)){
        throw new Error('DiceRoller: Notations are not valid');
      }else{
        // loop through and roll each notation, add it to the log and return it
        return notations.map(notation => this.roll(notation));
      }
    }

    /**
     * Clears the roll history log
     */
    clearLog(){
      this[_log].length = 0;
    }

    /**
     * Returns the current roll log
     *
     * @returns {Array}
     */
    get log(){
      return this[_log] || [];
    }

    /**
     * Exports the roll log in the given format.
     * If no format is specified, JSON is returned.
     *
     * @throws Error
     * @param {DiceRoller.exportFormats=} format The format to export the data as (ie. JSON, base64)
     * @returns {string|null}
     */
    export(format){
      switch (format || DiceRoller.exportFormats.JSON){
        case DiceRoller.exportFormats.BASE_64:
          // JSON encode, then base64
          return btoa(this.export(DiceRoller.exportFormats.JSON));
        case DiceRoller.exportFormats.JSON:
          return JSON.stringify(this);
        default:
          throw new Error('DiceRoller: Unrecognised export format specified: ' + format);
      }
    }

    /**
     * Takes the given roll data and imports it into
     * the existing DiceRoller, appending the rolls
     * to the current roll log.
     * Returns the roll log.
     *
     * @throws Error
     * @param data
     * @returns {array}
     */
    import(data){
      if(!data){
        throw new Error('DiceRoller: No data to import');
      }else if(diceUtils.isJson(data)){
        // data is JSON - parse and import
        return this.import(JSON.parse(data));
      }else if(diceUtils.isBase64(data)){
        // data is base64 encoded - decode an import
        return this.import(atob(data));
      }else if(typeof data === 'object'){
        // if `log` is not defined, but data is an array, use it as the list of logs
        if(!data.log && Array.isArray(data) && data.length){
          data = {log: data};
        }

        if(data.log && Array.isArray(data.log)){
          // loop through each log entry and import it
          data.log.forEach(roll => {
            this[_log].push(DiceRoll.import(roll));
          });
        }else if(data.log){
          throw new Error('DiceRoller: Roll log must be an Array');
        }

        return this.log;
      }else{
        throw new Error('DiceRoller: Unrecognised import format for data: ' + data);
      }
    }

    /**
     * Returns the String representation
     * of the object as the roll notations
     *
     * @returns {string}
     */
    toString(){
      return this.output;
    }

    /**
     * Returns an object for JSON serialising
     *
     * @returns {{}}
     */
    toJSON(){
      const {log,} = this;

      return {
        log,
      };
    }


    /**
     * Parses the given dice notation
     * and returns a list of dice found
     *
     * @link https://en.m.wikipedia.org/wiki/Dice_notation
     * @param {string} notation
     * @returns {Array}
     */
    static parseNotation(notation){
      const parsed = [];

      // only continue if a notation was passed
      if(notation){
        // parse the notation and find each valid dice (and any attributes)
        const pattern = this.notationPatterns.get('notation', 'g');
        let match;
        while((match = pattern.exec(notation)) !== null){
          const die = {
            operator: match[1] || '+',                                          // dice operator for concatenating with previous rolls (+, -, /, *)
            qty: match[2] ? parseInt(match[2], 10) : 1,                    // number of times to roll the die
            sides: diceUtils.isNumeric(match[3]) ? parseInt(match[3], 10) : match[3],  // how many sides the die has - only parse numerical values to Int
            fudge: false,                                                    // if fudge die this is set to the fudge notation match
            explode: !!match[5],                                               // flag - whether to explode the dice rolls or not
            penetrate: (match[5] === '!p') || (match[5] === '!!p'),              // flag - whether to penetrate the dice rolls or not
            compound: (match[5] === '!!') || (match[5] === '!!p'),              // flag - whether to compound exploding dice or not
            comparePoint: false,                                                    // the compare point for exploding/penetrating dice
            additions: []                                                        // any additions (ie. +2, -L)
          };

          // check if it's a fudge die
          if(typeof die.sides === 'string'){
            die.fudge = die.sides.match(this.notationPatterns.get('fudge', null, true)) || false;
          }

          // check if we have a compare point
          if(match[6]){
            die.comparePoint = {
              operator: match[6],
              value: parseInt(match[7], 10)
            };
          }else if(die.explode){
            // we are exploding the dice so we need a compare point, but none has been defined
            die.comparePoint = {
              operator: '=',
              value: die.fudge ? 1 : ((die.sides === '%') ? 100 : die.sides)
            };
          }

          // check if we have additions
          if(match[8]){
            // we have additions (ie. +2, -L)
            let additionMatch;
            while((additionMatch = this.notationPatterns.get('addition', 'g').exec(match[8]))){
              // add the addition to the list
              die.additions.push({
                operator: additionMatch[1],             // addition operator for concatenating with the dice (+, -, /, *)
                value: diceUtils.isNumeric(additionMatch[2]) ? // addition value - either numerical or string 'L' or 'H'
                  parseFloat(additionMatch[2])
                  :
                  additionMatch[2]
              });
            }
          }

          parsed.push(die);
        }
      }

      // return the parsed dice
      return parsed;
    }

    /**
     * Parses the given notation for a single die
     * and returns the number of die sides, required
     * quantity, etc.
     *
     * @param {string} notation
     * @returns {object|undefined}
     */
    static parseDie(notation){
      // parse the notation and only return the first result
      // (There should only be one result anyway, but it will be in an array and we want the raw result)
      return this.parseNotation(notation).shift();
    }

    /**
     * Takes the given data, imports it into a new DiceRoller instance
     * and returns the DiceRoller
     *
     * @throws Error
     * @param data
     * @returns {DiceRoller}
     */
    static import(data){
      // create a new DiceRoller object
      const diceRoller = new DiceRoller();

      // import the data
      diceRoller.import(data);

      // return the DiceRoller
      return diceRoller;
    }
  }

  DiceRoller.exportFormats = Object.freeze({
    JSON: 0,
    BASE_64: 1,
    OBJECT: 2
  });

  /**
   * Stores a list of regular expression
   * patterns for dice notations.
   * They can be retrieved, by name, using
   * the `get(name)` method
   *
   * @type {{get}}
   */
  DiceRoller.notationPatterns = (() => {
    const strings = {
      /**
       * Matches a basic arithmetic operator
       *
       * @type {string}
       */
      arithmeticOperator: '[+\\-*\\/]',
      /**
       * Matches a basic comparison operator
       *
       * @type {string}
       */
      comparisonOperators: '[<>!]?={1,3}|[<>]',
      /**
       * Matches the numbers for a 'fudge' die (ie. F, F.2)
       *
       * @type {string}
       */
      fudge: 'F(?:\\.([12]))?',
      /**
       * Matches a number comparison (ie. <=4, =5, >3, !=1)
       *
       * @type {string}
       */
      get numberComparison() {
        return '(' + this.comparisonOperators + ')([0-9]+)';
      },
      /**
       * Matches exploding/penetrating dice notation
       *
       * @type {string}
       */
      explode: '(!{1,2}p?)',
      /**
       * Matches a dice (ie. 2d6, d10, d%, dF, dF.2)
       *
       * @returns {string}
       */
      get dice() {
        return '([1-9][0-9]*)?d([1-9][0-9]*|%|' + this.fudge + ')';
      },
      /**
       * Matches a dice, optional exploding/penetrating notation and roll comparison
       *
       * @type {string}
       */
      get diceFull() {
        return this.dice + this.explode + '?(?:' + this.numberComparison + ')?';
      },
      /**
       * Matches the addition to a dice (ie. +4, -10, *2, -L)
       *
       * @type {string}
       */
      get addition() {
        return '(' + this.arithmeticOperator + ')([1-9]+0?(?![0-9]*d)|H|L)';
      },
      /**
       * Matches a standard dice notation. i.e;
       * 3d10-2
       * 4d20-L
       * 2d7/4
       * 3d8*2
       * 2d3+4-1
       * 2d10-H*1d6/2
       *
       * @type {string}
       */
      get notation() {
        return '(' + this.arithmeticOperator + ')?' + this.diceFull + '((?:' + this.addition + ')*)';
      },
    };

    // list of cached patterns
    const regExp = {};

    return {
      /**
       * @param {string} name
       * @param {string=} flags
       * @param {boolean=} matchWhole
       * @returns {RegExp}
       */
      get(name, flags, matchWhole = false){
        const cacheName = name + '_' + flags + '_' + (matchWhole ? 't' : 'f');

        if(!name){
          throw new Error('DiceRoller: Notation pattern name not defined');
        }else if((typeof name !== 'string') || !strings[name]){
          throw new Error(`DiceRoller: Notation pattern name not found: ${name}`);
        }else if(!regExp[cacheName]){
          // no cached version - create it
          regExp[cacheName] = new RegExp((matchWhole ? '^' : '') + strings[name] + (matchWhole ? '$' : ''), flags || undefined);
        }

        return regExp[cacheName];
      }
    };
  })();

  return DiceRoller;
})();


export default DiceRoller;
