/*
USAGE
casperjs bniweb.js --cache="C:\wwwroot\apache\projects\smb88\domains\augipt.com\BK\augipt-bitbucket\logs\cache\ocr"\
--user_agent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"\
--bni_username="ODAD1212" --bni_password="aa788888"\
--url_ocr="http://smb.augipt.project.true:81/mutasi/bank/readimg"\
--date_starting="2019-03-11" --date_stopping="2019-03-11"\
--cookies-file="[COOKIE_PATH]"

--user=ODAD1212 --pass=aa788888 --date_starting=2018-07-01 --date_stopping=2018-07-19
*/
var fs = require('fs');
var casper = require('casper').create({
    verbose				: false, // true or false
	logLevel			: 'debug', // debug, info, warning, error
    viewportSize		: {width: 1440, height: 1024},
    pageSettings		: {
		webSecurityEnabled: false // required for ajax cross domain
    }
});

var cache_dir = casper.cli.get("cache");
var user_agent = casper.cli.get("user_agent");
// Set User Agent
casper.options.pageSettings['userAgent'] = user_agent;
var urls = {
	'ocr'		: casper.cli.get("url_ocr"),
	'login'		: 'https://ibank.bni.co.id/',
	'longlogin'	: 'https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD/ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=002',
};
var user = casper.cli.get("bni_username");
var pass = casper.cli.get("bni_password");
if(!casper.cli.has("bni_username") || !casper.cli.has("bni_password")){
	res.msg = 'please input bni_username or bni_password';
	casper.echo(JSON.stringify(res));
	casper.exit();
}

var res = {
	ok : 0,
	msg : '',
	data : false,
	rekening_detail : []
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
var urlAjaxOCR = urls.ocr; //'http://128.199.227.172/bni/ocr-bni.php';
function make_random_string() {
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

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
var fileImageCaptcha = cache_dir + '/'+ make_random_string() +'.jpeg';
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

















/*
---------------------------
# GRAB REKENING
---------------------------
*/
casper.start()
.thenOpen(urlLogin)
.then(function grabCaptcha(){
	try {
		fs.remove(fileImageCaptcha);
	} catch (e) {
		
	}
	
	this.captureSelector(fileImageCaptcha, '#IMAGECAPTCHA', {quality: 100})
})
.waitFor(ocrImage, function then(){
	if (captcha.ok == 0) {
		res.msg = 'Gagal OCR: ' + captcha.text;
		this.then(echoResult).then(quit);
	} else {
		this.evaluate(function evalFillForm(user, pass, captcha){
			document.querySelector('input[id="AuthenticationFG.USER_PRINCIPAL"]').value = user;
			document.querySelector('input[type="password"]').value = pass;
			document.querySelector('select[id="AuthenticationFG.PREFERRED_LANGUAGE"]').value = '002'; 
			document.querySelector('select[id="AuthenticationFG.MENU_ID"]').value = 2; //menu rekening
			document.querySelector('input[id="AuthenticationFG.VERIFICATION_CODE"]').value = captcha.text; //captcha
			document.querySelector('input[type="submit"]').click();
			
		}, user, pass, captcha);
	}
}, ajaxCaptchaTimeout, 1000)
//.then(c)
.then(checkLoggedIn)
//.then(c)
.then(openInformasiRekening)
//.then(c)
.then(logout)
.then(echoResult)
.then(quit);

casper.run();












function ocrImage() {
	var query_params = {"img_path": fileImageCaptcha};
	captcha = this.evaluate(function(urlAjaxOCR, query_params) {
		try {
			var obj = __utils__.sendAJAX(urlAjaxOCR, 'POST', query_params, false);
			if (obj=='') {
				return {ok: 0, text: 'captcha kosong'};
			} else {
				return {ok: 1, text: obj};
			}
		} catch (e) {
			return {ok: 0, text: e.message}
		}
	}, urlAjaxOCR, query_params);
	return true;
}
function ajaxCaptchaTimeout() {
	res.msg = 'Gagal OCR: ajax captcha timeout';
	this.then(echoResult).then(quit);
}






//--------------
// BNI Actions
//--------------
function openInformasiRekening() {
	this.thenEvaluate(function evalClickInformasiRekening(){
		document.querySelector('#Informasi-Saldo--Mutasi_Saldo-Rekening').click()
	})
	.then(function getRekening() {
		var rekDetail = this.evaluate(function() {
			var datapush = [];
			if (document.querySelector('span[id="salutation"]') != null) {
				datapush.push(document.querySelector('span[id="salutation"]').textContent);
			}
			if (document.querySelector('span[id="firstName"]') != null) {
				datapush.push(document.querySelector('span[id="firstName"]').textContent);
			}
			if (document.querySelector('span[id="middleName"]') != null) {
				datapush.push(document.querySelector('span[id="middleName"]').textContent);
			}
			if (document.querySelector('span[id="lastName"]') != null) {
				datapush.push(document.querySelector('span[id="lastName"]').textContent);
			}
			
			return datapush;
		});
		var tempData = this.evaluate(function evalReadTable() {
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
		res.data = tempData;
		res.rekening_detail = rekDetail;
	})
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
	}, function timeout(){
		this.echo('timeout check login');
	},5000);

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
		.thenEvaluate(function logout3(){
			document.querySelector('.formbtn1 a').click() //kembali ke beranda. Nggak usah keknya
		})
		
	
	
}

function quit(){
	this.exit();
}
function c(){
	this.capture(stepCapture + '.png');
	stepCapture++;
}
