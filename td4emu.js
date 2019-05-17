var registor_a      = 0;
var registor_b      = 0;
var program_counter = 0;
var output_port     = 0;
var input_port      = 0;
var c_flag          = 0;

var path = location.pathname;

var order_list = [
  ['ADD A,'   , '0000', true , /^ADD\sA,\d{4}$/g],
  ['ADD B,'   , '0101', true , /^ADD\sB,\d{4}$/g],
  ['MOV A,'   , '0011', true , /^MOV\sA,\d{4}$/g],
  ['MOV B,'   , '0111', true , /^MOV\sB,\d{4}$/g],
  ['MOV A,B'  , '0001', false, /^MOV\sA,B$/g],
  ['MOV B,A'  , '0100', false, /^MOV\sB,A$/g],
  ['JMP '     , '1111', true , /^JMP\s\d{4}$/g],
  ['JNC '     , '1110', true , /^JNC\s\d{4}$/g],
  ['IN  A'    , '0010', false, /^IN\sA$/g],
  ['IN  B'    , '0110', false, /^IN\sB$/g],
  ['OUT B'    , '1001', false, /^OUT\sB$/g],
  ['OUT '     , '1011', true , /^OUT\s\d{4}$/g],
];

function purse_order(bin) {
  var op = bin.slice(0,4);
  var im = parseInt(bin.slice(-4),2);
  registor_a &= 15;
  registor_b &= 15;
  switch (op) {
    case '0000':
      registor_a += im; c_flag = registor_a&16 ? 1 : 0; return;
    case '0101':
      registor_b += im; c_flag = registor_b&16 ? 1 : 0;  return;
    case '0011':
      registor_a = im; break;
    case '0111':
      registor_b = im; break;
    case '0001':
      registor_a = registor_b; break;
    case '0100':
      registor_b = registor_a; break;
    case '1111':
      program_counter = im; break;
    case '1110':
      if (c_flag === 0) program_counter = im; break;
    case '0010':
      registor_a = input_port; break;
    case '0110':
      registor_b = input_port; break;
    case '1001':
      output_port = registor_b; break;
    case '1011':
      output_port = im; break;
  }
  c_flag = 0;
}

function print_4bit(id, data) {
  document.getElementById(id).innerHTML=('0000'+data.toString(2)).slice(-4);
}

function read_bin(address) {
  var bin = '';
   for (var i = 0; i < 8; i++) {
    bin += document.rom.bit[address*8+i].checked ? '1' : '0';
  }
  return bin;
} 

function update_bin(address) {
  var ml = assemble(document.rom.order[address].value);
  for (var i = 0; i < 8; i++) {
    document.rom.bit[address*8+i].checked = ml[i] === '1' ? true : false;
  }
  update_url();
}

function update_assembly() {
  for(var i=0; i<16; i++) {
    let order = disassemble(read_bin(i));
    document.rom.order[i].value = order;
    if (order==='') {
      update_bin(i);
    }
  }
  update_url();
}

function assemble(order) {
  var op = '0000';
  var im = '0000';
  for (var i = 0; i < order_list.length; i++) {
    if (order.match(order_list[i][3])) {
      op = order_list[i][1];
      if(order_list[i][2]) {
        im = order.slice(-4);
      }
    }
  }
  return op+im;
}

function disassemble(bin) {
  var order;
  var op = bin.slice(0,4);
  var im = bin.slice(-4);
  if (bin==='00000000') return '';
  for (var i = 0; i < order_list.length; i++) {
    if (op === order_list[i][1]) {
      order = order_list[i][0];
      if(order_list[i][2]) {
        order+=im;
      }
      return order;
    }
  }
  return 'NOP';
}

function update_url() {
  var rom = '';
  for (var i = 0; i < 16; i++) {
    rom += ('00'+parseInt(read_bin(i),2).toString(16)).slice(-2);
  }
  window.history.replaceState(null,null,
    '?' +
    'rom=' + rom
  );
}

function parse_url() {
  let url = new URL(window.location.href);
  if (url.searchParams.has("rom")) {
    let rom = url.searchParams.get("rom");
    for (let i = 0; i < 16; i++) {
      let bin = ('00000000'+parseInt(rom[2*i]+rom[2*i+1],16).toString(2)).slice(-8);
      for (let j = 0; j < 8; j++) {
        document.rom.bit[i*8+j].checked = bin[j] === '1' ? true : false;
      }
    }
    update_assembly();
  }
}

function update() {
  print_4bit("registor-a",registor_a);
  print_4bit("registor-b",registor_b);
  print_4bit("program-counter",program_counter);
  print_4bit("output-port",output_port);
  document.getElementById("c-flag").innerHTML = c_flag+'';
  var address_boxes = document.getElementsByName("address")
  for (var i=0; i<16; i++) {
    var address = ('00'+i.toString()).slice(-2);
    address_boxes[i].innerHTML = address;
    if (i === program_counter) {
      address_boxes[i].style.color = 'red';
    } else {
      address_boxes[i].style.color = 'black';
    }
  }
}

function clock() {
  var bin = read_bin(program_counter);
  var input_port_string = '';
  for (var i = 0; i<4; i++) {
    input_port_string += document.inputport.bit[i].checked ? '1':'0';
  }
  input_port = parseInt(input_port_string,2);
  program_counter++;
  if (program_counter > 0b1111) program_counter = 0;
  purse_order(bin);
  update();
}

var timer = null;
function set_clock_generator(hz) {
  if (timer != null) {
    clearInterval(timer);
    timer = null;
  }
  if (hz) timer = setInterval(clock,hz);
}

function reset_td4() {
  registor_a = registor_b = 0;
  program_counter = 0;
  output_port = 0;
  update();
}

function clear_rom() {
  for (var i=0; i<16; i++) {
    document.rom.order[i].value = '';
    update_bin(i);
  }
}

function focusnext(e) {
  if (e.keyCode === 13 || e.keyCode ===40) {
    for (var i=0; i<15; i++) {
      if (document.activeElement === document.rom.order[i]) {
        document.rom.order[i+1].focus();
        return;
      }
    }
  } 
    if (e.keyCode === 8 || e.keyCode === 38) {
    for (var i=1; i<16; i++) {
      if (document.activeElement === document.rom.order[i]) {
        if (document.rom.order[i].value === '')
        document.rom.order[i-1].focus();
        return;
      }
    }
  } 
}

function load() {
  reset_td4();
  parse_url();
}

document.onload = load();

// document.onload=reset_td4();
window.onkeydown = focusnext;