
(function($) {
 $.jCryption = function(el, options) {
  var base = this;
  base.$el = $(el);
  base.el = el;
  base.$el.data("jCryption", base);
  base.init = function() {
   base.options = $.extend({}, $.jCryption.defaultOptions, options);
   $encryptedElement = $("<input />", {
    type: "hidden",
    name: base.options.postVariable
   });
   if (base.options.submitElement !== false) var $submitElement = base.options.submitElement;
   else var $submitElement = base.$el.find(":input:submit");
   $submitElement.bind(base.options.submitEvent, function() {
    $(this).attr("disabled", true);
    if (base.options.beforeEncryption()) $.jCryption.getKeys(base.options.getKeysURL, function(keys) {
     $.jCryption.encrypt(base.$el.serialize(), keys, function(encrypted) {
      console.log(encrypted);
      $encryptedElement.val(encrypted);
      $(base.$el).find(":input").attr("disabled", true).end().append($encryptedElement).submit()
     })
    });
    return false
   })
  };
  base.init()
 };
 $.jCryption.getKeys = function(url, callback) {
  var jCryptionKeyPair = function(encryptionExponent, modulus, maxdigits) {
   setMaxDigits(parseInt(maxdigits, 10));
   this.e = biFromHex(encryptionExponent);
   this.m = biFromHex(modulus);
   this.chunkSize = 2 * biHighIndex(this.m);
   this.radix = 16;
   this.barrett = new BarrettMu(this.m)
  };
  $.getJSON(url, function(data) {
   keys = new jCryptionKeyPair(data.e, data.n, data.maxdigits);
   if ($.isFunction(callback)) callback.call(this, keys)
  })
 };
 $.jCryption.encrypt = function(string, keyPair, callback, element) {
  var charSum = 0;
  for (var i = 0; i < string.length; i++) charSum += string.charCodeAt(i);
  var tag = "0123456789abcdef";
  var hex = "";
  hex += tag.charAt((charSum & 240) >> 4) + tag.charAt(charSum & 15);
  var taggedString =
   hex + string;
  var encrypt = [];
  var j = 0;
  while (j < taggedString.length) {
   encrypt[j] = taggedString.charCodeAt(j);
   j++
  }
  while (encrypt.length % keyPair.chunkSize !== 0) encrypt[j++] = 0;

  function encryption(encryptObject) {
   var charCounter = 0;
   var j, block;
   var encrypted = "";

   function encryptChar() {
    block = new BigInt;
    j = 0;
    for (var k = charCounter; k < charCounter + keyPair.chunkSize; ++j) {
     block.digits[j] = encryptObject[k++];
     block.digits[j] += encryptObject[k++] << 8
    }
    var crypt = keyPair.barrett.powMod(block, keyPair.e);
    var text = keyPair.radix == 16 ? biToHex(crypt) :
     biToString(crypt, keyPair.radix);
    encrypted += text + " ";
    charCounter += keyPair.chunkSize;
    if (charCounter < encryptObject.length) encryptChar();
    else {
     var encryptedString = encrypted.substring(0, encrypted.length - 1);
     if ($.isFunction(callback)) callback(encryptedString, element);
     else return encryptedString
    }
   }
   encryptChar()
  }
  encryption(encrypt)
 };
 $.jCryption.defaultOptions = {
  submitElement: false,
  submitEvent: "click",
  getKeysURL: "/jsp/jc.jsp?generateKeypair=true",
  beforeEncryption: function() {
   return true
  },
  postVariable: "jCryption"
 };
 $.fn.jCryption = function(options) {
  return this.each(function() {
   new $.jCryption(this, options)
  })
 }
})(jQuery);
var biRadixBase = 2;
var biRadixBits = 16;
var bitsPerDigit = biRadixBits;
var biRadix = 1 << 16;
var biHalfRadix = biRadix >>> 1;
var biRadixSquared = biRadix * biRadix;
var maxDigitVal = biRadix - 1;
var maxInteger = 9999999999999998;
var maxDigits;
var ZERO_ARRAY;
var bigZero, bigOne;
var dpl10 = 15;
var highBitMasks = new Array(0, 32768, 49152, 57344, 61440, 63488, 64512, 65024, 65280, 65408, 65472, 65504, 65520, 65528, 65532, 65534, 65535);
var hexatrigesimalToChar = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z");
var hexToChar = new Array("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f");
var lowBitMasks = new Array(0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535);

function setMaxDigits(value) {
 maxDigits = value;
 ZERO_ARRAY = new Array(maxDigits);
 for (var iza = 0; iza < ZERO_ARRAY.length; iza++) ZERO_ARRAY[iza] = 0;
 bigZero = new BigInt;
 bigOne = new BigInt;
 bigOne.digits[0] = 1
}

function BigInt(flag) {
 if (typeof flag == "boolean" && flag == true) this.digits = null;
 else this.digits = ZERO_ARRAY.slice(0);
 this.isNeg = false
}

function biFromDecimal(s) {
 var isNeg = s.charAt(0) == "-";
 var i = isNeg ? 1 : 0;
 var result;
 while (i < s.length && s.charAt(i) == "0") ++i;
 if (i == s.length) result = new BigInt;
 else {
  var digitCount = s.length - i;
  var fgl = digitCount % dpl10;
  if (fgl == 0) fgl = dpl10;
  result = biFromNumber(Number(s.substr(i, fgl)));
  i += fgl;
  while (i < s.length) {
   result = biAdd(biMultiply(result, biFromNumber(1E15)), biFromNumber(Number(s.substr(i, dpl10))));
   i += dpl10
  }
  result.isNeg = isNeg
 }
 return result
}

function biCopy(bi) {
 var result = new BigInt(true);
 result.digits = bi.digits.slice(0);
 result.isNeg = bi.isNeg;
 return result
}

function biFromNumber(i) {
 var result = new BigInt;
 result.isNeg = i < 0;
 i = Math.abs(i);
 var j = 0;
 while (i > 0) {
  result.digits[j++] = i & maxDigitVal;
  i >>= biRadixBits
 }
 return result
}

function reverseStr(s) {
 var result = "";
 for (var i = s.length - 1; i > -1; --i) result += s.charAt(i);
 return result
}

function biToString(x, radix) {
 var b = new BigInt;
 b.digits[0] = radix;
 var qr = biDivideModulo(x, b);
 var result = hexatrigesimalToChar[qr[1].digits[0]];
 while (biCompare(qr[0], bigZero) == 1) {
  qr = biDivideModulo(qr[0], b);
  digit = qr[1].digits[0];
  result += hexatrigesimalToChar[qr[1].digits[0]]
 }
 return (x.isNeg ? "-" : "") + reverseStr(result)
}

function biToDecimal(x) {
 var b = new BigInt;
 b.digits[0] = 10;
 var qr = biDivideModulo(x, b);
 var result = String(qr[1].digits[0]);
 while (biCompare(qr[0], bigZero) == 1) {
  qr = biDivideModulo(qr[0], b);
  result += String(qr[1].digits[0])
 }
 return (x.isNeg ? "-" : "") + reverseStr(result)
}

function digitToHex(n) {
 var mask = 15;
 var result = "";
 for (i = 0; i < 4; ++i) {
  result += hexToChar[n & mask];
  n >>>= 4
 }
 return reverseStr(result)
}

function biToHex(x) {
 var result = "";
 var n = biHighIndex(x);
 for (var i = biHighIndex(x); i > -1; --i) result += digitToHex(x.digits[i]);
 return result
}

function charToHex(c) {
 var ZERO = 48;
 var NINE = ZERO + 9;
 var littleA = 97;
 var littleZ = littleA + 25;
 var bigA = 65;
 var bigZ = 65 + 25;
 var result;
 if (c >= ZERO && c <= NINE) result = c - ZERO;
 else if (c >= bigA && c <= bigZ) result = 10 + c - bigA;
 else if (c >= littleA && c <= littleZ) result = 10 + c - littleA;
 else result = 0;
 return result
}

function hexToDigit(s) {
 var result = 0;
 var sl = Math.min(s.length, 4);
 for (var i = 0; i < sl; ++i) {
  result <<= 4;
  result |= charToHex(s.charCodeAt(i))
 }
 return result
}

