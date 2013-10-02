/**
 * $Revision $
 * $Date $
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
package com.rayo.core.xml.providers;

import java.net.URISyntaxException;

import org.dom4j.Document;
import org.dom4j.Element;
import org.dom4j.Namespace;
import org.dom4j.QName;

import com.rayo.core.verb.OnHookCommand;
import com.rayo.core.verb.OffHookCommand;
import com.rayo.core.verb.Handset;
import com.rayo.core.verb.SayCompleteEvent;
import com.rayo.core.verb.SayCompleteEvent.Reason;

public class HandsetProvider extends BaseProvider {

    // XML -> Object
    // ================================================================================

    private static final Namespace NAMESPACE = new Namespace("", "urn:xmpp:rayo:handset:1");
    private static final Namespace COMPLETE_NAMESPACE = new Namespace("", "urn:xmpp:rayo:handset:complete:1");

    private static final QName ONHOOK_QNAME = new QName("onhook", NAMESPACE);
    private static final QName OFFHOOK_QNAME = new QName("offhook", NAMESPACE);

    @Override
    protected Object processElement(Element element) throws Exception
    {
        if (ONHOOK_QNAME.equals(element.getQName())) {
            return buildOnHookCommand(element);

        } else if (OFFHOOK_QNAME.equals(element.getQName())) {
            return buildOffHookCommand(element);

        } else if (element.getNamespace().equals(RAYO_COMPONENT_NAMESPACE)) {
            return buildCompleteCommand(element);
        }
        return null;
    }

    private Object buildCompleteCommand(Element element) {

        Element reasonElement = (Element)element.elements().get(0);
    	String reasonValue = reasonElement.getName().toUpperCase();
        Reason reason = Reason.valueOf(reasonValue);

        SayCompleteEvent complete = new SayCompleteEvent();
        complete.setReason(reason);
        return complete;
    }


    private Object buildOffHookCommand(Element element) throws URISyntaxException {

        Handset handset = new  Handset(	element.attributeValue("cryptosuite"),
        								element.attributeValue("localcrypto"),
        								element.attributeValue("remotecrypto"),
        								element.attributeValue("codec"),
        								element.attributeValue("stereo"),
        								element.attributeValue("mixer"));

		OffHookCommand command = new OffHookCommand();
		command.setHandset(handset);

        return command;
    }

    private Object buildOnHookCommand(Element element) throws URISyntaxException {
        return new OnHookCommand();
    }

    // Object -> XML
    // ================================================================================

    @Override
    protected void generateDocument(Object object, Document document) throws Exception {

		if (object instanceof OnHookCommand) {
            createOnHookCommand((OnHookCommand) object, document);

        } else if (object instanceof OffHookCommand) {
            createOffHookCommand((OffHookCommand) object, document);

        } else if (object instanceof SayCompleteEvent) {
            createHandsetCompleteEvent((SayCompleteEvent) object, document);
        }
    }

    private void createOffHookCommand(OffHookCommand command, Document document) throws Exception {
		Handset handset = command.getHandset();

        Element root = document.addElement(new QName("offhook", NAMESPACE));
		root.addAttribute("cryptoSuite", handset.cryptoSuite);
		root.addAttribute("localCrypto", handset.localCrypto);
		root.addAttribute("remoteCrypto", handset.cryptoSuite);
		root.addAttribute("codec", handset.codec);
		root.addAttribute("stereo", handset.stereo);
		root.addAttribute("mixer", handset.mixer);
    }


    private void createOnHookCommand(OnHookCommand command, Document document) throws Exception {
        document.addElement(new QName("onhook", NAMESPACE));
    }

    private void createHandsetCompleteEvent(SayCompleteEvent event, Document document) throws Exception {
        addCompleteElement(document, event, COMPLETE_NAMESPACE);
    }
}
