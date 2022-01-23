/*
USAGE
casperjs bniweb-mutasi-multiple.js --cache="C:\wwwroot\apache\projects\smb88\Projects\BK\domains\augipt.com\augipt-bitbucket\codeigniter\scripts\mutasi\bniweb"\
--user_agent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"\
--bni_username="raymondg1991" --bni_password="aa788888"\
--url_ocr="http://smb.augipt.project.true:81/base/ocr/bniweb"\
--date_starting="2019-03-20" --date_stopping="2019-03-25"\
--cookies-file="C:\wwwroot\apache\projects\smb88\Projects\BK\domains\augipt.com\augipt-bitbucket\codeigniter\scripts\mutasi\bniweb"\
--rekening_number="00000000779753731"\
--show_debug="[TRUE|FALSE]

*/
var fs = require('fs');
var casper = require('casper').create({   
    verbose				: false, // true or false
	logLevel			: 'debug', // debug, info, warning, error
    viewportSize		: {width: 1440, height: 1024},
    pageSettings		: {
		webSecurityEnabled: false // required for ajax CORS
    }
});
var is_debug = casper.cli.has("show_debug") ? casper.cli.get("show_debug") : 'FALSE';
if (is_debug == 'TRUE') {
	casper.options.verbose = true;
}
var rekening_number = casper.cli.has("rekening_number") ? casper.cli.raw.get("rekening_number") : "";
var cache_dir = casper.cli.get("cache");
var user_agent = (casper.cli.has("user_agent") ? casper.cli.get("user_agent") : '');
// Set User Agent
casper.options.pageSettings['userAgent'] = user_agent;
var urls = {
	'ocr'		: (casper.cli.has("url_ocr") ? casper.cli.raw.get('url_ocr') : 'base/ocr/bniweb'),
	'init'		: 'https://ibank.bni.co.id',
	'login'		: 'https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD/ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=002'
};
var user = casper.cli.get("bni_username");
var pass = casper.cli.get("bni_password");


var res = {
	ok 					: 0,
	msg 				: '',
	data 				: [],
	saldo 				: {},
	rekening_data		: false
}

var month = {
	"01" : "Jan",
	"02" : "Feb",
	"03" : "Mar",
	"04" : "Apr",
	"05" : "May",
	"06" : "Jun",
	"07" : "Jul",
	"08" : "Aug",
	"09" : "Sep",
	"10" : "Oct",
	"11" : "Nov",
	"12" : "Dec"
}