function biFromHex(s) {
 var result = new BigInt;
 var sl = s.length;
 for (var i = sl, j = 0; i > 0; i -= 4, ++j) result.digits[j] = hexToDigit(s.substr(Math.max(i - 4, 0), Math.min(i, 4)));
 return result
}

function biFromString(s, radix) {
 var isNeg = s.charAt(0) == "-";
 var istop = isNeg ? 1 : 0;
 var result = new BigInt;
 var place = new BigInt;
 place.digits[0] = 1;
 for (var i = s.length - 1; i >= istop; i--) {
  var c = s.charCodeAt(i);
  var digit = charToHex(c);
  var biDigit = biMultiplyDigit(place, digit);
  result = biAdd(result, biDigit);
  place = biMultiplyDigit(place, radix)
 }
 result.isNeg = isNeg;
 return result
}

function biDump(b) {
 return (b.isNeg ? "-" : "") + b.digits.join(" ")
}

function biAdd(x, y) {
 var result;
 if (x.isNeg != y.isNeg) {
  y.isNeg = !y.isNeg;
  result = biSubtract(x, y);
  y.isNeg = !y.isNeg
 } else {
  result = new BigInt;
  var c = 0;
  var n;
  for (var i = 0; i < x.digits.length; ++i) {
   n = x.digits[i] + y.digits[i] + c;
   result.digits[i] = n & 65535;
   c = Number(n >= biRadix)
  }
  result.isNeg = x.isNeg
 }
 return result
}

function biSubtract(x, y) {
 var result;
 if (x.isNeg != y.isNeg) {
  y.isNeg = !y.isNeg;
  result = biAdd(x, y);
  y.isNeg = !y.isNeg
 } else {
  result = new BigInt;
  var n, c;
  c = 0;
  for (var i = 0; i < x.digits.length; ++i) {
   n = x.digits[i] - y.digits[i] + c;
   result.digits[i] = n & 65535;
   if (result.digits[i] < 0) result.digits[i] += biRadix;
   c = 0 - Number(n < 0)
  }
  if (c == -1) {
   c = 0;
   for (var i = 0; i < x.digits.length; ++i) {
    n = 0 - result.digits[i] + c;
    result.digits[i] = n & 65535;
    if (result.digits[i] < 0) result.digits[i] += biRadix;
    c = 0 - Number(n < 0)
   }
   result.isNeg = !x.isNeg
  } else result.isNeg = x.isNeg
 }
 return result
}

function biHighIndex(x) {
 var result = x.digits.length - 1;
 while (result > 0 && x.digits[result] == 0) --result;
 return result
}

function biNumBits(x) {
 var n = biHighIndex(x);
 var d = x.digits[n];
 var m = (n + 1) * bitsPerDigit;
 var result;
 for (result = m; result > m - bitsPerDigit; --result) {
  if ((d & 32768) != 0) break;
  d <<= 1
 }
 return result
}

function biMultiply(x, y) {
 var result = new BigInt;
 var c;
 var n = biHighIndex(x);
 var t = biHighIndex(y);
 var u, uv, k;
 for (var i = 0; i <= t; ++i) {
  c = 0;
  k = i;
  for (j = 0; j <= n; ++j, ++k) {
   uv = result.digits[k] + x.digits[j] * y.digits[i] + c;
   result.digits[k] = uv & maxDigitVal;
   c = uv >>> biRadixBits
  }
  result.digits[i + n + 1] = c
 }
 result.isNeg = x.isNeg != y.isNeg;
 return result
}

function biMultiplyDigit(x, y) {
 var n, c, uv;
 result = new BigInt;
 n = biHighIndex(x);
 c = 0;
 for (var j = 0; j <= n; ++j) {
  uv = result.digits[j] + x.digits[j] * y + c;
  result.digits[j] = uv & maxDigitVal;
  c = uv >>> biRadixBits
 }
 result.digits[1 + n] = c;
 return result
}

function arrayCopy(src, srcStart, dest, destStart, n) {
 var m = Math.min(srcStart + n, src.length);
 for (var i = srcStart, j = destStart; i < m; ++i, ++j) dest[j] = src[i]
}

function biShiftLeft(x, n) {
 var digitCount = Math.floor(n / bitsPerDigit);
 var result = new BigInt;
 arrayCopy(x.digits, 0, result.digits, digitCount, result.digits.length - digitCount);
 var bits = n % bitsPerDigit;
 var rightBits = bitsPerDigit - bits;
 for (var i = result.digits.length - 1, i1 = i - 1; i > 0; --i, --i1) result.digits[i] = result.digits[i] << bits & maxDigitVal | (result.digits[i1] & highBitMasks[bits]) >>> rightBits;
 result.digits[0] = result.digits[i] << bits & maxDigitVal;
 result.isNeg = x.isNeg;
 return result
}

function biShiftRight(x, n) {
 var digitCount = Math.floor(n / bitsPerDigit);
 var result = new BigInt;
 arrayCopy(x.digits, digitCount, result.digits, 0, x.digits.length - digitCount);
 var bits = n % bitsPerDigit;
 var leftBits = bitsPerDigit - bits;
 for (var i = 0, i1 = i + 1; i < result.digits.length - 1; ++i, ++i1) result.digits[i] = result.digits[i] >>> bits | (result.digits[i1] & lowBitMasks[bits]) << leftBits;
 result.digits[result.digits.length - 1] >>>= bits;
 result.isNeg = x.isNeg;
 return result
}

function biMultiplyByRadixPower(x, n) {
 var result = new BigInt;
 arrayCopy(x.digits, 0, result.digits, n, result.digits.length - n);
 return result
}

function biDivideByRadixPower(x, n) {
 var result = new BigInt;
 arrayCopy(x.digits, n, result.digits, 0, result.digits.length - n);
 return result
}

function biModuloByRadixPower(x, n) {
 var result = new BigInt;
 arrayCopy(x.digits, 0, result.digits, 0, n);
 return result
}

function biCompare(x, y) {
 if (x.isNeg != y.isNeg) return 1 - 2 * Number(x.isNeg);
 for (var i = x.digits.length - 1; i >= 0; --i)
  if (x.digits[i] != y.digits[i])
   if (x.isNeg) return 1 - 2 * Number(x.digits[i] > y.digits[i]);
   else return 1 - 2 * Number(x.digits[i] < y.digits[i]);
 return 0
}

function biDivideModulo(x, y) {
 var nb = biNumBits(x);
 var tb = biNumBits(y);
 var origYIsNeg = y.isNeg;
 var q, r;
 if (nb < tb) {
  if (x.isNeg) {
   q = biCopy(bigOne);
   q.isNeg = !y.isNeg;
   x.isNeg = false;
   y.isNeg = false;
   r = biSubtract(y, x);
   x.isNeg = true;
   y.isNeg = origYIsNeg
  } else {
   q = new BigInt;
   r = biCopy(x)
  }
  return new Array(q, r)
 }
 q = new BigInt;
 r = x;
 var t = Math.ceil(tb / bitsPerDigit) - 1;
 var lambda = 0;
 while (y.digits[t] < biHalfRadix) {
  y = biShiftLeft(y, 1);
  ++lambda;
  ++tb;
  t = Math.ceil(tb / bitsPerDigit) - 1
 }
 r = biShiftLeft(r, lambda);
 nb += lambda;
 var n = Math.ceil(nb / bitsPerDigit) -
  1;
 var b = biMultiplyByRadixPower(y, n - t);
 while (biCompare(r, b) != -1) {
  ++q.digits[n - t];
  r = biSubtract(r, b)
 }
 for (var i = n; i > t; --i) {
  var ri = i >= r.digits.length ? 0 : r.digits[i];
  var ri1 = i - 1 >= r.digits.length ? 0 : r.digits[i - 1];
  var ri2 = i - 2 >= r.digits.length ? 0 : r.digits[i - 2];
  var yt = t >= y.digits.length ? 0 : y.digits[t];
  var yt1 = t - 1 >= y.digits.length ? 0 : y.digits[t - 1];
  if (ri == yt) q.digits[i - t - 1] = maxDigitVal;
  else q.digits[i - t - 1] = Math.floor((ri * biRadix + ri1) / yt);
  var c1 = q.digits[i - t - 1] * (yt * biRadix + yt1);
  var c2 = ri * biRadixSquared + (ri1 * biRadix +
   ri2);
  while (c1 > c2) {
   --q.digits[i - t - 1];
   c1 = q.digits[i - t - 1] * (yt * biRadix | yt1);
   c2 = ri * biRadix * biRadix + (ri1 * biRadix + ri2)
  }
  b = biMultiplyByRadixPower(y, i - t - 1);
  r = biSubtract(r, biMultiplyDigit(b, q.digits[i - t - 1]));
  if (r.isNeg) {
   r = biAdd(r, b);
   --q.digits[i - t - 1]
  }
 }
 r = biShiftRight(r, lambda);
 q.isNeg = x.isNeg != origYIsNeg;
 if (x.isNeg) {
  if (origYIsNeg) q = biAdd(q, bigOne);
  else q = biSubtract(q, bigOne);
  y = biShiftRight(y, lambda);
  r = biSubtract(y, r)
 }
 if (r.digits[0] == 0 && biHighIndex(r) == 0) r.isNeg = false;
 return new Array(q, r)
}

