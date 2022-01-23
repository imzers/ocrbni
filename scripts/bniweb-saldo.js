/*
USAGE
casperjs bniweb.js --cache="C:\wwwroot\apache\projects\smb88\domains\augipt.com\BK\augipt-bitbucket\logs\cache\ocr"\
--user_agent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"\
--bni_username="ODAD1212" --bni_password="aa788888"\
--url_ocr="http://smb.augipt.project.true:81/mutasi/bank/readimg"\
--date_starting="2019-03-11" --date_stopping="2019-03-11"\
--cookies-file="[COOKIE_PATH]"\
--rekening_number="[REKENING_NUMBER]"

*/
const fs = require('fs');
const proxy_data = {
	'protocol'			: function(cp) {
			return (cp.cli.has('proxy_protocol') ? cp.cli.raw.get('proxy_protocol') : 'http');
	},
	'host'			: function(cp) {
			return (cp.cli.has('proxy_host') ? cp.cli.raw.get('proxy_host') : '18.183.6.25');
	},
	'port'			: function(cp) {
			return (cp.cli.has('proxy_port') ? cp.cli.raw.get('proxy_port') : '9090');
	},
	'username'			: function(cp) {
			return (cp.cli.has('proxy_username') ? cp.cli.raw.get('proxy_username') : 'bksmb');
	},
	'password'			: function(cp) {
			return (cp.cli.has('proxy_password') ? cp.cli.raw.get('proxy_password') : 'smb88888');
	}
}
const casper = require('casper').create({
	verbose				: false, // true or false
	logLevel			: 'debug', // debug, info, warning, error
    viewportSize		: {
			width			: 1440, 
			height			: 728
	},
    pageSettings		: {
		webSecurityEnabled	: false, // required for ajax cross domain
    }
});





var cache_dir = casper.cli.get("cache");
var user_agent = casper.cli.get("user_agent");
// Set User Agent
casper.options.pageSettings['userAgent'] = user_agent;
var urls = {
	'ocr'		: casper.cli.get("url_ocr"),
	'proxy'		: (casper.cli.has('url_proxy') ? casper.cli.get("url_proxy") : ''),
	'init'		: 'https://ibank.bni.co.id',
	'login'		: 'https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD/ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=002',
	'captcha'	: (casper.cli.has("captcha_solver") ? casper.cli.get("captcha_solver") : 'http://api.bk.augipt.com:9292/solve'),
};
var user = casper.cli.get("bni_username");
var pass = casper.cli.get("bni_password");
if(!casper.cli.has("bni_username") || !casper.cli.has("bni_password")){
	res.msg = 'please input bni_username or bni_password';
	casper.echo(JSON.stringify(res));
	casper.exit();
}

var res = {
	ok					: 0,
	msg					: '',
	data				: false,
	cookies				: false
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
	'ok': 0, 
	'text': 'placeholder'
};
var fileImageCaptcha_String = user.toString().toLowerCase();
var fileImageCaptcha = cache_dir +  fs.separator + fileImageCaptcha_String + '.jpeg';
var listMutasi = [];
var fillForm = '';
var nextPage = false;

var norek = casper.cli.has("norek") ? casper.cli.raw.get("norek") : "";

var transaction_type = casper.cli.has("transaction_type") ? casper.cli.get("transaction_type") : '';
if(transaction_type !=='D' || transaction_type !== 'C'){
	transaction_type = '';
}
var date_starting = casper.cli.has("date_starting") ? casper.cli.get("date_starting") : getTimeNow();
var date_stopping = casper.cli.has("date_stopping") ? casper.cli.get("date_stopping") : getTimeNow();
date_starting = changeDateFormat(date_starting);
date_stopping = changeDateFormat(date_stopping);
var rekening_number = casper.cli.has("rekening_number") ? casper.cli.raw.get("rekening_number") : "";
var account_cookie_file = casper.cli.has('cookies-file') ? casper.cli.get('cookies-file') : '';

