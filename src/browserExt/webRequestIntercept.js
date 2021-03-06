/*
	***** BEGIN LICENSE BLOCK *****
	
	Copyright © 2016 Center for History and New Media
					George Mason University, Fairfax, Virginia, USA
					http://zotero.org
	
	This file is part of Zotero.
	
	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with Zotero.  If not, see <http://www.gnu.org/licenses/>.
	
	***** END LICENSE BLOCK *****
*/

/**
 * Handles web request interception and header parsing
 */

(function() {

'use strict';

Zotero.WebRequestIntercept = {
	listeners: {
		beforeSendHeaders: [],
		headersReceived: [],
		errorOccurred: []
	},
	
	reqIDToReqHeaders: {},

	init: function() {
		// Ignore XHR because we use those to fetch intercepted resources
		let types = ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "ping", "other"];
		chrome.webRequest.onBeforeSendHeaders.addListener(Zotero.WebRequestIntercept.handleRequest('beforeSendHeaders'), {urls: ['<all_urls>'], types}, ['blocking', 'requestHeaders']);
		chrome.webRequest.onErrorOccurred.addListener(Zotero.WebRequestIntercept.removeRequestHeaders, {urls: ['<all_urls>'], types});
		chrome.webRequest.onCompleted.addListener(Zotero.WebRequestIntercept.removeRequestHeaders, {urls: ['<all_urls>'], types});
		chrome.webRequest.onHeadersReceived.addListener(Zotero.WebRequestIntercept.handleRequest('headersReceived'), {urls: ['<all_urls>'], types}, ['blocking', 'responseHeaders']);
		
		Zotero.WebRequestIntercept.addListener('beforeSendHeaders', Zotero.WebRequestIntercept.storeRequestHeaders)
	},
	
	storeRequestHeaders: function(details) {
		Zotero.WebRequestIntercept.reqIDToReqHeaders[details.requestId] = 
			Zotero.WebRequestIntercept.processHeaders(details.requestHeaders);
	},
	
	removeRequestHeaders: function(details) {
		delete Zotero.WebRequestIntercept.reqIDToReqHeaders[details.requestId];
	},
	
	/**
	 * Convert from webRequest.HttpHeaders array to a lowercased object.
	 * 
	 * headers = _processHeaders(details.requestHeaders)
	 * console.log(headers['accept-charset']) // utf-8
	 * 
	 * @param {Array} headerArray
	 * @return {Object} headers
	 */
	processHeaders: function(headerArray) {
		if (!Array.isArray(headerArray)) return headerArray;
		
		let headers = {};
		for (let header of headerArray) {
			headers[header.name.toLowerCase()] = header.value;
		}
		return headers;
	},
	
	handleRequest: function(requestType) {
		return function(details) {
			if (!Zotero.WebRequestIntercept.listeners[requestType].length) return;
		
			if (details.requestHeaders) {
				details.requestHeadersObject = Zotero.WebRequestIntercept.processHeaders(details.requestHeaders);
			}
			if (details.responseHeaders) {
				details.responseHeadersObject = Zotero.WebRequestIntercept.processHeaders(details.responseHeaders);
			}
			if (Zotero.WebRequestIntercept.reqIDToReqHeaders[details.requestId]) {
				details.requestHeadersObject = Zotero.WebRequestIntercept.reqIDToReqHeaders[details.requestId];
			}
			for (let listener of Zotero.WebRequestIntercept.listeners[requestType]) {
				let retVal = listener(details);
				if (retVal != undefined) {
					return retVal;
				}
			}
		}
	},
	
	addListener: function(requestType, listener) {
		if (Zotero.WebRequestIntercept.listeners[requestType] === undefined) {
			throw new Error(`Web request listener for '${requestType}' not allowed`);
		}
		if (typeof listener != 'function') {
			throw new Error(`Web request listener of type ${typeof listener} is not allowed`);
		}
		Zotero.WebRequestIntercept.listeners[requestType].push(listener)
	},
	
	removeListener: function(requestType, listener) {
		if (Zotero.WebRequestIntercept.listeners[requestType] === undefined) {
			throw new Error(`Web request listener for '${requestType}' not allowed`);
		}
		if (typeof listener != 'function') {
			throw new Error(`Web request listener of type ${typeof listener} is not allowed`);
		}
		let idx = Zotero.WebRequestIntercept.listeners[requestType].indexOf(listener);
		if (idx != -1) {
			Zotero.WebRequestIntercept.listeners[requestType].splice(idx, 1);
		}
	}
}

})();