function biDivide(x, y) {
 return biDivideModulo(x, y)[0]
}

function biModulo(x, y) {
 return biDivideModulo(x, y)[1]
}

function biMultiplyMod(x, y, m) {
 return biModulo(biMultiply(x, y), m)
}

function biPow(x, y) {
 var result = bigOne;
 var a = x;
 while (true) {
  if ((y & 1) != 0) result = biMultiply(result, a);
  y >>= 1;
  if (y == 0) break;
  a = biMultiply(a, a)
 }
 return result
}

function biPowMod(x, y, m) {
 var result = bigOne;
 var a = x;
 var k = y;
 while (true) {
  if ((k.digits[0] & 1) != 0) result = biMultiplyMod(result, a, m);
  k = biShiftRight(k, 1);
  if (k.digits[0] == 0 && biHighIndex(k) == 0) break;
  a = biMultiplyMod(a, a, m)
 }
 return result
}

function BarrettMu(m) {
 this.modulus = biCopy(m);
 this.k = biHighIndex(this.modulus) + 1;
 var b2k = new BigInt;
 b2k.digits[2 * this.k] = 1;
 this.mu = biDivide(b2k, this.modulus);
 this.bkplus1 = new BigInt;
 this.bkplus1.digits[this.k + 1] = 1;
 this.modulo = BarrettMu_modulo;
 this.multiplyMod = BarrettMu_multiplyMod;
 this.powMod = BarrettMu_powMod
}

function BarrettMu_modulo(x) {
 var q1 = biDivideByRadixPower(x, this.k - 1);
 var q2 = biMultiply(q1, this.mu);
 var q3 = biDivideByRadixPower(q2, this.k + 1);
 var r1 = biModuloByRadixPower(x, this.k + 1);
 var r2term = biMultiply(q3, this.modulus);
 var r2 = biModuloByRadixPower(r2term, this.k + 1);
 var r = biSubtract(r1, r2);
 if (r.isNeg) r = biAdd(r, this.bkplus1);
 var rgtem = biCompare(r, this.modulus) >= 0;
 while (rgtem) {
  r = biSubtract(r, this.modulus);
  rgtem = biCompare(r, this.modulus) >= 0
 }
 return r
}

function BarrettMu_multiplyMod(x, y) {
 var xy = biMultiply(x, y);
 return this.modulo(xy)
}

function BarrettMu_powMod(x, y) {
 var result = new BigInt;
 result.digits[0] = 1;
 while (true) {
  if ((y.digits[0] & 1) != 0) result = this.multiplyMod(result, x);
  y = biShiftRight(y, 1);
  if (y.digits[0] == 0 && biHighIndex(y) == 0) break;
  x = this.multiplyMod(x, x)
 }
 return result
};