var stringCaptcha = {};
const capchaFilePath = (casper.cli.has("cache") ? casper.cli.raw.get("cache") : "");


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
	res.msg = 'Gagal OCR: ajax captcha timeout';
	this.then(echoResult).then(quit);
}


/*
---------------------------
# GRAB REKENING SALDO
---------------------------
*/
casper.start()
// .then(applyProxy)
.thenOpen(urls.init)
.thenOpen(urls.login)
.then(function grabCaptcha() {
	this.captureSelector(fileImageCaptcha, '#IMAGECAPTCHA', {quality: 100})
})
.waitFor(ocrImage, function evalOcrImage() {
	if (captcha.ok == 0) {
		res.msg = '[OCR Cannot reading captcha]: ' + JSON.stringify(captcha);
		this.then(echoResult).then(quit);
	} else {
		this.evaluate(function evalFillForm(user, pass, captcha) {
			document.querySelector('input[id="AuthenticationFG.USER_PRINCIPAL"]').value = user;
			document.querySelector('input[type="password"]').value = pass;
			document.querySelector('select[id="AuthenticationFG.PREFERRED_LANGUAGE"]').value = '002'; 
			document.querySelector('select[id="AuthenticationFG.MENU_ID"]').value = 2; //menu rekening
			document.querySelector('input[id="AuthenticationFG.VERIFICATION_CODE"]').value = captcha.text; //captcha
			document.querySelector('input[type="submit"]').click();
			/*
			const button_login = document.querySelector('input[type="submit"]');
			button_login.addEventListener('dblclick', function (e) {
				button_login.click();
			});
			this.waitForSelector(button_login, function(){
				this.mouse.doubleclick(button_login);
			});
			*/
		}, user, pass, captcha);
	}
}, ajaxCaptchaTimeout, 1000)
//.then(c)
.then(checkLoggedIn)
//.then(c)
.then(openInformasiRekening)
//.then(c)
.then(logout)
//.then(c)
.then(echoResult)
.then(quit);


casper.run();







function applyProxy() {
	var result = this.evaluate(function(url, post_params) {
		try {
			return JSON.parse(__utils__.sendAJAX(url, 'POST', post_params, false));
		} catch (err) {
			return {
				'status'		: false,
				'error'			: err.message,
				'data'			: null
			}
		}
		
	}, urls.proxy, {
		'bank_code'			: 'bniweb'
	});
}









//--------------
// BNI Actions
//--------------
function openInformasiRekening() {
	this.thenEvaluate(function evalClickInformasiRekening(){
		document.querySelector('#Informasi-Saldo--Mutasi_Saldo-Rekening').click()
	})
	.then(function getRekening() {
		var informasi_saldo_data = this.evaluate(function evalReadTable() {
			if (jQuery('table[id^="ListingTable"] tr[id]').length > 0) {
				var data = [];
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
					data.push(td_span);
				});
				return data;
			} else {
				return false;
			}
		});
		res.data = informasi_saldo_data;
	})
}






function checkLoggedIn() {
	this.waitFor(function check() {
		loggedIn = this.evaluate(function evalLoggedIn() {
			return (document.querySelectorAll('#HREF_Logout').length > 0) ? true : false;
		});
		return true;
	}, function chekIfLogged() {
		if (!loggedIn){
			res.msg = 'login failed while chekIfLogged function: checkLoggedIn()';
			this.then(echoResult).then(quit);
		}else{
			res.ok = 1;
		}
	}, function timeout(){
		this.echo('timeout check login');
	}, 1000);

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

function logout() {
	this
		.thenEvaluate(function logout_link(){
			document.querySelector('#HREF_Logout').click() //click atas
		})
		.thenEvaluate(function logout_submit(){
			document.querySelector('#LOG_OUT').click() //click konfirmasi logout
		})
		//.thenEvaluate(function logout3(){
		//	document.querySelector('.formbtn1 a').click() //kembali ke beranda. Nggak usah keknya
		//})
}

function quit(){
	this.exit();
}
function c() {
	this.capture(cache_dir + '/' + stepCapture + '.png');
	stepCapture++;
}
