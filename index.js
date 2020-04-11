

const print = console.log;


function Player(name, units, field) {
    this.name = name;
    this.units = units;
    this.field = field;
    this._fieldEl = null;
    this.firePoints = [];
}
Player.prototype = {
    reset: function () {
        this.firePoints.forEach(fp => {
            this._fieldEl.removeChild(fp._el);
        });
        this.firePoints = [];
        this.units.forEach(u => {
            u.reset();
            u.randomizePosition(this.field);
        });
    },
    toString: function() {
        return `${this.name}`;
    },
    aliveUnitsLength: function() {
        let c = 0;
        for (let i = 0; i < this.units.length; i++) {
            if (this.units[i].isAlive) {
                c += 1;
            }
        }
        return c;
    },
    initElement: function(el) {
        this._fieldEl = el;
        for (let i = 0; i < this.units.length; i++) {
            const uEl = document.createElement('span');
            uEl.className = 'field-object unit';
            this.units[i].bindEl(uEl);
            el.appendChild(uEl);
        }
    },
    refreshEl: function(isCurrent, isGameEnded) {
        this._fieldEl.dataset.current = isCurrent;
        this._fieldEl.dataset.winner = isGameEnded;
        this._fieldEl.querySelector('span.player-name').innerText = this.name;
        this._fieldEl.querySelector('span.units-counter').innerText = this.aliveUnitsLength();
        for (let i = 0; i < this.units.length; i++) {
            this.units[i].refreshEl(this.field);
        }
        for (let i = 0; i < this.firePoints.length; i++) {
            this.firePoints[i].refreshEl(this.field);
        }
    },
    addFirePoint: function(fp, own = false) {
        fp._el = document.createElement('span');
        fp._el.className = 'field-object fire-point';
        if (own) fp._el.classList.toggle('own-fire-point');
        this._fieldEl.appendChild(fp._el);
        this.firePoints.push(fp);
    },
};




const utils = {
    coordToPercent: function (c, axisLength) {
        return ((c/axisLength)*100)+'%';
    },
};


function Unit(x, y, type = 'TANK', isAlive = true) {
    const UNIT_WIDTH = 2;
    const UNIT_HEIGHT = 2;

    this.x = x;
    this.y = y;
    this.w = UNIT_WIDTH;
    this.h = UNIT_HEIGHT;

    this.type = type;

    this.isAlive = isAlive;

    this._el = null;
}
Unit.prototype = {
    reset: function() {
        this.isAlive = true;
    },
    randomizePosition: function({width, height}) {
        this.x = Math.random() * (width-this.w);
        this.y = Math.random() * (height-this.h);
    },
    toString: function () {
        return `T(${this.x}, ${this.y})[${this.isAlive ? '+' : 'X'}]`;
    },
    bindEl: function (el) {
        this._el = el;
        this._el.title = this.type;
    },
    refreshEl: function (field) {
        this._el.style.top = utils.coordToPercent(this.y, field.height);;
        this._el.style.left = utils.coordToPercent(this.x, field.width);
        this._el.style.width = utils.coordToPercent(this.w, field.width);
        this._el.style.height = utils.coordToPercent(this.h, field.height);
        this._el.dataset.alive = this.isAlive;
    },
    fire: function(x, y) {
        if (!this.isAlive) {
            return false;
        }
        if (x >= this.x && x <= this.x+this.w && y >= this.y && y <= this.y+this.h) {
            this.isAlive = false;
            return true;
        }
        return false;
    },
};

Unit.random = (field) => {
    const u = new Unit(0, 0);
    u.randomizePosition(field);
    return u;
}


function FirePoint(x, y, el = null, isMortal = false) {
    this.x = x;
    this.y = y;
    this.isMortal = isMortal;
    this._el = el;
}
FirePoint.prototype = {
    toString: function () {
        return `[${this.x},${this.y}]`;
    },
    refreshEl: function (field) {
        this._el.style.left = utils.coordToPercent(this.x, field.width);
        this._el.style.top = utils.coordToPercent(this.y, field.height);
        this._el.dataset.mortal = this.isMortal;
    },
}