//----------------------------------------------------------------------------------------------------------------------------------------
// NFEBALoginScript
var ajaxPageRefresh = window.ajaxPageRefresh;
if (ajaxPageRefresh == undefined) ajaxPageRefresh = false;
CONFIG = {
 logMode: "CONSOLE",
 operatingMode: "DEVELOPMENT",
 blockOnButtonClicksRequired: "N",
 blockOnHyperLinkClicksRequired: "N"
};
Constants = {
 CONTAINER_GROUPLET: "ContainerGrouplet",
 FEBA_TYPE: "data-febaType",
 FEBA_MANDATORY: "data-febaMandatory",
 FEBA_VALIDATION: "data-febaValidation",
 FEBA_COMMON: "common",
 FEBA_PAGE: "page",
 HREF: "href",
 FEBA_AJAXFEATURES: "ajaxfeatures",
 FEBA_EFFECTS: "visualeffects",
 ERRORDISPLAY_TAG: "MessageDisplay_TABLE",
 GROUPLET_ERRORDISPLAY_TAG: "MessageDisplay_GROUPLET_TABLE",
 PAGEHEADING_TAG: "PgHeading",
 ERROR_HIGHLIGHT_CLASS: "error_highlight",
 GENERAL_CLASS: "simpletext",
 TRUE: "true",
 DIV: "div",
 JSON: "json",
 JSON_TO_HTML_LIST: "jsontohtmllist",
 JSON_MULTIPLE: "jsonMultiple",
 STRING: "string",
 CANCEL: "cancel",
 IS_EXCLUDED: "data-isExcluded",
 IS_FATAL: "isFatal",
 COLON: ":",
 SUBMIT: "submit",
 RESET: "reset",
 ID: "id",
 NAME: "name",
 VALUE: "value",
 ACTION: "action",
 POST: "post",
 METHOD: "method",
 ENCTYPE: "enctype",
 MULTIPART: "multipart/form-data",
 REQUEST_ID: "requestId",
 INPUT: "INPUT",
 SELECT: "SELECT",
 ANCHOR: "A",
 TEXTFIELD: "text",
 GROUPLET_ID_ATTR: "data-groupletId",
 EXCEPTION_WIDGETS: "ExceptionWidgets",
 PROCESSING_MESSAGE: "",
 RELOADING_MESSAGE: "<h1>Exception occured .Reloading the Grouplet</h1>",
 X_REQUESTED_WITH: "X-Requested-With",
 GROUPLET_LOAD: "onload",
 FALSE: "false",
 RIA_UPLOAD_REQUEST: "RIAUploadRequest",
 IS_CSW_REQUEST: "__IS_CSW_REQUEST__",
 KEY: "data-key",
 ROW_SELECTED_STYLE: "data-rowselectedstyle",
 TABLE_TAG: "table",
 REQUEST_ID: "Requestid",
 TR_TAG: "tr",
 CROSS_SELL_CONTAINER: "CrossSellContainer",
 CROSS_SELL_GROUPLET: "cswGrouplet",
 GROUPLET_SEPERATOR: "_",
 MODAL_LOAD_PARAM: "::__IS_MODAL_LOAD__=Y",
 GROUPLET_ELEMENT_SEPERATOR: ":",
 AMPERSAND: "&",
 IS_NEW_TRANSACTION: "isInitiateNewTransaction",
 IS_PRINT: "data-isPrint",
 DYNAMIC_ATTR_SEPERATOR: "/",
 EXCEPTIONTYPE: "exceptionType",
 PARAMETERS_SEPERATOR: "::",
 SIMPLE_SELECT: "select-one",
 HIDDEN: "hidden",
 MULTIPLE_SELECT: "select-multiple",
 TEXTFIELD: "text",
 CHECKBOX: "checkBox",
 ASSIGNMENT: "=",
 UNDER_SCORE: "_",
 COMMA: ",",
 PIPE: "|",
 NULL: "NULL",
 RADIO: "radio",
 TARGET: "target",
 DOWNLOAD_LINK: "data-isDownloadLink",
 DOWNLOAD_BUTTON: "data-isDownloadButton",
 YES: "Y",
 FEBA_ADAPTIVEAUTH: "adaptiveauthentication",
 FEBA_ADAPTIVEAUTH_SOLUTION: "AdaptiveAuthSolution",
 RESPONSE_TYPE: "ResponseFormat",
 SPAN: "span_",
 UPDATE_PARENT_FROM_MODAL: "UPDATE_PARENT_FROM_MODAL",
 CONTROLLER_ARRAY: ["FinacleRiaRequest", "Finacle", "XService", "GDFPullServlet", "CxpsIBEventHandlerServlet", "CXPSGabDocReceiverServlet", "DevLogin", "AuthenticationController", "CMSServlet", "EventHandlerServlet"],
 LINK_SEPERATOR: "?"
};
LOG = {
 logArray: [],
 logMessages: function() {
  LOG.log("LOG", arguments)
 },
 logErrors: function() {
  LOG.log("ERROR", arguments)
 },
 logWarnings: function() {
  LOG.log("WARNING", arguments)
 },
 log: function(level, logArguments) {
  var message = "";
  var that = logArguments[0];
  if (that.name && that.version) message = that.name + " - " + that.version + ": ";
  for (i = 1; i < logArguments.length; i++) message += "  " + logArguments[i];
  LOG.logArray.push(message);
  if (CONFIG.logMode === "ALERT") alert(message);
  else if (CONFIG.logMode === "CONSOLE") logToConsole(level, logArguments);

  function logToConsole(level, logArguments) {
   if ("undefined" !== typeof window.console)
    if (level === "LOG") console.log(logArguments);
    else if (level === "ERROR") console.error(logArguments);
   else {
    if (level === "WARNING") console.warning(logArguments)
   } else return
  }
 }
};
LIB = {
 __ADD__: function(objects, object) {
  LOG.logMessages("In Add method adding the objects to array");
  objects.push(object)
 },
 __REMOVE__: function(objects, object) {
  objects = this.objects.without(object)
 },
 __START__: function(objects, flag) {
  LOG.logMessages("In Start method Starting the  objects");
  if (flag) {
   this.startFlag = true;
   objects.each(function(item) {
    if (Object.isFunction(item.startRequest)) item.startRequest();
    else throw new Error("Start function is undefined for object:" + item);
   })
  }
 },
 __STOP__: function(objects) {
  LOG.logMessages("In Stop method Stoping the  objects");
  this.startFlag = false;
  objects.each(function(item) {
   if (typeof item.stopRequest === "function") item.stopRequest();
   else throw new Error("Stop function is undefined for object:" + item);
  })
 },
 __IS_RUNNING__: function() {
  LOG.logMessages(this, "In IsRunning method,returns the startFlag value the start Flag value is   ", this.startFlag);
  return this.startFlag
 },
 __START_EVENT_LISTENING__: function(object) {
  if (typeof object.setListeners === "function") {
   LOG.logMessages(this, "In STARTEVENTLISTENING method which sets the event Listeners");
   object.setListeners()
  }
 },
 __STOP_EVENT_LISTENING__: function(object) {
  if (typeof object.removeListeners === "function") {
   LOG.logMessages(this, "In STOPTEVENTLISTENING method which removes the event Listeners");
   object.removeListeners()
  }
 },
 __GET_DOM__: function(element) {
  var result = feba.domManipulator.getElementById(element)[0];
  return result
 },
 __TO_STRING__: function(object) {
  var objectString = "";
  for (var key in object)
   if (typeof object[key] !== "function") objectString += object[key];
  return objectString
 },
 __GET_OPTIONS_BY_SPLIT__: function(value) {
  var splitResult = value.split("|");
  return new Option(splitResult[1], splitResult[0])
 },
 __GET_ELEMENT_BY_ATTRIBUTE__: function(attribute, value) {
  var elements = jQuery("[" + attribute + '="' + value + '"]');
  return elements
 },
 __CREATE_DIALOG__: function(modalFeature) {
  modalFeature.options.processingDivId = "dialogProcessing_" + modalFeature.options.source;
  modalFeature.options.dialogContent = jQuery("<div id=modalDialog><div id=MODAL_VIEW_CONTAINER><div id=" + modalFeature.options.processingDivId + "></div></div></div>");
  modalFeature.options.modalDialog = feba.domManipulator.getElement(modalFeature.options.dialogContent).dialog({
   autoOpen: false,
   show: "slide",
   minHeight: modalFeature.options.height || "auto",
   width: modalFeature.options.width || "auto",
   draggable: false,
   resizable: false,
   closeOnEscape: false,
   modal: true,
   title: modalFeature.options.title || "",
   closeText: getMessage("close"),
   position: [x, y],
   beforeClose: function() {
    modalFeature.setOptions(modalFeature.originalOptions);
    modalFeature.options.modalDialog.dialog("destroy");
    feba.domManipulator.getElementById("MODAL_VIEW_CONTAINER").remove()
   }
  });
  if (modalFeature.options.appendTo) {
   var appendToElement = feba.domManipulator.getGroupletSpecificElement(modalFeature.options.appendTo, modalFeature.options.__GROUPLET_ID__);
   var x = feba.domManipulator.getElement(appendToElement).position().left + feba.domManipulator.getElement(appendToElement).outerWidth();
   var y = feba.domManipulator.getElement(appendToElement).position().top - feba.domManipulator.getElement(document).scrollTop();
   modalFeature.options.modalDialog.dialog("option", "position", [x, y])
  }
  if (modalFeature.name == "feba.js.ajax.modalView" && (modalFeature.options.abortEvent == undefined || modalFeature.options.abortEvent == null)) modalFeature.options.modalDialog.dialog("option", "open", function(event, ui) {
   feba.domManipulator.getElement(".ui-dialog-titlebar-close", ui.dialog || ui).hide()
  });
  if (modalFeature.name == "feba.js.ajax.modalBoxRequest") modalFeature.options.modalDialog.dialog("option", "beforeClose", function() {
   modalFeature.options.modalDialog.dialog("destroy");
   feba.domManipulator.getElementById(modalFeature.options.source).focus();
   modalFeature.setOptions(modalFeature.originalOptions)
  });
  modalFeature.originalOptions.processingDivId = modalFeature.options.processingDivId;
  modalFeature.originalOptions.dialogContent = modalFeature.options.dialogContent;
  modalFeature.originalOptions.modalDialog = modalFeature.options.modalDialog
 },
 __HANDLE_ERROR__: function(riaFeatureID, formattedError, FormFieldsInError, groupletId, displayExceptions, isInvokedFromGrouplet, source) {
  if (riaFeatureID != null) {
   formattedError = formattedError.replace(Constants.ERRORDISPLAY_TAG, Constants.ERRORDISPLAY_TAG + "_" + riaFeatureID);
   var errorDisplayTag = Constants.ERRORDISPLAY_TAG + "_" + riaFeatureID
  } else var errorDisplayTag = Constants.ERRORDISPLAY_TAG;
  var pgHeadingTag = Constants.PAGEHEADING_TAG;
  var groupletErrorDisplayTag = Constants.GROUPLET_ERRORDISPLAY_TAG;
  if (groupletId && groupletId != "null") {
   errorDisplayTag = groupletId + ":" + Constants.ERRORDISPLAY_TAG;
   pgHeadingTag = groupletId + ":" + Constants.PAGEHEADING_TAG;
   groupletErrorDisplayTag = groupletId + ":" + Constants.GROUPLET_ERRORDISPLAY_TAG
  }
  if (isInvokedFromGrouplet) errorDisplayTag = groupletErrorDisplayTag;
  if (LIB.__GET_DOM__(errorDisplayTag)) feba.domManipulator.replaceWith(feba.domManipulator.getElementById(errorDisplayTag), "");
  if (displayExceptions) displayExceptions = String(displayExceptions).toLowerCase();
  if (displayExceptions !== Constants.TRUE) return;
  if (LIB.__GET_DOM__(errorDisplayTag) === undefined) feba.domManipulator.after(feba.domManipulator.getElementById(pgHeadingTag), formattedError);
  else feba.domManipulator.replaceWith(feba.domManipulator.getElementById(errorDisplayTag), formattedError);
  var value = FormFieldsInError;
  var error_in_src = false;
  feba.domManipulator.each(value, function(index, val) {
   var elements = LIB.__GET_ELEMENT_BY_ATTRIBUTE__("for", val);
   var element = elements[0];
   if (element)
    if (val == source) {
     error_in_src = true;
     feba.domManipulator.addClass(element, Constants.ERROR_HIGHLIGHT_CLASS)
    }
  });
  if (!error_in_src) {
   var elements = LIB.__GET_ELEMENT_BY_ATTRIBUTE__("for", source);
   var element = elements[0];
   feba.domManipulator.removeClass(element, Constants.ERROR_HIGHLIGHT_CLASS);
   feba.domManipulator.addClass(element, Constants.GENERAL_CLASS)
  }
 },
 __ADD_POLITE_LIVE_REGION__: function(target) {
  feba.domManipulator.setAttribute(feba.domManipulator.getElement(target), "aria-live", "polite")
 }
};
feba = {
 name: "feba",
 description: "",
 version: "1.0",
 moduleId: "",
 scriptsPath: "",
 isPortalRequest: "",
 isVdtMode: "",
 nodePath: "",
 contextPath: "",
 ipAddress: "",
 febaObjects: [],
 startFlag: true,
 add: function(object) {
  LIB.__ADD__(this.febaObjects, object)
 },
 remove: function(object) {
  LIB.__REMOVE__(this.febaObjects, object)
 },
 startRequest: function() {
  LIB.__START__.bind(this)(this.febaObjects, true)
 },
 stopRequest: function() {
  LIB.__STOP__.bind(this)(this.febaObjects)
 },
 isRunning: function() {
  LIB.__IS_RUNNING__.bind(this)()
 },
 initialize: function() {
  var includes = [];
  var scriptTags = [];
  var index = 0;
  scriptTags = document.getElementsByTagName("script");
  while (index < scriptTags.length) {
   if (scriptTags[index].src && scriptTags[index].src.match(/FEBALoginScript\.js(\?.*)?$/)) break;
   index++
  }
  includes = scriptTags[index].src.match(/\?.*moduleId=[\w\W]*/);
  var params = includes[0].split(",");
  if (params.length < 6) return;
  var i = 0;
  this.moduleId = params[i++].split("=")[1];
  this.scriptsPath = params[i++].split("=")[1];
  this.isVdtMode = params[i++].split("=")[1];
  this.nodePath = params[i++].split("=")[1];
  this.ipAddress = params[i++].split("=")[1];
  this.contextPath = params[i++].split("=")[1];
  this.scriptsPath = this.contextPath + this.scriptsPath;
  if (this.isVdtMode == "true") document.write('<script language="javascript" type="text/javascript" src="../scripts/common/NFEBAWorkbench.js?isPortletRequest=false,nodePath=' + this.nodePath + '">\x3c/script>');
  else {
   feba.domManipulator.write('<script type="text/JavaScript" src="' + this.scriptsPath + '/common/NFEBAFunctionLoader.js">\x3c/script>');
   feba.domManipulator.write('<script type="text/JavaScript" src="' + this.scriptsPath + '/common/Ncooltree.js">\x3c/script>');
   feba.domManipulator.write('<script type="text/JavaScript" src="' + this.scriptsPath + '/ria/ajaxfeatures/jquerymin.js">\x3c/script>');
   feba.domManipulator.write('<script type="text/JavaScript" src="' + this.scriptsPath + '/ria/ajaxfeatures/jquery.class.js">\x3c/script>');
   feba.domManipulator.write('<script type="text/JavaScript" src="' + this.scriptsPath + '/common/NFEBALoginJavaScript.js">\x3c/script>')
  }
 },
 toString: function() {
  return this.name + LIB.__TO_STRING__(this.febaObjects)
 }
};
feba.useCase = {};
feba.domManipulator = {
 getElementById: function(id) {
  try {
   return jQuery('[id="' + id + '"]')
  } catch (e) {
   return jQuery(document.getElementById(id))
  }
 },
 getElementByName: function(name) {
  try {
   return jQuery('[name="' + name + '"]')
  } catch (e) {
   LOG.logMessages("Exception occurred in getElementById " + e.message);
   throw e;
  }
 },
 getElement: function(element) {
  try {
   return jQuery(element)
  } catch (e) {
   LOG.logMessages("Exception occurred in getElement " + e.message);
   throw e;
  }
 },
 getGroupletSpecificElement: function(elementId, groupletId) {
  try {
   if (isGroupletId(elementId, groupletId)) return LIB.__GET_DOM__(groupletId + Constants.GROUPLET_ELEMENT_SEPERATOR + elementId);
   return LIB.__GET_DOM__(elementId)
  } catch (e) {
   LOG.logMessages("Exception occurred in getGroupletSpecificElement " + e.message);
   throw e;
  }
 },
 getGroupletSpecificElementValue: function(elementId, groupletId) {
  return jQuery(feba.domManipulator.getGroupletSpecificElement(elementId, groupletId)).val()
 },
 getIdWithAppend: function(id, content) {
  try {
   return jQuery("#" + id + content)
  } catch (e) {
   LOG.logMessages("Exception occurred in getIdWithAppend " + e.message);
   throw e;
  }
 },
 getAttribute: function(element, attribute) {
  try {
   return jQuery(element).attr(attribute)
  } catch (e) {
   LOG.logMessages("Exception occurred in getAttribute " + e.message);
   throw e;
  }
 },
 getClosestElement: function(element, selector) {
  try {
   return element.closest(selector)
  } catch (e) {
   LOG.logMessages("Exception occurred in getClosestElement " + e.message);
   throw e;
  }
 },
 clone: function(element) {
  return element.clone()
 },
 setAttribute: function(jQueryElement, attribute, value) {
  try {
   return jQueryElement.attr(attribute, value)
  } catch (e) {
   LOG.logMessages("Exception occurred in setAttribute " + e.message);
   throw e;
  }
 },
 getElementStartingWith: function(idStartingWith) {
  try {
   return jQuery('[id^="' + idStartingWith + '"]')
  } catch (e) {
   LOG.logMessages("Exception occurred in getElementStartingWith " + e.message);
   throw e;
  }
 },
 inArray: function(value, array) {
  try {
   for (var i = 0; i < array.length; i++) {
    var s = array[i];
    if (value.indexOf(s) != -1) return 0
   }
   return -1
  } catch (e) {
   LOG.logMessages("Exception occurred in inArray " + e.message);
   throw e;
  }
 },
 trim: function(element) {
  try {
   return jQuery.trim(element)
  } catch (e) {
   LOG.logMessages("Exception occurred in trim " + e.message);
   throw e;
  }
 },
 each: function(collection, fn) {
  try {
   return jQuery.each(collection, fn)
  } catch (e) {
   LOG.logMessages("Exception occurred in each " + e.message);
   throw e;
  }
 },
 click: function(element, fn) {
  try {
   return element.click(fn)
  } catch (e) {
   LOG.logMessages("Exception occurred in click " + e.message)
  }
 },
 preventDefault: function(event) {
  try {
   return event.preventDefault()
  } catch (e) {
   LOG.logMessages("Exception occurred in preventDefault " + e.message)
  }
 },
 stopImmediatePropagation: function(event) {
  try {
   return event.stopImmediatePropagation()
  } catch (e) {
   LOG.logMessages("Exception occurred in preventDefault " + e.message)
  }
 },
 trigger: function(element, event) {
  try {
   return element.trigger(event)
  } catch (e) {
   LOG.logMessages("Exception occurred in trigger " + e.message)
  }
 },
 bind: function(element, event, data, fn) {
  try {
   return element.bind(event, data, fn)
  } catch (e) {
   LOG.logMessages("Exception occurred in bind " + e.message)
  }
 },
 getElementIdFromEvent: function(event) {
  try {
   return event.target.id
  } catch (e) {
   LOG.logMessages("Exception occurred in getElementIdFromEvent " + e.message);
   throw e;
  }
 },
 addClass: function(element, newClass) {
  try {
   return element.addClass(newClass)
  } catch (e) {
   LOG.logMessages("Exception occurred in addClass " + e.message)
  }
 },
 getElementEndingWith: function(idEndingWith) {
  try {
   return jQuery('[id$="' + idEndingWith + '"]')
  } catch (e) {
   LOG.logMessages("Exception occurred in getElementEndingWith " + e.message);
   throw e;
  }
 },
 css: function(element, property, value) {
  try {
   return element.css(property, value)
  } catch (e) {
   LOG.logMessages("Exception occurred in css " + e.message)
  }
 },
 setCssProperties: function(element, properties) {
  try {
   return element.css(properties)
  } catch (e) {
   LOG.logMessages("Exception occurred in setCssProperties " + e.message);
   throw e;
  }
 },
 remove: function(element) {
  try {
   return element.remove()
  } catch (e) {
   LOG.logMessages("Exception occurred in remove " + e.message)
  }
 },
 extendObject: function(newFields, base) {
  try {
   return jQuery.extend(newFields, base)
  } catch (e) {
   LOG.logMessages("Exception occurred in extendObject " + e.message)
  }
 },
 serialize: function(element) {
  try {
   return element.serialize()
  } catch (e) {
   LOG.logMessages("Exception occurred in serialize " + e.message);
   throw e;
  }
 },
 replaceWith: function(original, newVal) {
  try {
   return original.replaceWith(newVal)
  } catch (e) {
   LOG.logMessages("Exception occurred in replaceWith " + e.message)
  }
 },
 getImmediateAncestor: function(element, selector) {
  try {
   return jQuery(element).closest(selector)
  } catch (e) {
   LOG.logMessages("Exception occurred in getImmediateAncestor " + e.message);
   throw e;
  }
 },
 prev: function(element, value) {
  try {
   return element.prev(value)
  } catch (e) {
   LOG.logMessages("Exception occurred in prev " + e.message);
   throw e;
  }
 },
 addClass: function(element, className) {
  try {
   jQuery(element).addClass(className)
  } catch (e) {
   LOG.logMessages("Exception occurred in addClass " + e.message);
   throw e;
  }
 },
 append: function(element, content) {
  try {
   return element.append(content)
  } catch (e) {
   LOG.logMessages("Exception occurred in append " + e.message);
   throw e;
  }
 },
 removeClass: function(element, className) {
  try {
   jQuery(element).removeClass(className)
  } catch (e) {
   LOG.logMessages("Exception occurred in removeClass " + e.message)
  }
 },
 children: function(parent) {
  try {
   return parent.children()
  } catch (e) {
   LOG.logMessages("Exception occurred in children " + e.message);
   throw e;
  }
 },
 before: function(original, newContent) {
  try {
   return original.before(newContent)
  } catch (e) {
   LOG.logMessages("Exception occurred in before " + e.message);
   throw e;
  }
 },
 after: function(original, newContent) {
  try {
   return original.after(newContent)
  } catch (e) {
   LOG.logMessages("Exception occurred in after " + e.message);
   throw e;
  }
 },
 find: function(element, selector) {
  try {
   return element.find(selector)
  } catch (e) {
   LOG.logMessages("Exception occurred in find " + e.message);
   throw e;
  }
 },
 getChildren: function(element, selector) {
  try {
   return jQuery(element).children(selector)
  } catch (e) {
   LOG.logMessages("Exception occurred in getChildren " + e.message);
   throw e;
  }
 },
 map: function(data, fn) {
  try {
   return jQuery.map(data, fn)
  } catch (e) {
   LOG.logMessages("Exception occurred in map " + e.message)
  }
 },
 createBaseClass: function(name, setup, description) {
  try {
   return jQuery.Class.extend(name, setup, description)
  } catch (e) {
   LOG.logMessages("Exception occurred in createBaseClass " + e.message);
   throw e;
  }
 },
 createChildClass: function(baseClass, childClass, setup, description) {
  try {
   return baseClass.extend(childClass, setup, description)
  } catch (e) {
   LOG.logMessages("Exception occurred in createChildClass " + e.message);
   throw e;
  }
 },
 ajax: function(options) {
  try {
   return jQuery.ajax(options)
  } catch (e) {
   LOG.logMessages("Exception occurred in ajax " + e.message);
   throw e;
  }
 },
 blockUI: function(attributes) {
  try {
   return jQuery.blockUI(attributes)
  } catch (e) {
   LOG.logMessages("Exception occurred in blockUI " + e.message)
  }
 },
 unblockUI: function() {
  jQuery.unblockUI()
 },
 modal: function(content, defaultValues) {
  try {
   return jQuery.modal(content, defaultValues)
  } catch (e) {
   LOG.logMessages("Exception occurred in modal " + e.message);
   throw e;
  }
 },
 closeModal: function() {
  try {
   return jQuery.modal.close()
  } catch (e) {
   LOG.logMessages("Exception occurred in closeModal " + e.message);
   throw e;
  }
 },
 showCallout: function(e) {
  calloutObject = new Object;
  if (e.response == null || e.response == "") calloutObject = {
   content: {
    title: {
     text: false
    }
   },
   show: {
    when: {
     event: " focus mouseover"
    }
   },
   hide: "blur  mouseout"
  };
  else calloutObject = {
   content: {
    text: String(e.response)
   },
   show: {
    ready: true,
    when: {
     event: "focus mouseover"
    }
   },
   hide: "blur mouseout"
  };
  e.eventElement.qtip(calloutObject)
 },
 getElementOfClass: function(cssClass) {
  try {
   return jQuery("." + cssClass)
  } catch (e) {
   LOG.logMessages("Exception occurred in getElementOfClass " + e.message);
   throw e;
  }
 },
 hideElement: function(element) {
  try {
   return jQuery(element).hide()
  } catch (e) {
   LOG.logMessages("Exception occurred in hideElement " + e.message);
   throw e;
  }
 },
 stringify: function(jsonObject) {
  try {
   return JSON.stringify(jsonObject)
  } catch (e) {
   LOG.logMessages("Exception occurred in stringify " + e.message)
  }
 },
 stringEndsWith: function(inputString, suffix) {
  try {
   return inputString.indexOf(suffix, inputString.length - suffix.length) !== -1
  } catch (e) {
   LOG.logMessages("Exception occurred in stringEndsWith " + e.message);
   throw e;
  }
 },
 clone: function(element) {
  try {
   return element.clone()
  } catch (e) {
   LOG.logMessages("Exception occurred in clone " + e.message)
  }
 },
 contents: function(element) {
  try {
   return element.contents()
  } catch (e) {
   LOG.logMessages("Exception occurred in contents " + e.message);
   throw e;
  }
 },
 getFirstElementOfList: function(listId) {
  try {
   return jQuery("#" + listId + " li:first-child")
  } catch (e) {
   LOG.logMessages("Exception occurred in getFirstElementOfList " + e.message);
   throw e;
  }
 },
 getLastElementOfList: function(listId) {
  try {
   return jQuery("#" + listId + " li:last-child")
  } catch (e) {
   LOG.logMessages("Exception occurred in getLastElementOfList " + e.message);
   throw e;
  }
 },
 block: function(element, attributes) {
  try {
   element.block(attributes)
  } catch (e) {
   LOG.logMessages("Exception occurred in block " + e.message)
  }
 },
 isHidden: function(element) {
  try {
   if (feba.domManipulator.getAttribute(element, "type") == Constants.HIDDEN) return true;
   return false
  } catch (e) {
   LOG.logMessages("Exception occurred in isHidden " + e.message);
   throw e;
  }
 },
 height: function(target, initialHeight) {
  try {
   if (initialHeight) return target.height(initialHeight);
   return target.height()
  } catch (e) {
   LOG.logMessages("Exception occurred in isHidden " + e.message);
   throw e;
  }
 },
 width: function(target, initialWidth) {
  try {
   if (initialWidth) return target.width(initialWidth);
   return target.width()
  } catch (e) {
   LOG.logMessages("Exception occurred in isHidden " + e.message);
   throw e;
  }
 },
 disableCutCopyPaste: function(groupletId) {
  jQuery(getSpecifiedElements(groupletId, ":password")).bind("copy paste cut", function(e) {
   e.preventDefault();
   alert("cut,copy & paste options are disabled !!")
  })
 },
 hasValue: function(element) {
  try {
   if (element && feba.domManipulator.getAttribute(element, "value") != "") return true;
   return false
  } catch (e) {
   LOG.logMessages("Exception occurred in hasValue " + e.message);
   throw e;
  }
 },
 documentReady: function(functionName) {
  jQuery(document).ready(function() {
   functionName()
  })
 },
 addData: function(element, key, value) {
  jQuery(element).data(key, value)
 },
 getData: function(element, key) {
  return jQuery(element).data(key)
 },
 val: function(element, value) {
  jQuery(element).val(value)
 },
 hasValueForId: function(elementId) {
  try {
   if (feba.domManipulator.getAttribute(feba.domManipulator.getElementById(elementId), "value") != "") return true;
   return false
  } catch (e) {
   LOG.logMessages("Exception occurred in hasValueForId " + e.message);
   throw e;
  }
 },
 isChecked: function(elementId) {
  try {
   if (feba.domManipulator.getAttribute(feba.domManipulator.getElementById(elementId), "checked") != true) return true;
   return false
  } catch (e) {
   LOG.logMessages("Exception occurred in isChecked " + e.message);
   throw e;
  }
 },
 getType: function(elementId) {
  try {
   return feba.domManipulator.getAttribute(feba.domManipulator.getElementById(elementId), "type")
  } catch (e) {
   LOG.logMessages("Exception occurred in getType " + e.message);
   throw e;
  }
 },
 disableField: function(target) {
  try {
   if (target.type == Constants.SIMPLE_SELECT || target.type == Constants.MULTIPLE_SELECT) target.disabled = true;
   else if (target.type == Constants.RADIO) {
    var element = feba.domManipulator.getElementByName(target.name);
    element.each(function() {
     feba.domManipulator.getElement(this).checked = false
    })
   } else target.value = ""
  } catch (e) {
   LOG.logMessages("Exception occurred in disableField " + e.message);
   throw e;
  }
 },
 parent: function(children) {
  var elements = jQuery(children).parent();
  return elements[0]
 },
 createDivElement: function(idn, className) {
  return jQuery("<div/>").attr({
   "id": idn,
   "class": className
  })
 },
 createSpanElement: function(idn, className) {
  return jQuery("<span/>").attr({
   "id": idn,
   "class": className
  })
 },
 createParaElement: function(idn, className) {
  return jQuery("<p/>").attr({
   "id": idn,
   "class": className
  })
 },
 createBreakElement: function() {
  return jQuery("<br/>")
 },
 loadScript: function(scriptPath) {
  feba.domManipulator.append(feba.domManipulator.getElement("head"), '<script type="text/javascript" src="' + feba.contextPath + scriptPath + '">\x3c/script>')
 },
 getElementEndingWith: function(idEndingWith) {
  return jQuery("[id$='" + idEndingWith + "']")
 },
 createLabelElement: function(className, description) {
  var label = jQuery("<label/>").attr({
   "class": className
  });
  label.html(description);
  return jQuery("<span/>").append(label)
 },
 addCheckBox: function(targetName, optionValue, optionDescription, checked) {
  var checkBox = jQuery("<input/>").attr({
   "type": "checkBox",
   "name": targetName,
   "value": optionValue,
   "checked": checked
  });
  var label = jQuery("<label/>").html(optionDescription);
  return jQuery("<span/>").append(checkBox).append(label)
 },
 addRadioButton: function(targetName, optionValue, optionDescription, checked) {
  var radio = jQuery("<input/>").attr({
   "type": "radio",
   "name": targetName,
   "value": optionValue,
   "checked": checked
  });
  var label = jQuery("<label/>").html(optionDescription);
  return jQuery("<span/>").append(radio).append(label)
 },
 addHiddenTextElement: function(name, value) {
  return jQuery("<input/>").attr({
   "type": Constants.HIDDEN,
   "name": name,
   "value": value
  })
 },
 getTableElement: function() {
  return jQuery("<table/>")
 },
 getRowElementForTable: function() {
  return jQuery("<tr>")
 },
 getCellForRow: function() {
  return jQuery("<td>")
 },
 appendChild: function(parent, child) {
  jQuery(parent).append(child)
 },
 createTable: function(tableProperties, content, targetContent) {
  var counter = 0;
  if (content) {
   var selectedValues = feba.domManipulator.getSelectedValues(tableProperties.targetName, targetContent);
   var table = feba.domManipulator.getTableElement();
   feba.domManipulator.addClass(table, tableProperties.table_style);
   var row = feba.domManipulator.getRowElementForTable();
   feba.domManipulator.appendChild(table, row);
   feba.domManipulator.addClass(row, tableProperties.row_style + " " + "dynamicFeature");
   feba.domManipulator.each(content, function(index, value) {
    var splitResult = value.split(Constants.PIPE);
    var optionDescription = splitResult[1];
    var optionValue = splitResult[0];
    var dynamicElement = feba.domManipulator.createDynamicElement(value, tableProperties.targetName, tableProperties.inputType, selectedValues);
    var td = feba.domManipulator.getCellForRow();
    feba.domManipulator.addClass(td, tableProperties.column_style + " " + "dynamicFeatureCol");
    feba.domManipulator.addClass(dynamicElement, tableProperties.element_style);
    feba.domManipulator.appendChild(td, dynamicElement);
    var tr = feba.domManipulator.find(table, "tr:last");
    feba.domManipulator.appendChild(tr, td);
    counter++;
    if (counter == tableProperties.no_of_columns) {
     row = feba.domManipulator.getRowElementForTable();
     feba.domManipulator.appendChild(table, row);
     feba.domManipulator.addClass(row, tableProperties.row_style + " " + "dynamicFeature");
     counter = 0
    }
   });
   return table
  }
 },
 getSelectedValues: function(targetName, targetContent) {
  var selectedValues = "";
  if (targetContent) {
   var tar = Constants.TARGET + Constants.UNDER_SCORE + targetName;
   if (targetContent[tar]) selectedValues = targetContent[tar]
  }
  return selectedValues
 },
 checkValue: function(selectedValues, optionValue) {
  if (selectedValues) {
   if (selectedValues === optionValue) return true;
   var length = selectedValues.length;
   for (var i = 0; i < length; i++)
    if (selectedValues[i] == optionValue) return true
  }
  return false
 },
 createDynamicElement: function(value, target, targetType, selectedValues) {
  var input = targetType == Constants.CHECKBOX || targetType == Constants.RADIO;
  var splitResult = String(value).split(Constants.PIPE);
  var optionDescription = splitResult[1];
  var optionValue = splitResult[0];
  if (input == true) switch (targetType) {
   case Constants.CHECKBOX:
    dynamicElement = feba.domManipulator.addCheckBox(target, optionValue, optionDescription, feba.domManipulator.checkValue(selectedValues, optionValue));
    break;
   case Constants.RADIO:
    dynamicElement = feba.domManipulator.addRadioButton(target, optionValue, optionDescription, feba.domManipulator.checkValue(selectedValues, optionValue));
    break
  }
  return dynamicElement
 },
 closeActivePulldown: function(event) {
  if (event.type == "click" && feba.activePulldown) {
   hidePullDownMenu(feba.activePulldown);
   jQuery(document).unbind(".pulldown")
  }
 },
 write: function(value) {
  if (ajaxPageRefresh) jQuery(document).append(value);
  else document.write(value)
 },
 stopPropagation: function(event) {
  jQuery.Event(event).stopPropagation()
 },
 stopImmediatePropagation: function(event) {
  jQuery.Event(event).stopImmediatePropagation()
 }
};
feba.initialize();

