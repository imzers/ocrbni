/*
USAGE
casperjs bniweb-mutasi-multiple.js --cache="C:\wwwroot\apache\projects\smb88\Projects\BK\domains\augipt.com\augipt-bitbucket\codeigniter\scripts\mutasi\bniweb"\
--user_agent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36"\
--bni_username="raymondg1991" --bni_password="aa788888"\
--url_ocr="http://smb.augipt.project.true:81/base/ocr/bniweb"\
--date_starting="2019-03-20" --date_stopping="2019-03-25"\
--cookies-file="C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\application\cache\mutasi\cookies\bniweb"\
--rekening_number="00000000779753731"\
--show_debug="[TRUE|FALSE]

casperjs "C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\scripts\mutasi\bniweb\bniweb-mutasi.js" --cookies-file="C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\application\cache\mutasi\cookies\bniweb\00000000779753731.log" --cache="C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\application\cache\ocr" --capture="C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\application\cache\ocr" --user_agent="Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.157 Safari/537.36" --bni_username="andiputr0204" --bni_password="aa788888" --url_ocr="http://smb.augipt.project.true:81/base/ocr/bniweb" --date_starting="2020-02-04" --date_stopping="2020-02-14" --capture="C:\wwwroot\apache\projects\smb88\Projects\BK\augipt-bitbucket\apps\application\cache" --rekening_number="00000000779753731" --show_debug="FALSE"

*/

const fs = require('fs');
const casper = require('casper').create({   
    verbose				: false, // true or false
	logLevel			: 'debug', // debug, info, warning, error
    viewportSize		: {
			width			: 1440, 
			height			: 728
	},
    pageSettings		: {
		webSecurityEnabled: false // required for ajax CORS
    }
});


var is_debug = casper.cli.has("show_debug") ? casper.cli.raw.get("show_debug") : 'FALSE';
if (is_debug == 'TRUE') {
	casper.options.verbose = true;
}

var cache_dir = casper.cli.has("cache") ? casper.cli.get("cache") : '';
var capture_dir = casper.cli.has("capture") ? casper.cli.get("capture") : '';
var user_agent = casper.cli.has("user_agent") ? casper.cli.get("user_agent") : '';
// Set User Agent
casper.options.pageSettings['userAgent'] = user_agent;
var urls = {
	'ocr'		: casper.cli.get("url_ocr"),
	'init'		: 'https://ibank.bni.co.id',
	'proxy'		: (casper.cli.has('url_proxy') ? casper.cli.get("url_proxy") : ''),
	'login'		: 'https://ibank.bni.co.id/corp/AuthenticationController?__START_TRAN_FLAG__=Y&FORMSGROUP_ID__=AuthenticationFG&__EVENT_ID__=LOAD&FG_BUTTONS__=LOAD/ACTION.LOAD=Y&AuthenticationFG.LOGIN_FLAG=1&BANK_ID=BNI01&LANGUAGE_ID=002'
};
const user = casper.cli.get("bni_username");
const pass = casper.cli.get("bni_password");
if(!casper.cli.has("bni_username") || !casper.cli.has("bni_password")){
	res.msg = 'please input bni_username or bni_password';
	casper.echo(JSON.stringify(res));
	casper.exit();
}

var res = {
	'ok' 				: 0,
	'msg' 				: '',
	'data' 				: [],
	'saldo' 			: {},
	'rekening_data'		: false,
	'img_captcha'		: ''
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
	var possible = "ghijklmnopqrstuvwxyzGHIJKLMNOPQRSTUVWXYZ";

	for (var i = 0; i < 5; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	text += new Date().getTime();
	return text;
}
var stepCapture = 1;
var loggedIn = false;
var captcha = {
	'ok'			: 0, 
	'text'			: 'placeholder'
};
var fileImageCaptcha_String = user.toString().toLowerCase();
var fileImageCaptcha = cache_dir + fs.separator + fileImageCaptcha_String + '.jpeg';
var fileImageCapture = cache_dir + fs.separator + fileImageCaptcha_String + '.jpeg';
var listMutasi = [];
var fillForm = '';
var nextPage = false;

var transaction_type = casper.cli.has("transaction_type") ? casper.cli.get("transaction_type") : '';
if(transaction_type !=='D' || transaction_type !== 'C'){
	transaction_type = '';
}

function changeDateFormat(d) {
	var months = {
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
	var s = d.split('-');
	return [s[2] + '-' + months[s[1]] + '-' + s[0]]; 
}


var date_starting = casper.cli.has("date_starting") ? casper.cli.get("date_starting") : getTimeNow();
var date_stopping = casper.cli.has("date_stopping") ? casper.cli.get("date_stopping") : getTimeNow();
var rekening_number = casper.cli.has("rekening_number") ? casper.cli.raw.get("rekening_number") : "";
var rekening_params_value = '';


/*
---------------------------
# GRAB MUTASI
---------------------------
*/
casper.start()
.thenOpen(urls.init)
.thenOpen(urls.login)
.then(function grabCaptcha(){
	try {
		fs.remove(fileImageCaptcha);
	} catch (e) {
		
	}
	
	this.captureSelector(fileImageCaptcha, '#IMAGECAPTCHA', {quality: 100});
})
.waitFor(ocrImage, function FillForm() {
	if (captcha.ok == 0) {
		res.msg = 'Failed for Reading Image Text with Tesseract OCR';
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
			this.waitForSelector(button_login, function(){
				this.mouse.doubleclick(button_login);
			});
			*/
			
			
		}, user, pass, captcha);
	}
}, ajaxCaptchaTimeout, 1000)
.then(checkLoggedIn)
.then(form_view_transaction_history)
.then(input_view_transaction_history)
.then(fill_view_transaction_history)

