/**
 * RAYO : XMPP -0327 plugin for Strophe
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
Strophe.addConnectionPlugin('rayo', 
{
	_connection: null,

	init: function(conn) 
	{
		this._connection = conn;

		Strophe.addNamespace('RAYO_CORE', "urn:xmpp:rayo:1");
		Strophe.addNamespace('RAYO_CALL', "urn:xmpp:rayo:call:1");    
		Strophe.addNamespace('RAYO_MIXER', "urn:xmpp:rayo:mixer:1");     
		Strophe.addNamespace('RAYO_EXT', "urn:xmpp:rayo:ext:1");     
		Strophe.addNamespace('RAYO_EXT_COMPLETE', "urn:xmpp:rayo:ext:complete:1");     
		Strophe.addNamespace('RAYO_INPUT', "urn:xmpp:rayo:input:1");     
		Strophe.addNamespace('RAYO_INPUT_COMPLETE', "urn:xmpp:rayo:input:complete:1");    
		Strophe.addNamespace('RAYO_OUTPUT', "urn:xmpp:rayo:output:1");     
		Strophe.addNamespace('RAYO_OUTPUT_COMPLETE', "urn:xmpp:rayo:output:complete:1"); 
		Strophe.addNamespace('RAYO_PROMPT', "urn:xmpp:rayo:prompt:1");          
		Strophe.addNamespace('RAYO_RECORD', "urn:xmpp:rayo:record:1");     
		Strophe.addNamespace('RAYO_RECORD_COMPLETE', "urn:xmpp:rayo:record:complete:1");    
		Strophe.addNamespace('RAYO_SAY', "urn:xmpp:tropo:say:1");     
		Strophe.addNamespace('RAYO_SAY_COMPLETE', "urn:xmpp:tropo:say:complete:1");    
		Strophe.addNamespace('RAYO_HANDSET', "urn:xmpp:rayo:handset:1");     
		Strophe.addNamespace('RAYO_HANDSET_COMPLETE', "urn:xmpp:rayo:handset:complete:1");     

		this._connection.addHandler(this._handlePresence.bind(this), null,"presence", null, null, null);   
		
		console.log('Rayo plugin initialised');		
	},

	phone: function(callbacks)
	{
		this.callbacks = callbacks;
	},

	hangup: function(callId)
	{
		//console.log("hangup " + callId);
		
		var that = this;
		var iq = $iq({to: callId + "@rayo." + this._connection.domain, from: this._connection.jid, type: "get"}).c("hangup", {xmlns: Strophe.NS.RAYO_CORE});  

		//console.log(iq.toString());
			
		that._connection.sendIQ(iq, function(response)
		{
			//console.log(response);
			
			if ($(response).attr('type') != "result")
			{
				if (that.callbacks && that.callbacks.onError) that.callbacks.onError("hangup failure");
			}       	
		});
		
		this._onhook();		
	},

	digit: function(callId, key)
	{
		//console.log("digit " + callId + " " + key);
		
		var that = this;		
		var iq = $iq({to: callId + "@rayo." + this._connection.domain, from: this._connection.jid, type: "get"}).c("dtmf", {xmlns: Strophe.NS.RAYO_CORE, tones: key});  

		that._connection.sendIQ(iq, function(response)
		{
			if ($(response).attr('type') != "result")
			{
				if (that.callbacks && that.callbacks.onError) that.callbacks.onError("dtmf failure");
			}       	
		});			
	},
			
	answer: function(callId, mixer, headers)
	{
		//console.log('Rayo plugin accept ' + callId + " " + mixer);
		//console.log(headers)

		var that = this;
		
		//if (this._isOffhook()) this._onhook();

		this._offhook(mixer, headers, function()
		{
			var iq = $iq({to: callId + "@rayo." + that._connection.domain, from: that._connection.jid, type: "get"}).c("answer", {xmlns: Strophe.NS.RAYO_CORE});  

			if (headers)
			{	
				var hdrs = Object.getOwnPropertyNames(headers)

				for (var i=0; i< hdrs.length; i++)
				{
					var name = hdrs[i];
					var value = headers[name];

					iq.c("header", {name: name, value: value}).up(); 
				}
			}

			//console.log(iq.toString());

			that._connection.sendIQ(iq, function(response)
			{		
				if ($(response).attr('type') != "result")
				{
					if (that.callbacks && that.callbacks.onError) that.callbacks.onError("answer failure");
				}       	
			});
		});		
	},
	
	dial: function(from, to, headers)
	{
		//console.log('Rayo plugin dial ' + from + " " + to);
		//console.log(headers)
				
		var that = this;
		
		var mixer = "rayo-mixer-" + Math.random().toString(36).substr(2,9);		
		var callId = "rayo-call-" + Math.random().toString(36).substr(2,9);

		if (to.indexOf("xmpp:") == 0)
		{
			callId = Strophe.escapeNode(to.substring(5));
		}		

		//if (this._isOffhook()) this._onhook();
		
		this._offhook(mixer, headers, function()
		{
			var iq = $iq({to: "rayo." + that._connection.domain, from: that._connection.jid, type: "get"}).c("dial", {xmlns: Strophe.NS.RAYO_CORE, to: to, from: from});  

			iq.c("header", {name: "call-id", value: callId}).up(); 

			if (headers)
			{	
				var hdrs = Object.getOwnPropertyNames(headers)

				for (var i=0; i< hdrs.length; i++)
				{
					var name = hdrs[i];
					var value = headers[name];

					iq.c("header", {name: name, value: value}).up(); 
				}
			}

			//console.log(iq.toString());

			that._connection.sendIQ(iq, function(response)
			{		
				if ($(response).attr('type') != "result")
				{
					if (that.callbacks && that.callbacks.onError) that.callbacks.onError("dial failure");
				}       	
			});
		});
		

		return {		
			digit: function(tone) {that.digit(callId, tone);},
			hangup: function() {that.hangup(callId);},
			
			from: 	from,
			to:	to,	
			id:	callId
		}		
	},	
		

	_isOffhook: function() 
	{
		return this.localStream != null;
	},
	
	_offhook: function(mixer, headers, action) 
	{
		//console.log('Rayo plugin offhook ' + mixer);
		//console.log(headers);
		
		var that = this;

		navigator.webkitGetUserMedia({audio:true, video:false}, function(stream) 
		{
			that.localStream = stream;
			that._offhook1(mixer, headers, action);

		}, function(error) {
			
			if (that.callbacks && that.callbacks.onError) that.callbacks.onError(error);
		});    
	},
	
	_offhook1: function(mixer, headers, action)
	{
		//console.log('Rayo plugin _offhook1 ' + mixer);
		
		var that = this;
		that.pc1 = new webkitRTCPeerConnection(null);		
		that.pc2 = new webkitRTCPeerConnection(null);

		that.pc2.onaddstream = function(e)
		{
			that.audio = new Audio();
			that.audio.autoplay = true;	
			that.audio.src = webkitURL.createObjectURL(e.stream)
		};		
		
		that.pc1.addStream(that.localStream);

		that.pc1.createOffer(function(desc)
		{
			//console.log(desc.sdp);	
			that.pc1.setLocalDescription(desc);

			var sdpObj1 = WebrtcSDP.parseSDP(desc.sdp);
			sdpObj1.contents[0].codecs = [{clockrate: "48000", id: "111", name: "opus", channels: 2}];
			var sdp = WebrtcSDP.buildSDP(sdpObj1);
			//console.log(sdp);
			that.cryptoSuite = sdpObj1.contents[0].crypto['crypto-suite'];
			that.remoteCrypto = sdpObj1.contents[0].crypto['key-params'].substring(7);

			that.pc2.setRemoteDescription(new RTCSessionDescription({type: "offer", sdp : sdp}));		
			that.pc2.createAnswer(function(desc)
			{
				that.pc2.setLocalDescription(desc);

				var sdpObj2 = WebrtcSDP.parseSDP(desc.sdp);
				that.localCrypto = sdpObj2.contents[0].crypto['key-params'].substring(7);
				var sdp = WebrtcSDP.buildSDP(sdpObj2);
				//console.log(sdp);			
				that.pc1.setRemoteDescription(new RTCSessionDescription({type: "answer", sdp : sdp}));				
				that._offhook2(mixer, headers, action);

			});	
		});		
	},

	_offhook2: function(mixer, headers, action)
	{
		//console.log('Rayo plugin _offhook2 ' + this.cryptoSuite + " " + this.localCrypto + " " + this.remoteCrypto + " " + mixer);
		
		var that = this;
		var stereo = (headers && headers.stereo) ? headers.stereo : "0";
		var codec = (headers && headers.codec) ? headers.codec : "OPUS";		
		
		var iq = $iq({to: "rayo." + that._connection.domain, from: that._connection.jid, type: "get"}).c("offhook", {xmlns: Strophe.NS.RAYO_HANDSET, cryptoSuite: that.cryptoSuite, localCrypto: that.localCrypto, remoteCrypto: that.remoteCrypto, codec: codec, stereo: stereo, mixer: mixer});  
		
		//console.log(iq.toString())

		that._connection.sendIQ(iq, function(response)
		{
			if ($(response).attr('type') == "result")
			{			
				$('ref', response).each(function() 
				{
					that.handsetId = $(this).attr('id');
					that.handsetUri = $(this).attr('uri');
					that.relayHost = $(this).attr('host');
					that.relayLocalPort = $(this).attr('localport');
					that.relayRemotePort = $(this).attr('remoteport');

					that.pc2.addIceCandidate(new RTCIceCandidate({sdpMLineIndex: "0", candidate: "a=candidate:3707591233 1 udp 2113937151 " + that.relayHost + " " + that.relayRemotePort + " typ host generation 0"}));
					that.pc1.addIceCandidate(new RTCIceCandidate({sdpMLineIndex: "0", candidate: "a=candidate:3707591233 1 udp 2113937151 " + that.relayHost + " " + that.relayLocalPort + " typ host generation 0"}));				

					action();
				}); 

			} else {
				if (that.callbacks && that.callbacks.onError) that.callbacks.onError("offhook failure");				
			}
		}); 	
	},

	_onhook: function()
	{
		//console.log('Rayo plugin onhook ' + this.handsetId);
		
		that = this;	
		var server = this.handsetId + "@rayo." + this._connection.domain;
		
		this._connection.sendIQ($iq({to: server, from: this._connection.jid, type: "get"}).c('onhook', {xmlns: Strophe.NS.RAYO_HANDSET}), function(response)
		{
			that.localStream.stop();
			that.localStream = null;

			that.pc1.close();
			that.pc2.close();
			that.pc1 = null;
			that.pc2 = null;				
		});   
		
	},


	_handlePresence: function(presence) 
	{
		//console.log('Rayo plugin handlePresence');
		//console.log(presence);
		
		var that = this;
		var from = $(presence).attr('from');
		var headers = {}
		
		$(presence).find('header').each(function() 
		{		
			var name = $(this).attr('name');
			var value = $(this).attr('value');
			
			headers[name] = value;
		});
			

		$(presence).find('complete').each(function() 
		{		
			$(this).find('success').each(function() 
			{
				if ($(this).attr('xmlns') == Strophe.NS.RAYO_HANDSET_COMPLETE)
				{
					that._onhook();				
				}
			});
		});

		$(presence).find('offer').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{				
				var callFrom = $(this).attr('from');
				var callTo = $(this).attr('to');				
				var callId = Strophe.getNodeFromJid(from);
				
				var mixer = headers['mixer-name']
				
				var call = {		
					digit: 	function(tone) 	{that.digit(callId, tone);},
					hangup: function() 	{that.hangup(callId);},
					answer: function() 	{that.answer(callId, mixer, headers);},
					
					from: 	callFrom,
					to:	callTo,
					id:	callId
				}				

				if (that.callbacks && that.callbacks.onOffer) that.callbacks.onOffer(call, headers);
								
				var iq = $iq({to: from, from: that._connection.jid, type: "get"}).c("accept", {xmlns: Strophe.NS.RAYO_CORE});  

				var hdrs = Object.getOwnPropertyNames(headers)

				for (var i=0; i< hdrs.length; i++)
				{
					var name = hdrs[i];
					var value = headers[name];

					iq.c("header", {name: name, value: value}).up(); 
				}
			
				//console.log(iq.toString());

				that._connection.sendIQ(iq, function(response)
				{		
					if ($(response).attr('type') != "result")
					{
						if (that.callbacks && that.callbacks.onError) that.callbacks.onError("accept failure");
					}       	
				});				
			}
		})
		
		$(presence).find('joined').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{				

			}
		});
		
		$(presence).find('unjoined').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{				

			}
		});
		
		$(presence).find('started-speaking').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{				
				var callId = Strophe.getNodeFromJid(from);
				if (that.callbacks && that.callbacks.onSpeaking) that.callbacks.onSpeaking(callId, headers);
			}
		});		
		
		$(presence).find('stopped-speaking').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{				
				var callId = Strophe.getNodeFromJid(from);
				if (that.callbacks && that.callbacks.offSpeaking) that.callbacks.offSpeaking(callId, headers);
			}
		});
		
		$(presence).find('ringing').each(function() 
		{			
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{			
				var callId = Strophe.getNodeFromJid(from);
				if (that.callbacks && that.callbacks.onRing) that.callbacks.onRing(callId, headers);
			}
		});
		
		$(presence).find('answered').each(function() 
		{		
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{
				var callId = Strophe.getNodeFromJid(from);			
				
				if (headers['call-protocol'] == "WebRtc")
				{
					if (that.callbacks && that.callbacks.offHook) that.callbacks.offHook();	
					
				} else {
				
					if (that.callbacks && that.callbacks.onAnswer) that.callbacks.onAnswer(callId, headers);
				}				
			}
		});	
		
		$(presence).find('end').each(function() 
		{
			if ($(this).attr('xmlns') == Strophe.NS.RAYO_CORE)
			{			
				var callId = Strophe.getNodeFromJid(from);
				that._onhook();				
				
				if (that.callbacks && that.callbacks.onHook) that.callbacks.onHook();
				if (that.callbacks && that.callbacks.onEnd) that.callbacks.onEnd(callId, headers);				
			}
		});
		
		return true;
	}
});

;(function() {

    // Helper library to translate to and from SDP and an intermediate javascript object
    // representation of candidates, offers and answers

    _parseLine = function(line) {
        var s1 = line.split("=");
        return {
            type: s1[0],
            contents: s1[1]
        }
    }

    _parseA = function(attribute) {
        var s1 = attribute.split(":");
        return {
            key: s1[0],
            params: attribute.substring(attribute.indexOf(":")+1).split(" ")
        }
    }

    _parseM = function(media) {
        var s1 = media.split(" ");
        return {
            type:s1[0],
            port:s1[1],
            proto:s1[2],
            pts:media.substring((s1[0]+s1[1]+s1[2]).length+3).split(" ")
        }
    }

    _parseO = function(media) {
        var s1 = media.split(" ");
        return {
            username:s1[0],
            id:s1[1],
            ver:s1[2],
            nettype:s1[3],
            addrtype:s1[4],
            address:s1[5]
        }
    }

     _parseC = function(media) {
        var s1 = media.split(" ");
        return {
            nettype:s1[0],
            addrtype:s1[1],
            address:s1[2]
        }
    }

    _parseCandidate = function (params) {
        var candidate = {
            foundation:params[0],
            component:params[1],
            protocol:params[2],
            priority:params[3],
            ip:params[4],
            port:params[5]
        };
        var index = 6;
        while (index + 1 <= params.length) {
            if (params[index] == "typ") candidate["type"] = params[index+1];
            if (params[index] == "generation") candidate["generation"] = params[index+1];
            if (params[index] == "username") candidate["username"] = params[index+1];
            if (params[index] == "password") candidate["password"] = params[index+1];

            index += 2;
        }

        return candidate;
    }

    //a=rtcp:1 IN IP4 0.0.0.0
    _parseRtcp = function (params) {
        var rtcp = {
            port:params[0]
        };
        if (params.length > 1) {
            rtcp['nettype'] = params[1];
            rtcp['addrtype'] = params[2];
            rtcp['address'] = params[3];
        }
        return rtcp;
    }

    //a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:zvrxmXFpomTqz7CJYhN5G7JM3dVVxG/fZ0Il6DDo
    _parseCrypto = function(params) {
        var crypto = {
            'tag':params[0],
            'crypto-suite':params[1],
            'key-params':params[2]
        }
        return crypto;
    }
    _parseFingerprint = function(params) {
        var finger = {
            'hash':params[0],
            'print':params[1],
            'required':'1'
        }
        return finger;
    }

    //a=rtpmap:101 telephone-event/8000"
    _parseRtpmap = function(params) {
        var bits = params[1].split("/");
        var codec = {
            id: params[0],
            name: bits[0],
            clockrate: bits[1]
        }
        if (bits.length >2){
            codec.channels = bits[2];
        }
        return codec;
    }

    _parseSsrc = function(params, ssrc) {
        var ssrcObj = {};
        if (ssrc != undefined) ssrcObj = ssrc;
        ssrcObj.ssrc = params[0];
        var value = params[1];
        ssrcObj[value.split(":")[0]] = value.split(":")[1];
        return ssrcObj;
    }

    _parseGroup = function(params) {
        var group = {
            type: params[0]
        }
        group.contents = [];
        var index = 1;
        while (index + 1 <= params.length) {
            group.contents.push(params[index]);
            index = index + 1;
        }
        return group;
    }

    _parseMid = function(params) {
        var mid = params[0];
        return mid;
    }

    // Object -> SDP

    _buildCandidate = function(candidateObj, iceObj) {
        var c = candidateObj;
        var sdp = "a=candidate:" + c.foundation + " " +
            c.component + " " + 
            c.protocol.toUpperCase() + " " +
            c.priority + " " +
            c.ip + " " +
            c.port;
        if (c.type) sdp = sdp + " typ host"; //+ c.type;
        if (c.component == 1) sdp = sdp + " name rtp";
        if (c.component == 2) sdp = sdp + " name rtcp";
        sdp = sdp + " network_name en0";
        if (c.username && c.password ){
            sdp = sdp + " username "+c.username;
            sdp = sdp + " password "+c.password;
            if (!iceObj.ufrag)  iceObj.ufrag = c.username;
            if (!iceObj.pwd) iceObj.pwd=c.username;;
        } else if (iceObj) {
            if (iceObj.ufrag) sdp = sdp + " username " + iceObj.ufrag;
            if (iceObj.pwd) sdp = sdp + " password " + iceObj.pwd;
        } else {
            sdp = sdp+ " username root password mysecret";// I know a secret
        }
        if (c.generation) sdp = sdp + " generation " + c.generation;
        sdp = sdp + "\r\n";
        return sdp;
    }

    _buildCodec = function(codecObj) {
        var sdp = "a=rtpmap:" + codecObj.id + " " + codecObj.name + "/" + codecObj.clockrate 
        if (codecObj.channels){
            sdp+="/"+codecObj.channels;
        }
        sdp += "\r\n";
	if (codecObj.ptime){
	    sdp+="a=ptime:"+codecObj.ptime;
	    sdp += "\r\n";
        } else if (codecObj.name.toLowerCase().indexOf("opus")==0){
	    sdp+="a=ptime:20\r\n";
	    sdp+="a=fmtp:"+codecObj.id+" minptime=20 stereo=1\r\n";
	}
	if (codecObj.name.toLowerCase().indexOf("telephone-event")==0){
	    sdp+="a=fmtp:"+codecObj.id+" 0-15\r\n";
	}
        return sdp;
    }

    _buildCrypto = function(cryptoObj) {
        var sdp = "a=crypto:" + cryptoObj.tag + " " + cryptoObj['crypto-suite'] + " " + 
            cryptoObj["key-params"] + "\r\n";
        return sdp;
    }

    _buildFingerprint = function(fingerObj) {
        var sdp = "a=fingerprint:" + fingerObj.hash + " " + fingerObj.print + "\r\n";
        return sdp;
    }

    _buildIce= function(ice) {
	var sdp="";
        if (ice.ufrag) {
            if (!ice.filterLines) {
                sdp = sdp + "a=ice-ufrag:" + ice.ufrag + "\r\n";
                sdp = sdp + "a=ice-pwd:" + ice.pwd + "\r\n";
            }
            if (ice.options) {
                sdp = sdp + "a=ice-options:" + ice.options + "\r\n";
	    }
	}
	return sdp;
    }

    _buildSessProps = function(sdpObj) {
        var sdp ="";
        if (sdpObj.fingerprint) {
            sdp = sdp + _buildFingerprint(sdpObj.fingerprint);
        }
        if (sdpObj.ice) {
	    sdp= sdp + _buildIce(sdpObj.ice);
        }
        return sdp;
    }

    _buildMedia =function(sdpObj) {
        var sdp ="";
        sdp += "m=" + sdpObj.media.type + " " + sdpObj.media.port + " " + sdpObj.media.proto;
        var mi = 0;
        while (mi + 1 <= sdpObj.media.pts.length) {
            sdp = sdp + " " + sdpObj.media.pts[mi];
            mi = mi + 1;
        }
        sdp = sdp + "\r\n";
        
        if (sdpObj.connection) {
            sdp = sdp + "c=" + sdpObj.connection.nettype + " " + sdpObj.connection.addrtype + " " +
                sdpObj.connection.address + "\r\n";
        }
        
        if (sdpObj.mid) {
            sdp = sdp + "a=mid:" + sdpObj.mid + "\r\n";
        }

        if (sdpObj.rtcp) {
            sdp = sdp + "a=rtcp:" + sdpObj.rtcp.port + " " + sdpObj.rtcp.nettype + " " + 
                sdpObj.rtcp.addrtype + " " +
                sdpObj.rtcp.address + "\r\n";
        }
        if (sdpObj.ice) {
	    sdp= sdp + _buildIce(sdpObj.ice);
        }

        var ci = 0;
        while (ci + 1 <= sdpObj.candidates.length) {
            sdp = sdp + _buildCandidate(sdpObj.candidates[ci], sdpObj.ice);
            ci = ci + 1;
        }


        if (sdpObj.direction) {
            if (sdpObj.direction == "recvonly") {
                sdp = sdp + "a=recvonly\r\n";
            } else if (sdpObj.direction == "sendonly") {
                sdp = sdp + "a=sendonly\r\n";
            } else if (sdpObj.direction == "none") {
                sdp = sdp;
            } else {
               sdp = sdp + "a=sendrecv\r\n";
            }
		} else {
				sdp = sdp + "a=sendrecv\r\n";
		}



        if (sdpObj['rtcp-mux']) {
            sdp = sdp + "a=rtcp-mux" + "\r\n";
        } 
 
        if (sdpObj.crypto) {
            sdp = sdp + _buildCrypto(sdpObj.crypto);
        }
        if (sdpObj.fingerprint) {
            sdp = sdp + _buildFingerprint(sdpObj.fingerprint);
        }
 
        var cdi = 0;
        while (cdi + 1 <= sdpObj.codecs.length) {
            sdp = sdp + _buildCodec(sdpObj.codecs[cdi]);
            cdi = cdi + 1;
        }

        if (sdpObj.ssrc) {
            var ssrc = sdpObj.ssrc;
            if (ssrc.cname) sdp = sdp + "a=ssrc:" + ssrc.ssrc + " " + "cname:" + ssrc.cname + "\r\n";
            if (ssrc.mslabel) sdp = sdp + "a=ssrc:" + ssrc.ssrc + " " + "mslabel:" + ssrc.mslabel + "\r\n";
            if (ssrc.label) sdp = sdp + "a=ssrc:" + ssrc.ssrc + " " + "label:" + ssrc.label + "\r\n";
        }

        return sdp;
    }

    WebrtcSDP = {

	getAttributes: function(element) 
	{
		var res = {},
		attr;
		for(var i = 0, len = element.attributes.length; i < len; i++) {
		    if(element.attributes.hasOwnProperty(i)) {
			attr = element.attributes[i];
			res[attr.name] = attr.value;
		    }
		}
		return res;
	},
	
	each: function( object, callback, args ) 
	{
		var name, i = 0,
			length = object.length,
			isObj = length === undefined || $.isFunction(object);

		if ( args ) {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.apply( object[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( object[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( var value = object[0];
					i < length && callback.call( value, i, value ) !== false; value = object[++i] ) {}
			}
		}

		return object;
	},   

        buildJingle: function(jingle, blob) {
            var description = "urn:xmpp:jingle:apps:rtp:1";
            var c = jingle;
            if (blob.group) {
                var bundle = "";
                c.c('group', {type:blob.group.type,
                              contents:blob.group.contents.join(",")}).up();
            }

            WebrtcSDP.util.each(blob.contents, function () {
                var sdpObj = this;
                
                var desc = {xmlns:description,
                            media:sdpObj.media.type};

                if (sdpObj.ssrc) {
                    desc.ssrc = sdpObj.ssrc.ssrc,
                    desc.cname = sdpObj.ssrc.cname,
                    desc.mslabel = sdpObj.ssrc.mslabel,
                    desc.label = sdpObj.ssrc.label
                }

                if (sdpObj.mid) {
                    desc.mid = sdpObj.mid
                }

                if (sdpObj['rtcp-mux']) {
                    desc['rtcp-mux'] = sdpObj['rtcp-mux'];
                }

                c = c.c('content', {creator:"initiator"})
                .c('description', desc);
                
                WebrtcSDP.util.each(sdpObj.codecs, function() {
                    c = c.c('payload-type', this).up();           
                });
                
                if (sdpObj.crypto) {
                    c = c.c('encryption', {required: '1'}).c('crypto', sdpObj.crypto).up();    
                    c = c.up();
                }

                // Raw candidates
	        c = c.up().c('transport',{xmlns:"urn:xmpp:jingle:transports:raw-udp:1"});
                c = c.c('candidate', {component:'1',
                                      ip: sdpObj.connection.address,
                                      port: sdpObj.media.port}).up();
                if(sdpObj.rtcp) {
                    c = c.c('candidate', {component:'2',
                                      ip: sdpObj.rtcp.address,
                                      port: sdpObj.rtcp.port}).up();
                }
                c = c.up();

		// 3 places we might find ice creds - in order of priority:
		// candidate username
		// media level icefrag
		// session level icefrag
		var iceObj = {};
		if (sdpObj.candidates[0].username ){
			iceObj = {ufrag:sdpObj.candidates[0].username,pwd:sdpObj.candidates[0].password};
		} else if ((sdpObj.ice) && (sdpObj.ice.ufrag)){
			iceObj = sdpObj.ice;
		} else if ((blob.session.ice) && (blob.session.ice.ufrag)){
			iceObj = blob.session.ice;
		}
                // Ice candidates
                var transp = {xmlns:"urn:xmpp:jingle:transports:ice-udp:1",
                             pwd: iceObj.pwd,
                             ufrag: iceObj.ufrag};
                if (iceObj.options) {
                    transp.options = iceObj.options;
                }
	        c = c.c('transport',transp);
                WebrtcSDP.util.each(sdpObj.candidates, function() {
                    c = c.c('candidate', this).up();           
                });
		// two places to find the fingerprint
		// media 
		// session
		var fp = null;
		if (sdpObj.fingerprint) {
		    fp= sdpObj.fingerprint;
		}else if(blob.session.fingerprint){
		    fp = blob.session.fingerprint;
		}
                if (fp){
                    c = c.c('fingerprint',{xmlns:"urn:xmpp:tmp:jingle:apps:dtls:0",
				hash:fp.hash,
                                required:fp.required});
                    c.t(fp.print);
                    c.up();
		}
                c = c.up().up();
            });
            return c;
        },
        
        // jingle: Some Jingle to parse
        // Returns a js object representing the SDP
        
        parseJingle: function(jingle) {
            var blobObj = {};

            jingle.find('group').each(function () {
                blobObj.group = {};
                blobObj.group.type =  $(this).attr('type');
                blobObj.group.contents = $(this).attr('contents').split(",");
            });

            blobObj.contents = [];
            jingle.find('content').each(function () {
                var sdpObj = {};
                var mediaObj = {};
                mediaObj.pts = [];
                
                blobObj.contents.push(sdpObj);
                sdpObj.candidates = [];
                sdpObj.codecs = [];

                $(this).find('description').each(function () {
                  if($(this).attr('xmlns') == "urn:xmpp:jingle:apps:rtp:1"){
		    var mediaType = $(this).attr('media');
                    mediaObj.type = mediaType;
                    mediaObj.proto = "RTP/SAVPF"; // HACK
                    mediaObj.port = 1000;
                    var ssrcObj = {};
                    if ($(this).attr('ssrc')) {
                        ssrcObj.ssrc = $(this).attr('ssrc');
                        if ($(this).attr('cname')) ssrcObj.cname = $(this).attr('cname');
                        if ($(this).attr('mslabel')) ssrcObj.mslabel = $(this).attr('mslabel');
                        if ($(this).attr('label')) ssrcObj.label = $(this).attr('label');
                        sdpObj.ssrc = ssrcObj;
                    }
                    if ($(this).attr('rtcp-mux')) {
                        sdpObj['rtcp-mux'] = $(this).attr('rtcp-mux');
                    }
                    if ($(this).attr('mid')) {
                        sdpObj['mid'] = $(this).attr('mid');
                    }
                    sdpObj.media = mediaObj;
		    $(this).find('payload-type').each(function () {
                        var codec = WebrtcSDP.util.getAttributes(this);
                        //console.log("codec: "+JSON.stringify(codec,null," "));
                        sdpObj.codecs.push(codec);
                        mediaObj.pts.push(codec.id);
                    });
		  } else {
	            console.log("skip description with wrong xmlns: "+$(this).attr('xmlns'));
		  }
                });

                $(this).find('crypto').each(function () {
                    var crypto = WebrtcSDP.util.getAttributes(this);
                    //console.log("crypto: "+JSON.stringify(crypto,null," "));
                    sdpObj.crypto = crypto;
                });
                $(this).find('fingerprint').each(function () {
                    var fingerprint = WebrtcSDP.util.getAttributes(this);
                    fingerprint.print = Strophe.getText(this);
                    //console.log("fingerprint: "+JSON.stringify(fingerprint,null," "));
                    sdpObj.fingerprint = fingerprint;
                });
                sdpObj.ice = {};
                $(this).find('transport').each(function () {
                    if ($(this).attr('xmlns') == "urn:xmpp:jingle:transports:raw-udp:1") {
                        $(this).find('candidate').each(function () {
                            var candidate = WebrtcSDP.util.getAttributes(this);
                            //console.log("candidate: "+JSON.stringify(candidate,null," "));
                            if (candidate.component == "1") {
                                sdpObj.media.port = candidate.port;
                                sdpObj.connection = {};
                                sdpObj.connection.address = candidate.ip;
                                sdpObj.connection.addrtype = "IP4";
                                sdpObj.connection.nettype = "IN";
                            }
                            if (candidate.component == "2") {
                                sdpObj.rtcp = {};
                                sdpObj.rtcp.port = candidate.port;
                                sdpObj.rtcp.address = candidate.ip;
                                sdpObj.rtcp.addrtype = "IP4";
                                sdpObj.rtcp.nettype = "IN";
                            }
                        });
                    } 
                    if ($(this).attr('xmlns') == "urn:xmpp:jingle:transports:ice-udp:1") {
                        sdpObj.ice.pwd = $(this).attr('pwd');
                        sdpObj.ice.ufrag = $(this).attr('ufrag');
                        if ($(this).attr('options')) {
                            sdpObj.ice.options = $(this).attr('options');
                        }
                        $(this).find('candidate').each(function () {
                            var candidate = WebrtcSDP.util.getAttributes(this);
                            //console.log("candidate: "+JSON.stringify(candidate,null," "));
                            sdpObj.candidates.push(candidate);
                        });
                    }
                });
            });
            return blobObj;
        },
        
        dumpSDP: function(sdpString) {
            var sdpLines = sdpString.split("\r\n");
            for (var sdpLine in sdpLines) {
                //console.log(sdpLines[sdpLine]);
            }
        },

        // sdp: an SDP text string representing an offer or answer, missing candidates
        // Return an object representing the SDP in Jingle like constructs
        
        parseSDP: function(sdpString) {
            var contentsObj = {};
            contentsObj.contents = [];
            var sdpObj = null;

            // Iterate the lines
            var sdpLines = sdpString.split("\r\n");
            for (var sdpLine in sdpLines) {
                //console.log(sdpLines[sdpLine]);
                var line = _parseLine(sdpLines[sdpLine]);

                if (line.type == "o") {
                    contentsObj.session = _parseO(line.contents);
		    contentsObj.session.ice = {};
		    sdpObj = contentsObj.session;
                }
                if (line.type == "m") {
                    // New m-line, 
                    // create a new content
                    var media = _parseM(line.contents);
                    sdpObj = {};
                    sdpObj.candidates = [];
                    sdpObj.codecs = [];
                    sdpObj.ice = {};
                    if (contentsObj.session.fingerprint != null){
                        sdpObj.fingerprint = contentsObj.session.fingerprint;
                    }
                    sdpObj.media = media;
                    contentsObj.contents.push(sdpObj);
                }
                if (line.type == "c") {
                    if (sdpObj != null) {
                        sdpObj.connection = _parseC(line.contents);
                    } else {
                        contentsObj.connection = _parseC(line.contents);
                    }
                }
                if (line.type == "a") {
                    var a = _parseA(line.contents);
                    switch (a.key) {
                    case "candidate":
                        var candidate = _parseCandidate(a.params);
                        sdpObj.candidates.push(candidate);
                        break;
                    case "group":
                        var group = _parseGroup(a.params);
                        contentsObj.group = group;
                        break;
                    case "mid":
                        var mid = _parseMid(a.params);
                        sdpObj.mid = mid;
                        break;
                    case "rtcp":
                        var rtcp = _parseRtcp(a.params);
                        sdpObj.rtcp = rtcp;
                        break;
                    case "rtcp-mux":
                        sdpObj['rtcp-mux'] = true;
                        break;
                    case "rtpmap":
                        var codec = _parseRtpmap(a.params);
                        if (codec) sdpObj.codecs.push(codec);
                        break;
                    case "sendrecv":
                        sdpObj.direction = "sendrecv";
                        break;
                    case "sendonly":
                        sdpObj.direction = "sendonly";
                        break;
                    case "recvonly":
                        sdpObj.recvonly = "recvonly";
                        break;
                    case "ssrc":
                        sdpObj.ssrc = _parseSsrc(a.params, sdpObj.ssrc);
                        break;
                    case "fingerprint":
                        var print = _parseFingerprint(a.params);
                        sdpObj.fingerprint = print;
                        break;
                    case "crypto":
                        var crypto = _parseCrypto(a.params);
                        sdpObj.crypto = crypto;
                        break;
                    case "ice-ufrag":
                        sdpObj.ice.ufrag = a.params[0];
                        break;
                    case "ice-pwd":
                        sdpObj.ice.pwd = a.params[0];
                        break;
                    case "ice-options":
                        sdpObj.ice.options = a.params[0];
                        break;
                    }
                }

            }
            return contentsObj;
        },
        
        // sdp: an object representing the body
        // Return a text string in SDP format 
        
        buildSDP: function(contentsObj) {
            // Write some constant stuff
            var session = contentsObj.session;
            var sdp = 
                "v=0\r\n";
            if (contentsObj.session) {
                var session = contentsObj.session;
                sdp = sdp + "o=" + session.username + " " + session.id + " " + session.ver + " " + 
                session.nettype + " " + session.addrtype + " " + session.address + "\r\n"; 
            } else {
                var id = new Date().getTime();
                var ver = 2;
                sdp = sdp + "o=-" + " 3" + id + " " + ver + " IN IP4 192.67.4.14" + "\r\n"; // does the IP here matter ?!?
            }

            sdp = sdp + "s=-\r\n" + 
                "t=0 0\r\n";

            if (contentsObj.connection) {
                var connection = contentsObj.connection;
                sdp = sdp + "c=" + connection.nettype + " " + connection.addrtype + 
                    " " + connection.address + "\r\n";
            }
            if (contentsObj.group) {
                var group = contentsObj.group;
                sdp = sdp + "a=group:" + group.type;
                var ig = 0;
                while (ig + 1 <= group.contents.length) {
                    sdp = sdp + " " + group.contents[ig];
                    ig = ig + 1;
                }
                sdp = sdp + "\r\n";
            }

	    if (contentsObj.session){
	        sdp = sdp + _buildSessProps(contentsObj.session);
	    }
            var contents = contentsObj.contents;
            var ic = 0;
            while (ic + 1 <= contents.length) {
                var sdpObj = contents[ic];
                sdp = sdp + _buildMedia(sdpObj);
                ic = ic + 1;
            }
            return sdp;
        },

        // candidate: an SDP text string representing a cadidate
        // Return: an object representing the candidate in Jingle like constructs
        parseCandidate: function(candidateSDP) {
            var line = _parseLine(candidateSDP);
            return _parseCandidate(line.contents);
        },
        
        // candidate: an object representing the body
        // Return a text string in SDP format
        buildCandidate: function(candidateObj) {
            return _buildCandidate(candidateObj);
        }
    };
    
}());   