//-------------------------------------------------------------------------------------------------------------------------------------









/*
 * Function to check JavaScript enabled settings specific to a browser
 */
function checkIfJavaEnabled() {
 if (BrowserDetect.browser == "Explorer") {
  var oVDiv1 = document.getElementById('divApplet');
  if (oVDiv1 != null) {
   var msg = getMessage("BrowserNtJavaEn");
   alert(msg);
   return false;
  }
  var appletName = document.getElementById("FINEBApplet");
  appletName = "" + appletName;
  if (appletName.indexOf("object") != -1) {
   var msg = getMessage("BrowserNtJavaEn");
   alert(msg);
   return false;
  }
 } else {
  if (!navigator.javaEnabled()) {
   var msg = getMessage("BrowserNtJavaEn");
   alert(msg);
   return false;
  }
 }
 return true;
}

/*
 * Method which routes the call to 
 * JavaScriptEncryption or AppletEncryption based on a key (__JS_ENCRYPT_KEY__)
 */
function encryptValues(groupletId, isPortal, isModalView) {
 goAhead();
 LOG.logMessages("Value for isAppletEncryptionRequired: " + isAppletEncryptionRequired(groupletId));
 encryptUsingJS(groupletId, isPortal, isModalView);
 if (groupletId != null && !isPortal) {
  // Don't submit the page (the JS does it)
  return false;
 }
 return true;
}