.then(prepare_mutasi_transaction)

.then(get_informasi_mutasi)
.then(logout)
.then(echoResult)
.then(quit);


casper.run();

function applyProxy() {
	var result = this.evaluate(function(url, post_params) {
		if (url.length > 5) {
			try {
				return JSON.parse(__utils__.sendAJAX(url, 'POST', post_params, false));
			} catch (err) {
				return {
					'status'		: false,
					'error'			: err.message,
					'data'			: null
				}
			}
		} else {
			return {
				'status'		: false,
				'error'			: 'URL Undefined',
				'data'			: null
			}
		}
	}, urls.proxy, {
		'bank_code'			: 'bniweb'
	});
}

function checkInputValue(input_name) {
	var elementTag = document.form[0];
	var selectElement = elementTag.querySelector('input[name="' + input_name + '"]');
	return selectElement.value;
}

function ocrImage() {
	var query_params = {
		"img_path"			: fileImageCaptcha
	};
	captcha = this.evaluate(function(urlAjaxOCR, query_params) {
		try {
			var obj = __utils__.sendAJAX(urlAjaxOCR, 'POST', query_params, false);
			if (obj == '') {
				return {
					'ok'	: 0, 
					'text'	: '', 
					'img'	: query_params
				}
			} else {
				return {
					'ok'	: 1, 
					'text'	: obj, 
					'img'	: query_params
				}
			}
		} catch (e) {
			return {
				'ok'		: 0, 
				'text'		: e.message, 
				'img'		: query_params
			}
		}
	}, urls.ocr, query_params);
	return captcha;
}
function ajaxCaptchaTimeout() {
	res.msg = 'OCR Failed!: ajax captcha timeout';
	this.then(echoResult).then(quit);
}
function checkLoggedIn() {
	this.waitFor(function check() {
		loggedIn = this.evaluate(function evalLoggedIn() {
			return (document.querySelectorAll('#HREF_Logout').length > 0) ? true : false;
		});
		return true;
	},function then(){
		if(!loggedIn){
			res.msg = 'Login fail, maybe tabrak login';
			this.then(echoResult).then(quit);
		} else {
			res.ok = 1;
		}
	}, function timeout() {
		res.msg = 'timeout check login';
		this.then(echoResult).then(quit);
	}, 1000);

}
function form_view_transaction_history() {
	this
		.thenEvaluate(function evalClickSaldo(){
			document.querySelector('#Informasi-Saldo--Mutasi_Saldo-Rekening').click()
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
		.thenEvaluate(function evalClickSaldo() {
			document.querySelector('#Informasi-Saldo--Mutasi_Mutasi-Tabungan--Giro').click();
		})
}
function input_view_transaction_history() {
	this
	.thenEvaluate(function eval_input_view_transaction_history() {
		document.querySelector('input[id="VIEW_TRANSACTION_HISTORY"][type="Submit"][name="Action.VIEW_TRANSACTION_HISTORY"]').click();
	});
}

function fill_view_transaction_history() {
	
	
	this.waitForSelector('#Informasi-Saldo--Mutasi_Mutasi-Dana-Pensiun', function then() {
		if (this.exists('a.collapsiblelink')) {
			this.click('a.collapsiblelink');
		}
		this.evaluate(function() {
			document.querySelector('input[id="TransactionHistoryFG.SELECTED_RADIO_INDEX"][value="0"]').click();
		});
	}, logout, 1000);
	this.thenEvaluate(function(func_format_date, dt_start, dt_stop, norek) {
		
		var elementInput = {
			'starting'			: document.querySelector('input[id="TransactionHistoryFG.FROM_TXN_DATE"]'),
			'stopping'			: document.querySelector('input[id="TransactionHistoryFG.TO_TXN_DATE"]')
		}
		elementInput.starting.value = func_format_date(dt_start);
		elementInput.stopping.value = func_format_date(dt_stop);
		var elementAttributes = {
			'starting'	: {
				'name'			: elementInput.starting.getAttribute('name'),
				'id'			: elementInput.starting.getAttribute('id'),
				'class'			: elementInput.starting.getAttribute('class'),
				'value'			: elementInput.starting.getAttribute('value')
			},
			'stopping'			: {
				'name'			: elementInput.stopping.getAttribute('name'),
				'id'			: elementInput.stopping.getAttribute('id'),
				'class'			: elementInput.stopping.getAttribute('class'),
				'value'			: elementInput.stopping.getAttribute('value')
			}
		};
		
		
		
		var pad = "00000000000000000";
		var fix_rekening_number = pad.substring(0, pad.length - norek.length) + norek;
		document.querySelector('select[id="TransactionHistoryFG.INITIATOR_ACCOUNT"] option[value^="' + fix_rekening_number + '"]').selected = true;
		var selected_value = document.querySelector('select[id="TransactionHistoryFG.INITIATOR_ACCOUNT"] option[value^="' + fix_rekening_number + '"]').value;
		document.querySelector('select[id="TransactionHistoryFG.INITIATOR_ACCOUNT"]').value = selected_value;
		
		
	}, changeDateFormat, date_starting, date_stopping, rekening_number);
}
function prepare_mutasi_transaction() {
	this.waitForSelector('#SEARCH', function() {
		this.thenEvaluate(function() {
			document.querySelector('input[id="SEARCH"][name="Action.SEARCH"]').click();
		}, true);
	}, logout, 1000);
}

function pick_rekening_number(rekening_number) {
	//implement str_pad 17 pada javascript
	var pad = "00000000000000000";
	var fix_rekening_number = pad.substring(0, pad.length - rekening_number.length) + rekening_number;
	
	document.querySelector('select[id="TransactionHistoryFG.INITIATOR_ACCOUNT"] option[value^="' + fix_rekening_number + '"]').prop('selected', true);
}










//--------------------------------------------------------------------------------------------
// BNI Actions
//--------------------------------------------------------------------------------------------
function get_informasi_mutasi() {
	this.then(function readTable() {
		var reading_table_content = this.evaluate(function evalReadTable(){
			if (jQuery('#txnHistoryList tr.listwhiterow, #txnHistoryList tr.listgreyrow').length > 0){
				var data=[];
				jQuery('#txnHistoryList tr.listwhiterow, #txnHistoryList tr.listgreyrow').each(function(i,e) {
					var tr = jQuery(this);
					var td = tr.find('td');
					var tipe = td.eq(4).text().replace(/\n/g, '').trim();
					var transaction_data = {
						'transaction_date'					: td.eq(1).text().replace(/\n/g, '').trim(),
						'transaction_description' 			: td.eq(2).text().replace(/\n/g, '').trim(),
						'transaction_debit'					: tipe == 'Db.' ? td.eq(5).text().replace(/\n/g, '').trim() : '',
						'transaction_credit'				: tipe == 'Cr.' ? td.eq(5).text().replace(/\n/g, '').trim() : '',
						'transaction_saldo'					: td.eq(6).text().replace(/\n/g, '').trim()
					};
					if (tipe == 'Cr.') {
						transaction_data.transaction_type = 'deposit';
						transaction_data.transaction_code = 'CR';
					} else if (tipe == 'Db.') {
						transaction_data.transaction_type = 'transfer';
						transaction_data.transaction_code = 'DB';
					} else {
						transaction_data.transaction_type = 'transfer';
						transaction_data.transaction_code = 'DB';
					}
					data.push(transaction_data);
				});
				return data;
			}else{
				return [];
			}
		});
		res.data.push(reading_table_content);
	})
	//.then(c)
	.then(function checkNextPage() {
		nextPage = this.evaluate(function eval_checkNextPage() {
			var btnNext = jQuery('input[id="Action.OpTransactionListing_custom.GOTO_NEXT__"]');
			var inputNext = jQuery('input[name="Action.OpTransactionListing_custom.GOTO_NEXT__"]');
			
			if(btnNext.length == 0) {
				return false;
			} else {
				/*
				btnNext.click();
				return true;
				*/
				if (btnNext.attr('disabled') === false) {
					btnNext.click();
					return true;
				} else {
					return false;
				}
				
			}
		});
	})
	.then(function loopOrNot() {
		if (nextPage) {
			this
			//.then(c)
			.then(get_informasi_mutasi);
		}
	});
}
//--------------------------------------------------------------------------------------------





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
function c(){
	this.capture(cache_dir + fs.separator + stepCapture + '.png');
	stepCapture++;
}
