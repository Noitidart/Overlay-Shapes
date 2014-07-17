const {interfaces: Ci,	utils: Cu} = Components;
Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');
const ignoreFrames = false;
const hostPattern = 'bing.com'; //if a page load matches this host it will inject into it

function addDiv(theDoc) {
	Cu.reportError('addDiv host = ' + theDoc.location.host);
	if (!theDoc) { Cu.reportError('no doc!'); return; } //document not provided, it is undefined likely
	if(!(theDoc.location && theDoc.location.host.indexOf(hostPattern) > -1)) { Cu.reportError('location not match host:' + theDoc.location.host); return; }
	//if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; } //not html document, so its likely an xul document //you probably dont need this check, checking host is enought
	Cu.reportError('host pass');

	removeDiv(theDoc, true); //remove my div if it was already there, this is just a precaution
	
	//add your stuff here

	var btn = theDoc.querySelector('#sb_form_go');
	if (btn) {
	
		var elForPos = btn;
		var posLeft = 0;
		var posTop = 0;
		while (elForPos != btn.ownerDocument.documentElement) {
		  posLeft += elForPos.offsetLeft;
		  posTop += elForPos.offsetTop;
		  elForPos = elForPos.parentNode;
		}

		console.log('top=', posTop);
		console.log('left=', posLeft);
	
		var arrowLeft = posLeft + btn.offsetWidth;
		var arrowTop = posTop;
		var myDiv = theDoc.createElement('div');
		myDiv.setAttribute('id','my-div');
		myDiv.setAttribute('class','myoverlaystuff');
		myDiv.setAttribute('style','z-index:99999; transition:opacity 1s; opacity:0; position:absolute; font-weight:bold; font-size:40px; color:red; left:'+arrowLeft+'px; top:'+arrowTop+'px;');
		myDiv.innerHTML = '<img style="vertical-align:middle;" src="http://png.findicons.com/files/icons/66/ethereal/128/back.png">Click to Search';

		theDoc.documentElement.insertBefore(myDiv, theDoc.documentElement.childNodes[0]);
		myDiv.style.top = ((btn.offsetHeight / 2) + arrowTop - (myDiv.offsetHeight / 2)) + 'px';
		
		var animCss = theDoc.createElement('style');
		animCss.setAttribute('id', 'myDivCss');
		animCss.setAttribute('class','myoverlaystuff');
		animCss.innerHTML = '#my-div{ animation-duration:.75s; animation-name:bounce-left; animation-iteration-count:5; } @keyframes bounce-left { 0%{margin-left:0} 50%{margin-left:50px} 100%{margin-left:0} }';

		//Services.ww.activeWindow.alert('start fade in');
		myDiv.style.opacity = 1; //starts the fade in
		myDiv.addEventListener('transitionend', function() {
				//fade in finished
				myDiv.removeEventListener('transitionend', arguments.callee, false);
				//Services.ww.activeWindow.alert('fade in finished start bounce animation');
				//start animation
				theDoc.documentElement.appendChild(animCss);
		}, false);
		
		myDiv.addEventListener('animationend', function() {
			myDiv.removeEventListener('animationend', arguments.callee, false);
			//Services.ww.activeWindow.alert('animation finished, fade it out');
			myDiv.style.opacity = '0';
			myDiv.addEventListener('transitionend', function() {
				//fade out finished
				//Services.ww.activeWindow.alert('fade out finished');
				myDiv.removeEventListener('transitionend', arguments.callee, false);
				myDiv.style.display = 'none';
				animCss.parentNode.removeChild(animCss);
			}, false);
		}, false);
	
	}
}

function bingBtnEventListener(event) {
	var win = event.view;
	var doc = win.document;
	event.stopPropagation();
	event.preventDefault();
	event.returnValue = false;
	win.alert('you click on a bing logo! this is a function in the privelaged addon scope');
}

function removeDiv(theDoc, skipChecks) {
	//Cu.reportError('removeDiv');
	if (!skipChecks) {
		if (!theDoc) { Cu.reportError('no doc!'); return; } //document not provided, it is undefined likely
		if(!(theDoc.location && theDoc.location.host.indexOf(hostPattern) > -1)) { Cu.reportError('location not match host:' + theDoc.location.host); return; }
		//if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { Cu.reportError('not html doc'); return; } //not html document, so its likely an xul document //you probably dont need this check, checking host is enought
	}
	
	var myStuff = theDoc.querySelectorAll('.myoverlaystuff'); //test if myDiv is in the page
	if (myStuff.length > 0) {
		var alreadyThere = true;
	}
	if (alreadyThere) {
		//my stuff was found in the document so remove it
		[].forEach.call(myStuff, function(el) {
			el.parentNode.removeChild(el);
		});
	} else {
		//else its not there so no need to do anything
	}
}

function listenPageLoad(event) {
	var win = event.originalTarget.defaultView;
	var doc = win.document;
	Cu.reportError('page loaded loc = ' + doc.location);
	if (win.frameElement) {
		//its a frame
		Cu.reportError('its a frame');
		if (ignoreFrames) {
			return;//dont want to watch frames
		}
	}
	addDiv(doc);
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.addEventListener('DOMContentLoaded', listenPageLoad, false);
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					Cu.reportError('DOING tab: ' + i);
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					loadIntoContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				loadIntoContentWindowAndItsFrames(win);
			}
		} else {
			//window does not have gBrowser
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeEventListener('DOMContentLoaded', listenPageLoad, false);
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					Cu.reportError('DOING tab: ' + i);
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					unloadFromContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				unloadFromContentWindowAndItsFrames(win);
			}
		} else {
			//window does not have gBrowser
		}
	}
};
/*end - windowlistener*/

function loadIntoContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		addDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function unloadFromContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	Cu.reportError('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			Cu.reportError('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			Cu.reportError('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		removeDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function startup(aData, aReason) {
	windowListener.register();
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	windowListener.unregister();
}

function install() {}

function uninstall() {}