function Game(fieldEl) {

    const STANDART_FIELD = {width: 80, height: 70};
    const UNITS_COUNT = 8;

    this._fieldEl = fieldEl;


    const fpUnits = new Array(UNITS_COUNT).fill(0).map(() => Unit.random(STANDART_FIELD));
    const spUnits = new Array(UNITS_COUNT).fill(0).map(() => Unit.random(STANDART_FIELD));

    this.player1 = new Player('Player 1', fpUnits, Object.assign({}, STANDART_FIELD));
    const pfEl = this._fieldEl.querySelector('#p1-field');
    pfEl.addEventListener('click', function(e) {this._onPlayerFieldClick(e, this.player1)}.bind(this));
    this.player1.initElement(pfEl);

    this.player2 = new Player('Player 2', spUnits, Object.assign({}, STANDART_FIELD));
    const sfEl = this._fieldEl.querySelector('#p2-field');
    sfEl.addEventListener('click', function(e) {this._onPlayerFieldClick(e, this.player2)}.bind(this));
    this.player2.initElement(sfEl);

    this.reset();

    // reset 

    this.onPlayerNameClick = this.onPlayerNameClick.bind(this);

    fieldEl.querySelectorAll('span.player-name').forEach(e => {
        e.addEventListener('click', this.onPlayerNameClick);
    });


    // aims

    this.mouseAim = fieldEl.querySelector('#mouse-aim');
    this.hintAim = fieldEl.querySelector('#hint-aim');

    fieldEl.addEventListener('mousemove', (function(e) {
        const DISABLED_CLS = 'disabled';

        const { x, y, width, height } = fieldEl.getBoundingClientRect();

        if (e.ctrlKey) {
            if (this.hintAim.classList.contains(DISABLED_CLS)) {
                this.hintAim.classList.remove(DISABLED_CLS);
            }

            this.hintAim.style.left = x + (width - e.pageX);
            this.hintAim.style.top = e.pageY - y; 
        } else {
            if (!this.hintAim.classList.contains(DISABLED_CLS)) {
                this.hintAim.classList.add(DISABLED_CLS);
            }
        }

        this.mouseAim.style.left = e.pageX - x;
        this.mouseAim.style.top = e.pageY - y;
    }).bind(this));
}

Game.prototype = {

    reset: function() {
        this.isEnded = false;
        this.currentPlayer = Math.random() < 0.5 ? this.player1 : this.player2;
        this.player1.reset();
        this.player2.reset();
        this.refreshEl();
    },
    _onPlayerFieldClick: function(e, p) {
        // print(p, e);
        const x = p.field.width - (p.field.width * (e.offsetX/e.target.clientWidth));
        const y = p.field.height * (e.offsetY/e.target.clientHeight);
        if (this.currentPlayer === p) {
            game.fire(x, y);
        }
    },
    toString: function() {
        if (this.isEnded) {
            return`game is ended, winner: ${this.currentPlayer}`;
        }
        return `${this.player1} vs ${this.player2}`;
    },
    _opponent: function() {
        return (this.currentPlayer === this.player1) ? this.player2 : this.player1;
    },
    _toggleCurrentPlayer: function () {
        this.currentPlayer = this._opponent();
    },
    fire: function(x, y) {
        if (this.isEnded) {
            print('game is already ended');
            return;
        }
        const o = this._opponent();
        const firePoint = new FirePoint(x, y);
        o.addFirePoint(firePoint);
        this.currentPlayer.addFirePoint(new FirePoint(this.currentPlayer.field.width - x, y), true);
        // print(`${this.currentPlayer} firing (${x}, ${y})`);
        let isKilledAnyUnit = false;
        for (let i = 0; i < o.units.length; i++) {
            const u = o.units[i];
            if (u.fire(firePoint.x, firePoint.y)) {
                // print('killed unit:', u)
                isKilledAnyUnit = true;
                firePoint.isMortal = true;
                if (o.aliveUnitsLength() == 0) {
                    // print(this.currentPlayer, 'won!')
                    this.isEnded = true;
                    this.refreshEl();
                    return;
                }
            }
        }
        if (!isKilledAnyUnit) {
            // print('none killed')
            this._toggleCurrentPlayer()
        } else {
            // print('fire again!')
        }
        this.refreshEl();
    },
    refreshEl: function() {
        this.player1.refreshEl(this.currentPlayer === this.player1, this.isEnded);
        this.player2.refreshEl(this.currentPlayer === this.player2, this.isEnded);
    },
    onPlayerNameClick: function(e) {
        // console.log('onPlayerNameClick', this);
        e.stopPropagation();

        if (this.isEnded) {
            this.reset();
        }

    },
};


const fEl = document.querySelector('#game-field');
const game = new Game(fEl);
print(game);
print(game+'');


screen.orientation.lock("landscape")
    .then(console.log)
    .catch(e => undefined);