/*
 * Function responsible for JavaScriptEncryption
 * Modified by Piyasha as a part of E&Y Fixes Recon
 */
function encryptUsingJS(groupletId, isPortal, isModalView) {
 LOG.logMessages("Encyrpting using JavaScript");
 var callbackFunc = function(publicKey) {
  var totalElements;
  var textElements;
  if (isModalView) {
   totalElements = getSpecifiedElements("MODAL_VIEW_CONTAINER", ':password', isPortal);
  } else {
   totalElements = getSpecifiedElements(groupletId, ':password', isPortal);
  }
  //var totalElements = getSpecifiedElements(groupletId,':password',isPortal);
  // Modified by Piyasha for MITM FT Issue
  if (isModalView) {
   textElements = getSpecifiedElements("MODAL_VIEW_CONTAINER", ":text:'[encryptionRequired=true]'", isPortal);
  } else {
   textElements = getSpecifiedElements(groupletId, ":text:'[encryptionRequired=true]'", isPortal);
  }
  //var textElements = getSpecifiedElements(groupletId,":text:'[encryptionRequired=true]'",isPortal);
  for (var count = 0; count < textElements.length; count++) {
   totalElements.push(textElements[count])
  }
  var length = totalElements.length;
  for (var i = 0; i < length; i++) {
   var passwordElement = totalElements[i];
   if ((passwordElement.type == 'password' && passwordElement.value != '') || (passwordElement.type == 'text' && passwordElement.value != '')) {
    var originalValue = passwordElement.value;
    jQuery.jCryption.encrypt(
     "password=" + originalValue + "_SALT_COMPONENT_=" + Math.random(),
     publicKey,
     function(encrypted, passwordElement) {
      /* change the maxlength of password length to accomodate encrypted password. 
       * Safari will trim the value based on password length*/
      passwordElement.setAttribute("maxlength", encrypted.length);
      passwordElement.value = encrypted;
     }, passwordElement);
   }
  }
  feba.domManipulator.getGroupletSpecificElement("__JS_ENCRYPT_KEY__", groupletId).value = "";
 };
 getPublicKeyFromServer(callbackFunc, groupletId);
}

