

// triggers: []
// radius: float

// function radius() {
//   var arr = arrayfromargs(arguments);
//   post(arr[0]);
// }
var lastIndex = 0;
var data = {
  triggers: [],
};

var dict = new Dict('triggers');

function triggers() {
  var arr = arrayfromargs(arguments);

  //post(arr, '\n');

  data.triggers = [];
  const numTriggers = arr.length / 3;

  for (var i = 0; i < numTriggers; i++) {
    var index = arr[i * numTriggers + 0];
    var x = arr[i * numTriggers + 1];
    var y = arr[i * numTriggers + 2];

    if (x != -1 && y != -1) {
      var trigger = { x: x, y: y };
      data.triggers.push(trigger);
    }
  }

  dict.parse(JSON.stringify(data));

  outlet(0, 'dictionary', 'triggers');
}
