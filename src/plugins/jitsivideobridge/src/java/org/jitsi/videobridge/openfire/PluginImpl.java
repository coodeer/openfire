/*
 * Jitsi Videobridge, OpenSource video conferencing.
 *
 * Distributable under LGPL license.
 * See terms of license at gnu.org.
 */
package org.jitsi.videobridge.openfire;

import java.io.*;
import java.lang.reflect.*;
import java.net.*;
import java.util.*;
import java.util.jar.*;

import org.jitsi.service.neomedia.*;
import org.jitsi.util.*;
import org.jitsi.videobridge.*;
import org.jivesoftware.openfire.container.*;
import org.jivesoftware.util.*;
import org.jivesoftware.openfire.http.HttpBindManager;
import org.slf4j.*;
import org.slf4j.Logger;
import org.xmpp.component.*;

import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.eclipse.jetty.webapp.WebAppContext;


/**
 * Implements <tt>org.jivesoftware.openfire.container.Plugin</tt> to integrate
 * Jitsi Video Bridge into Openfire.
 *
 * @author Lyubomir Marinov
 * @author Damian Minkov
 */
public class PluginImpl
    implements Plugin,
               PropertyEventListener
{
    /**
     * The logger.
     */
    private static final Logger Log = LoggerFactory.getLogger(PluginImpl.class);

    /**
     * The name of the property that contains the name of video conference application
     */
    public static final String CHECKREPLAY_PROPERTY_NAME
        = "org.jitsi.videobridge.video.srtpcryptocontext.checkreplay";

    /**
     * The name of the property that contains the name of video conference application
     */
    public static final String VIDEO_CONFERENCE_PROPERTY_NAME
        = "org.jitsi.videobridge.video.conference.name";

    /**
     * The name of the property that contains the maximum port number that we'd
     * like our RTP managers to bind upon.
     */
    public static final String MAX_PORT_NUMBER_PROPERTY_NAME
        = "org.jitsi.videobridge.media.MAX_PORT_NUMBER";

    /**
     * The name of the property that contains the minimum port number that we'd
     * like our RTP managers to bind upon.
     */
    public static final String MIN_PORT_NUMBER_PROPERTY_NAME
        = "org.jitsi.videobridge.media.MIN_PORT_NUMBER";

    /**
     * The minimum port number default value.
     */
    public static final int MIN_PORT_DEFAULT_VALUE = 50000;

    /**
     * The maximum port number default value.
     */
    public static final int MAX_PORT_DEFAULT_VALUE = 60000;

    /**
     * The Jabber component which has been added to {@link #componentManager}
     * i.e. Openfire.
     */
    private Component component;

    /**
     * The <tt>ComponentManager</tt> to which the {@link #component} of this
     * <tt>Plugin</tt> has been added.
     */
    private ComponentManager componentManager;

    /**
     * The subdomain of the address of {@link #component} with which it has been
     * added to {@link #componentManager}.
     */
    private String subdomain;

    /**
     * Destroys this <tt>Plugin</tt> i.e. releases the resources acquired by
     * this <tt>Plugin</tt> throughout its life up until now and prepares it for
     * garbage collection.
     *
     * @see Plugin#destroyPlugin()
     */
    public void destroyPlugin()
    {
        PropertyEventDispatcher.removeListener(this);

        if ((componentManager != null) && (subdomain != null))
        {
            try
            {
                componentManager.removeComponent(subdomain);
            }
            catch (ComponentException ce)
            {
                // TODO Auto-generated method stub
            }
            componentManager = null;
            subdomain = null;
            component = null;
        }
    }

    /**
     * Initializes this <tt>Plugin</tt>.
     *
     * @param manager the <tt>PluginManager</tt> which loads and manages this
     * <tt>Plugin</tt>
     * @param pluginDirectory the directory into which this <tt>Plugin</tt> is
     * located
     * @see Plugin#initializePlugin(PluginManager, File)
     */
    public void initializePlugin(PluginManager manager, File pluginDirectory)
    {
        PropertyEventDispatcher.addListener(this);

		System.setProperty("net.java.sip.communicator.SC_HOME_DIR_LOCATION", pluginDirectory.getPath());
		System.setProperty("net.java.sip.communicator.SC_HOME_DIR_NAME", ".");
		System.setProperty("org.jitsi.impl.neomedia.transform.srtp.SRTPCryptoContext.checkReplay", JiveGlobals.getProperty(CHECKREPLAY_PROPERTY_NAME, "false"));

		// start video conference web application

		try {
			String appName = JiveGlobals.getProperty(VIDEO_CONFERENCE_PROPERTY_NAME, "videobridge");
			Log.info("Initialize Web App " + appName);

			ContextHandlerCollection contexts = HttpBindManager.getInstance().getContexts();
			WebAppContext context = new WebAppContext(contexts, pluginDirectory.getPath(), "/" + appName);
			context.setWelcomeFiles(new String[]{"index.html"});

		}
		catch(Exception e) {
			Log.error( "Jitsi Videobridge web app initialize error", e);
		}


        // Let's check for custom configuration
        String maxVal = JiveGlobals.getProperty(MAX_PORT_NUMBER_PROPERTY_NAME);
        String minVal = JiveGlobals.getProperty(MIN_PORT_NUMBER_PROPERTY_NAME);

        if(maxVal != null)
            setIntProperty(
                DefaultStreamConnector.MAX_PORT_NUMBER_PROPERTY_NAME,
                maxVal);
        if(minVal != null)
            setIntProperty(
                DefaultStreamConnector.MIN_PORT_NUMBER_PROPERTY_NAME,
                minVal);

        checkNatives();

        ComponentManager componentManager
            = ComponentManagerFactory.getComponentManager();
        String subdomain = ComponentImpl.SUBDOMAIN;
        Component component = new ComponentImpl();
        boolean added = false;

        try
        {
            componentManager.addComponent(subdomain, component);
            added = true;
        }
        catch (ComponentException ce)
        {
            ce.printStackTrace(System.err);
        }
        if (added)
        {
            this.componentManager = componentManager;
            this.subdomain = subdomain;
            this.component = component;
        }
        else
        {
            this.componentManager = null;
            this.subdomain = null;
            this.component = null;
        }
    }

    /**
     * Checks whether we have folder with extracted natives, if missing
     * find the appropriate jar file and extract them. Normally this is
     * done once when plugin is installed or updated.
     * If folder with natives exist add it to the java.library.path so
     * libjitsi can use those native libs.
     */
    private void checkNatives()
    {
        // Find the root path of the class that will be our plugin lib folder.
        try
        {
            String binaryPath =
                (new URL(ComponentImpl.class.getProtectionDomain()
                    .getCodeSource().getLocation(), ".")).openConnection()
                    .getPermission().getName();

            File pluginJarfile = new File(binaryPath);
            File nativeLibFolder =
                new File(pluginJarfile.getParentFile(), "native");

            if(!nativeLibFolder.exists())
            {
                nativeLibFolder.mkdirs();

                // lets find the appropriate jar file to extract and
                // extract it
                String jarFileSuffix = null;
                if(OSUtils.IS_LINUX32)
                {
                    jarFileSuffix = "-native-linux-32.jar";
                }
                else if(OSUtils.IS_LINUX64)
                {
                    jarFileSuffix = "-native-linux-64.jar";
                }
                else if(OSUtils.IS_WINDOWS32)
                {
                    jarFileSuffix = "-native-windows-32.jar";
                }
                else if(OSUtils.IS_WINDOWS64)
                {
                    jarFileSuffix = "-native-windows-64.jar";
                }
                else if(OSUtils.IS_MAC)
                {
                    jarFileSuffix = "-native-macosx.jar";
                }

                String nativeLibsJarPath =
                    pluginJarfile.getCanonicalPath();
                nativeLibsJarPath =
                    nativeLibsJarPath.replaceFirst("\\.jar", jarFileSuffix);

                JarFile jar = new JarFile(nativeLibsJarPath);
                Enumeration en = jar.entries();
                while (en.hasMoreElements())
                {
                    try
                    {
                        JarEntry file = (JarEntry) en.nextElement();
                        File f = new File(nativeLibFolder, file.getName());
                        if (file.isDirectory())
                        {
                            continue;
                        }

                        InputStream is = jar.getInputStream(file);
                        FileOutputStream fos = new FileOutputStream(f);
                        while (is.available() > 0)
                        {
                            fos.write(is.read());
                        }
                        fos.close();
                        is.close();
                    }
                    catch(Throwable t)
                    {}
                }

                Log.info("Native lib folder created and natives extracted");
            }
            else
                Log.info("Native lib folder already exist.");

            String newLibPath =
                nativeLibFolder.getCanonicalPath() + File.pathSeparator +
                    System.getProperty("java.library.path");

            System.setProperty("java.library.path", newLibPath);

            // this will reload the new setting
            Field fieldSysPath = ClassLoader.class.getDeclaredField("sys_paths");
            fieldSysPath.setAccessible(true);
            fieldSysPath.set(System.class.getClassLoader(), null);
        }
        catch (Exception e)
        {
            Log.error(e.getMessage(), e);
        }
    }

    /**
     * Returns the value of max port if set or the default one.
     * @return the value of max port if set or the default one.
     */
    public String getMaxPort()
    {
        String val = System.getProperty(
            DefaultStreamConnector.MAX_PORT_NUMBER_PROPERTY_NAME);

        if(val != null)
            return val;
        else
            return String.valueOf(MAX_PORT_DEFAULT_VALUE);
    }

    /**
     * Returns the value of min port if set or the default one.
     * @return the value of min port if set or the default one.
     */
    public String getMinPort()
    {
        String val = System.getProperty(
            DefaultStreamConnector.MIN_PORT_NUMBER_PROPERTY_NAME);

        if(val != null)
            return val;
        else
            return String.valueOf(MIN_PORT_DEFAULT_VALUE);
    }

    /**
     * A property was set. The parameter map <tt>params</tt> will contain the
     * the value of the property under the key <tt>value</tt>.
     *
     * @param property the name of the property.
     * @param params event parameters.
     */
    public void propertySet(String property, Map params)
    {
        if(property.equals(MAX_PORT_NUMBER_PROPERTY_NAME))
        {
            setIntProperty(
                DefaultStreamConnector.MAX_PORT_NUMBER_PROPERTY_NAME,
                (String)params.get("value"));
        }
        else if(property.equals(MIN_PORT_NUMBER_PROPERTY_NAME))
        {
            setIntProperty(
                DefaultStreamConnector.MIN_PORT_NUMBER_PROPERTY_NAME,
                (String)params.get("value"));
        }
    }

    /**
     * Sets int property.
     * @param property the property name.
     * @param value the value to change.
     */
    private void setIntProperty(String property, String value)
    {
        try
        {
            // let's just check that value is integer
            int port = Integer.valueOf(value);

            if(port >= 1 && port <= 65535)
                System.setProperty(property, value);
        }
        catch(NumberFormatException ex)
        {
            Log.error("Error setting port", ex);
        }
    }

    /**
     * A property was deleted.
     *
     * @param property the name of the property deleted.
     * @param params event parameters.
     */
    public void propertyDeleted(String property, Map params)
    {
        if(property.equals(MAX_PORT_NUMBER_PROPERTY_NAME))
        {
            System.setProperty(
                DefaultStreamConnector.MAX_PORT_NUMBER_PROPERTY_NAME,
                String.valueOf(MAX_PORT_DEFAULT_VALUE));
        }
        else if(property.equals(MIN_PORT_NUMBER_PROPERTY_NAME))
        {
            System.setProperty(
                DefaultStreamConnector.MIN_PORT_NUMBER_PROPERTY_NAME,
                String.valueOf(MIN_PORT_DEFAULT_VALUE));
        }
    }

    /**
     * An XML property was set. The parameter map <tt>params</tt> will contain the
     * the value of the property under the key <tt>value</tt>.
     *
     * @param property the name of the property.
     * @param params event parameters.
     */
    public void xmlPropertySet(String property, Map params)
    {
        propertySet(property, params);
    }

    /**
     * An XML property was deleted.
     *
     * @param property the name of the property.
     * @param params event parameters.
     */
    public void xmlPropertyDeleted(String property, Map params)
    {
        propertyDeleted(property, params);
    }

}