/*
 * Function responsible for getting the public key to aid JavaScriptEncryption
 * Modified by Piyasha as a part of E&Y Fixes Recon
 */
function getPublicKeyFromServer(callback, groupletId) {
 // LOG.logMessages("In getPublicKeyFromServer");
 var jCryptionKeyPair = function(encryptionExponent, modulus, maxdigits) {

  /* LOG.logMessages("In anonymous function to construct JCryptionKeyPair");
   LOG.logMessages("encryptionExponent : "+ encryptionExponent);
   LOG.logMessages("modulus : "+ modulus);
   LOG.logMessages("max Digits: "+ maxdigits);*/

  setMaxDigits(parseInt(maxdigits, 10));
  this.e = biFromHex(encryptionExponent);
  this.m = biFromHex(modulus);
  this.chunkSize = 2 * biHighIndex(this.m);
  this.radix = 16;
  this.barrett = new BarrettMu(this.m);
 };
 var bUrl = feba.domManipulator.getGroupletSpecificElement("__JS_ENCRYPT_KEY__", groupletId).value;
 var encryptionExponent = bUrl.split(",")[0];
 var modulus = bUrl.split(",")[1];
 var maxDigits = bUrl.split(",")[2];
 var keys = new jCryptionKeyPair(encryptionExponent, modulus, maxDigits);
 callback(keys);
}

