(function() {
  // utility to select DOM elements, and cache them by selector too (since this
  // DOM isn't changing it'll be safe to cache)
  const $ = (function() {
    let cache = {};
    return function(selector) {
      if (cache.hasOwnProperty(selector)) {
        return cache[selector];
      } else {
        const $el = document.querySelectorAll(selector);
        let value;
        if ($el) {
          value = $el.length === 1 ? $el[0] : Array.prototype.slice.call($el);
        } else {
          value = [];
        }
        cache[selector] = value;
        return value;
      }
    };
  })();

  // adapted from https://gist.github.com/Heydon/9de1a8b55dd1448281fad013503a5b7a
  function mutilator(obj, context) {
    const mutilated = {};

    Object.keys(obj).forEach(function(prop) {
      let ref = 'm-' + prop;
      mutilated[ref] = obj[prop];

      Object.defineProperty(mutilated, prop, {
        set: function(value) {
          this[ref] = value;
          context.dispatchEvent(
            new CustomEvent(prop, {
              detail: { value: value }
            })
          );
        },
        get: function() {
          return this[ref];
        }
      });
    });
    return mutilated;
  }

  // adapted from https://stackoverflow.com/a/1527820
  function getRandomInt(min, max) {
    return (
      Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) +
      Math.ceil(min)
    );
  }

  function Emitter() {
    this.el = document.createElement('meta');
  }

  Emitter.prototype.on = function(event, handler) {
    this.el.addEventListener.call(this.el, event, handler);
    return this;
  };

  const emitter = new Emitter();

  const TIME_LIMIT = 60;
  const INTERVAL = 1000;
  const initialDiglettState = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const initialState = {
    time: TIME_LIMIT,
    play: false,
    score: 0,
    digletts: initialDiglettState
  };

  let store = mutilator(initialState, emitter.el);

  const ButtonLabelActive = 'Diglett, Press to Whack';
  const ButtonLabel = 'Diglett hiding';

  let timer = null;
  let molesInterval = null;

  emitter
    .on('play', function(e) {
      clearInterval(timer);
      clearInterval(molesInterval);
      if (!store.time) {
        return;
      }
      if (e.detail.value) {
        // play
        $('#control-start').textContent = 'Pause';
        timer = setInterval(function() {
          store.time -= 1;
          if (store.time === 0) {
            clearInterval(timer);
            clearInterval(molesInterval);
          }
        }, INTERVAL);
        molesInterval = setInterval(function() {
          /**
           * Game logic:
           * * Whether a diglett shows or doesn't show depends on the digletts
           *   array: if it has a non-0 number, then it should be showing
           * * At each interval, a random new diglett should show up
           * * If the index chosen to show up already is showing, do nothing
           * * If the index chosen to show is not showing, pick a random amount
           *   of time between 500ms and 4000ms for the diglett to show
           * * If a diglett is already showing, decrement its time remaining by
           *   the interval
           * * If a diglett is hidden, just keep on keeping on
           */
          const activate = getRandomInt(0, 8);
          store.digletts = store.digletts.map(function(dig, i) {
            if (activate === i && !dig) {
              return getRandomInt(500, 4000);
            } else if (dig > 0) {
              return Math.max(0, dig - INTERVAL);
            } else {
              return dig;
            }
          });
        }, INTERVAL);
      } else {
        // pause
        $('#control-start').textContent = 'Play';
      }
    })
    .on('digletts', function(e) {
      $('.diglett').forEach(function(el, i) {
        if (e.detail.value[i]) {
          el.classList.add('diglett--active');
          el.setAttribute('aria-label', ButtonLabelActive);
          $('#announce').textContent =
            'Diglett popped up at position ' + (i + 1);
        } else {
          deactivateDiglett(el);
        }
      });
    })
    .on('time', function(e) {
      if (e.detail.value === 0) {
        // game over
        store.digletts = initialDiglettState;
        $('#control-start').textContent = 'Play';
      }
      setTime(e.detail.value);
    })
    .on('score', function(e) {
      $('.score-board__score').textContent = e.detail.value;
    });

  $('#game-board').addEventListener('click', function(e) {
    const target = e.target.closest('.diglett');
    if (store.play && target && target.classList.contains('diglett--active')) {
      const index = Array.prototype.slice
        .call(e.currentTarget.children)
        .indexOf(target);
      store.score += 1;
      store.digletts = store.digletts.map(function(val, i) {
        return i === index ? 0 : val;
      });
      deactivateDiglett(target);
    }
  });

  function reset() {
    Object.keys(initialState).forEach(function(key) {
      store[key] = initialState[key];
    });
  }

  function toggleTimer() {
    store.play = !store.play;
  }

  function setTime(val) {
    $('.score-board__time').textContent = val;
  }

  function deactivateDiglett(el) {
    if (el) {
      el.classList.remove('diglett--active');
      el.setAttribute('aria-label', ButtonLabel);
    }
  }

  function init() {
    // JavaScript is here so show the game board and controls
    $('[hidden]').forEach(function(el) {
      el.removeAttribute('hidden');
    });
    setTime(TIME_LIMIT);
    $('#control-start').addEventListener('click', toggleTimer);
    $('#control-reset').addEventListener('click', reset);
  }

  init();
})();