var urlLogin = urls.login;
var urlAjaxOCR = urls.ocr;
function make_random_string() {
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	for (var i = 0; i < 5; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	text += new Date().getTime();
	return text;
}
var stepCapture = 1;
var loggedIn = false;
var captcha = {
	ok: 0, 
	text: 'placeholder'
};
var fileImageCaptcha_String = make_random_string();
var fileImageCaptcha = cache_dir + '/'+ fileImageCaptcha_String +'.jpeg';
var listMutasi = [];
var fillForm = '';
var nextPage = false;


var date_starting = casper.cli.has("date_starting") ? casper.cli.get("date_starting") : getTimeNow();
var date_stopping = casper.cli.has("date_stopping") ? casper.cli.get("date_stopping") : getTimeNow();
date_starting = changeDateFormat(date_starting);
date_stopping = changeDateFormat(date_stopping);

var rekening_number = casper.cli.has("rekening_number") ? casper.cli.raw.get("rekening_number") : "";









/*
---------------------------
# Solve Captcha
---------------------------
*/
casper.start()
.thenOpen(urls.init)
.thenOpen(urls.login)
.then(function grabCaptcha() {
	try {
		fs.remove(fileImageCaptcha);
	} catch (e) {
		
	}
	
	this.captureSelector(fileImageCaptcha, '#IMAGECAPTCHA', {quality: 100})
})
.waitFor(ocrImage, function() {
	if (captcha.ok == 0) {
		res.msg = 'OCR Cannot read image';
		this.then(echoResult).then(quit);
	} else {
		res.captcha = captcha;
		res.msg = 'Get Captcha';
		this.then(echoResult).then(quit);
	}
}, ajaxCaptchaTimeout, 1000);

casper.run();


function ocrImageCli() {
	this.then(function(image_name) {
		var fileImageCaptcha_String = image_name.toString();
		var spawn = require("child_process").spawn;
		var execFile = require("child_process").execFile;
		execFile("dir", ["/a"], null, function (err, stdout, stderr) {
			console.log("execFileSTDOUT:", stdout);
			console.log("execFileSTDERR:", stderr);
		});
		return {
			'ok'				: 0,
			'msg'				: false
		};
	}, fileImageCaptcha_String);
}
function ocrImage() {
	var query_params = {"img_path": fileImageCaptcha};
	captcha = this.evaluate(function(urlAjaxOCR, query_params) {
		try {
			var obj = __utils__.sendAJAX(urlAjaxOCR, 'POST', query_params, false);
			if (obj == '') {
				return {ok: 0, text: ''};
			} else {
				return {ok: 1, text: obj};
			}
		} catch (e) {
			return {ok: 0, text: e.message}
		}
	}, urlAjaxOCR, query_params);
	return captcha;
}
function ajaxCaptchaTimeout() {
	res.msg = 'OCR Failed!: ajax captcha timeout';
	this.then(echoResult).then(quit);
}
function checkLoggedIn(){
	this.waitFor(function check(){
		loggedIn = this.evaluate(function evalLoggedIn() {
			return (document.querySelectorAll('#HREF_Logout').length > 0) ? true : false;
		});
		return true;
	},function then(){
		if(!loggedIn){
			res.msg = 'login failed';
			this.then(echoResult).then(quit);
		}else{
			res.ok = 1;
		}
	}, function timeout() {
		this.echo('timeout check login');
	}, 1000);

}














function openForm() {
	this
		.thenEvaluate(function evalClickSaldo(){
			document.querySelector('#Informasi-Saldo--Mutasi_Mutasi-Tabungan--Giro').click()
		})
		.then(function getRekening() {
			var informasi_rekening = this.evaluate(function evalGetRekening() {
				if (jQuery('table[id^="ListingTable"] tr[id]').length > 0) {
					var rekening_data = [];
					jQuery('table[id^="ListingTable"] tr[id]').each(function(i, elm) {
						var td_span = [];
						var tdelm = jQuery(this);
						if (tdelm.find('*[id^="HREF_AccountSummaryFG"]').length > 0) {
							tdelm.find('*[id^="HREF_AccountSummaryFG"]').each(function(myind, myelm) {
								var span = jQuery(myelm);
								td_span.push({
									'id'			: span.attr('id'),
									'text'			: span.text(),
									'class'			: span.attr('class'),
									'value'			: span.attr('value')
								});
							});
						}
						rekening_data.push(td_span);
					});
					return rekening_data;
				} else {
					return false;
				}
			});
			res.rekening_data = informasi_rekening;
		})
		.then(function getSaldo(){
			res.saldo.saldoAkhir = this.evaluate(function evalGetSaldo(){
				return jQuery('table[id^="ListingTable"] tr[id] td:last').text().trim();
			});
		})
		//.thenEvaluate(function evalClickCategoryzation(){
		//	document.querySelector('#TRANSACTION_CATEGORIZATION').click()
		//})
		
}






function getTimeNow(){
	var dateObj = new Date();
	var month = dateObj.getMonth() + 1; //months from 1-12
	month = month < 10 ? '0' + month : month;
	var day = dateObj.getDate();
	day = day < 10 ? '0' + day : day;
	var year = dateObj.getFullYear();
	return year + "-" + month + "-" + day;
}

function changeDateFormat(d){
	var s = d.split('-');
	return [s[2]+'-'+month[s[1]]+'-'+s[0]]; 
}

function parsingMutasi(){
	res = JSON.parse(res);
}

function echoResult(){
	this.echo(JSON.stringify(res));
	return true;
}

function logout(){
	this
		.thenEvaluate(function logout1(){
			document.querySelector('#HREF_Logout').click() //click atas
		})
		.thenEvaluate(function logout2(){
			document.querySelector('#LOG_OUT').click() //click konfirmasi logout
		})
		/*
		.thenEvaluate(function logout3(){
			document.querySelector('.formbtn1 a').click() //kembali ke beranda. Nggak usah keknya
		})
		*/
		
	
	
}

function quit(){
	this.exit();
}
function c(){
	this.capture(stepCapture + '.png');
	stepCapture++;
}