/*
 * Function responsible for AppletEncryption
 * Modified by Piyasha as a part of E&Y Fixes Recon
 */
function encryptUsingApplet(groupletId, isPortal) {

 try { //Temporary only. Should be removed after 10.3.5 fix for Chrome is merged to 11
  LOG.logMessages("Encrypting using applet");
  LOG.logMessages("Value for checkIfJavaEnabled: " + checkIfJavaEnabled());
  if (!checkIfJavaEnabled()) {
   return false;
  }
  var totalElements = getSpecifiedElements(groupletId, ':password', isPortal);
  var length = totalElements.length;

  for (var i = 0; i < length; i++) {
   var passwordElement = totalElements[i];
   var initialValue = passwordElement.value;
   if (passwordElement.type == 'password' && (passwordElement.value != '')) {
    feba.domManipulator.getGroupletSpecificElement("FINEBApplet", groupletId).execute(initialValue);
    var javascript_var = feba.domManipulator.getGroupletSpecificElement("FINEBApplet", groupletId).encryptedString;
    passwordElement.value = javascript_var;
   }
  }
 } catch (e) { //Temporary only. Should be removed after 10.3.5 fix for Chrome is merged to 11
  if (BrowserDetect.browser == "Chrome" || BrowserDetect.browser == "Safari") {
   /*Chrome specific logic. Is a work around only. In 10.3.5, the proper fix has been done and will be merged to 11*/
   //Set a flag indicating to the browser that encryption was not done
  }
 }
}

/*
 * Function which checks if JavaScriptEncryption based on a key
 * feba.domManipulator.getGroupletSpecificElement looks for a element present in the page that is being loaded
 * in this case __JS_ENCRYPT_KEY__ used as deciding factor for JSEncryption is enabled based on the 
 * encryption mechanism specified in AppConfig.xml
 */
function isJavaScriptEncryptionRequired(groupletId) {
 return (feba.domManipulator.getGroupletSpecificElement("__JS_ENCRYPT_KEY__", groupletId));
}

/*
 * Function which checks if AppletEncryption based on the presence of Applet Id
 * feba.domManipulator.getGroupletSpecificElement looks for a element present in the page that is being loaded
 * in this case FINEBApplet used as deciding factor for AppletEncryption is enabled based on the 
 * encryption mechanism specified in AppConfig.xml
 */
function isAppletEncryptionRequired(groupletId) {
 return (feba.domManipulator.getGroupletSpecificElement("FINEBApplet", groupletId));
}

/*
 * Method which other buttons except the one on which encryption happens
 */
function disableButton(buttonId, groupletId, isPortal) {
 var oButton = document.getElementById(buttonId);
 var submitElements = getSpecifiedElements(groupletId, 'input:submit', isPortal);
 var length = submitElements.length;
 for (i = 0; i < length; i++) {
  if (submitElements[i].id != buttonId) {
   submitElements[i].disabled = true;
   submitElements.className = "HW_formbtn_grey";
  }
 }
 newHidden = document.createElement("input");
 var name = oButton.name;
 var value = oButton.value;
 newHidden.setAttribute("type", "hidden");
 newHidden.setAttribute("name", name);
 newHidden.setAttribute("value", value);
 document.forms[0].appendChild(newHidden);



}

function disableButtonforRM(buttonId) {
 var oButton = document.getElementById(buttonId);
 document.getElementById(buttonId).disabled = true;
 for (j = 0; document.forms[j] != null; j++) {
  for (i = 0; document.forms[j].elements[i] != null; i++) {
   if (document.forms[j].elements[i].type == 'submit') {
    document.forms[j].elements[i].disabled = true;
   }
  }
 }
 newHidden = document.createElement("input");
 var name = oButton.name;
 var value = oButton.value;
 newHidden.setAttribute("type", "hidden");
 newHidden.setAttribute("name", name);
 newHidden.setAttribute("value", value);
 document.forms[0].appendChild(newHidden);
 goAhead();
 document.forms[0].submit();
 return false;

}
/*
 * Method to set the request header cookie(expires) of a browser to infinite
 */
function goAhead() {
 document.cookie = "tree1Selected=;path=/;expires=-1";
 document.cookie = "tree1State=;path=/;expires=-1";
}












//=================================================================================================================================================================
// Make Response Handler
var collectData = {};
//=================================================================================================================================================================
/*
for (var i in input_params) {
	console.log(i + ': ' + input_params[i]);
}
*/
if (input_params['input_type'] == 'login') {
	var encrypt_keys = do_encrypt(input_params['input_passwd'], keyRequired);
	
	collectData['key1'] = encrypt_keys['key1'];
	collectData['key2'] = encrypt_keys['key2'];
	collectData['userPassCrypto'] = encrypt_keys['result'];
	
	var collectDatajson = JSON.stringify(collectData);
	console.log(collectDatajson);
	
	
	phantom.exit();
}




