/**
 * $Revision$
 * $Date$
 *
 * Copyright (C) 2006 Jive Software. All rights reserved.
 *
 * This software is published under the terms of the GNU Public License (GPL),
 * a copy of which is included in this distribution.
 */

package org.jivesoftware.wildfire.gateway;

import org.xmpp.packet.JID;
import org.jivesoftware.wildfire.auth.AuthFactory;
import org.jivesoftware.util.NotFoundException;
import org.jivesoftware.util.Log;
import org.jivesoftware.database.DbConnectionManager;
import org.jivesoftware.database.JiveID;
import org.jivesoftware.database.SequenceManager;

import java.util.Date;
import java.sql.*;

/**
 * Contains information about the registration a user has made with an external transport.
 * Each registration includes a username and password used to login to the transport
 * as well as a registration date and last login date.<p>
 *
 * The password for the transport registration is stored in encrypted form using
 * the Wildfire password encryption key. See {@link AuthFactory#encryptPassword(String)}.
 *
 * @author Matt Tucker
 */
@JiveID(125)
public class Registration {

    private static final String INSERT_REGISTRATION =
            "INSERT INTO gatewayRegistration(registrationID, jid, transportType, " +
            "username, password, registrationDate) VALUES (?,?,?,?,?,?)";
    private static final String LOAD_REGISTRATION =
            "SELECT jid, transportType, username, password, registrationDate, lastLogin " +
            "FROM gatewayRegistration WHERE registrationID=?";
    private static final String SET_LAST_LOGIN =
            "UPDATE gatewayRegistration SET lastLogin=? WHERE registrationID=?";
    private static final String SET_PASSWORD =
            "UPDATE gatewayRegistration SET password=? WHERE registrationID=?";
    private static final String SET_USERNAME =
            "UPDATE gatewayRegistration SET username=? WHERE registrationID=?";

    private long registrationID;
    private JID jid;
    private TransportType transportType;
    private String username;
    private String password;
    private Date registrationDate;
    private Date lastLogin;

    /**
     * Creates a new registration.
     *
     * @param jid the JID of the user making the registration.
     * @param transportType the type of the transport.
     * @param username the username on the transport.
     * @param password the password on the transport.
     */
    public Registration(JID jid, TransportType transportType, String username, String password) {
        if (jid == null || transportType == null || username == null) {
            throw new NullPointerException("Arguments cannot be null.");
        }
        // Ensure that we store the bare JID.
        this.jid = new JID(jid.toBareJID());
        this.transportType = transportType;
        this.username = username;
        this.password = password;
        this.registrationDate = new Date();
        try {
            insertIntoDb();
        }
        catch (Exception e) {
            Log.error(e);
        }
    }

    /**
     * Loads an existing registration.
     *
     * @param registrationID the ID of the registration.
     * @throws NotFoundException if the registration could not be loaded.
     */
    public Registration(long registrationID)
            throws NotFoundException
    {
        this.registrationID = registrationID;
        loadFromDb();
    }

    /**
     * Returns the unique ID of the registration.
     *
     * @return the registration ID.
     */
    public long getRegistrationID() {
        return registrationID;
    }

    /**
     * Returns the JID of the user that made this registration.
     *
     * @return the JID of the user.
     */
    public JID getJID() {
        return jid;
    }

    /**
     * Returns the type of the transport.
     *
     * @return the transport type.
     */
    public TransportType getTransportType() {
        return transportType;
    }

    /**
     * Returns the username used for logging in to the transport.
     *
     * @return the username.
     */
    public String getUsername() {
        return username;
    }

    /**
     * Returns the password used for logging in to the transport.
     *
     * @return the password.
     */
    public String getPassword() {
        return password;
    }

    /**
     * Sets the password used for logging in to the transport.
     * @param password
     */
    public void setPassword(String password) {
        this.password = password;
        // The password is stored in encrypted form for improved security.
        String encryptedPassword = AuthFactory.encryptPassword(password);
        Connection con = null;
        PreparedStatement pstmt = null;
        try {
            con = DbConnectionManager.getConnection();
            pstmt = con.prepareStatement(SET_PASSWORD);
            if (password != null) {
                pstmt.setString(1, encryptedPassword);
            }
            else {
                pstmt.setNull(1, Types.VARCHAR);
            }
            pstmt.setLong(2, registrationID);
            pstmt.executeUpdate();
        }
        catch (SQLException sqle) {
            Log.error(sqle);
        }
        finally {
            DbConnectionManager.closeConnection(pstmt, con);
        }
    }

    /**
     * Sets the username used for logging in to the transport.
     * @param username
     */
    public void setUsername(String username) {
        this.username = username;
        Connection con = null;
        PreparedStatement pstmt = null;
        try {
            con = DbConnectionManager.getConnection();
            pstmt = con.prepareStatement(SET_USERNAME);
            if (username != null) {
                pstmt.setString(1, username);
            }
            else {
                pstmt.setNull(1, Types.VARCHAR);
            }
            pstmt.setLong(2, registrationID);
            pstmt.executeUpdate();
        }
        catch (SQLException sqle) {
            Log.error(sqle);
        }
        finally {
            DbConnectionManager.closeConnection(pstmt, con);
        }
    }

    /**
     * Returns the date that this transport registration was created.
     *
     * @return the date the registration was created.
     */
    public Date getRegistrationDate() {
        return registrationDate;
    }

    /**
     * Returns the date that the user last logged in to the transport using this
     * registration data, or <tt>null</tt> if the user has never logged in.
     *
     * @return the last login date.
     */
    public Date getLastLogin() {
        return lastLogin;
    }

    /**
     * Sets the data that the user last logged into the transport.
     *
     * @param lastLogin the last login date.
     */
    public void setLastLogin(Date lastLogin) {
        this.lastLogin = lastLogin;
        Connection con = null;
        PreparedStatement pstmt = null;
        try {
            con = DbConnectionManager.getConnection();
            pstmt = con.prepareStatement(SET_LAST_LOGIN);
            pstmt.setLong(1, lastLogin.getTime());
            pstmt.setLong(2, registrationID);
            pstmt.executeUpdate();
        }
        catch (SQLException sqle) {
            Log.error(sqle);
        }
        finally {
            DbConnectionManager.closeConnection(pstmt, con);
        }
    }

    public String toString() {
        return jid + ", " + transportType + ", " + username;
    }

    /**
     * Inserts a new registration into the database.
     */
    private void insertIntoDb() throws SQLException {
        this.registrationID = SequenceManager.nextID(this);
        Connection con = null;
        PreparedStatement pstmt = null;
        boolean abortTransaction = false;
        try {
            con = DbConnectionManager.getTransactionConnection();
            pstmt = con.prepareStatement(INSERT_REGISTRATION);
            pstmt.setLong(1, registrationID);
            pstmt.setString(2, jid.toString());
            pstmt.setString(3, transportType.name());
            pstmt.setString(4, username);
            if (password != null) {
                // The password is stored in encrypted form for improved security.
                String encryptedPassword = AuthFactory.encryptPassword(password);
                pstmt.setString(5, encryptedPassword);
            }
            else {
                pstmt.setNull(5, Types.VARCHAR);
            }
            pstmt.setLong(6, registrationDate.getTime());
            pstmt.executeUpdate();
        }
        catch (SQLException sqle) {
            abortTransaction = true;
            throw sqle;
        }
        finally {
            DbConnectionManager.closeTransactionConnection(pstmt, con, abortTransaction);
        }
    }

    private void loadFromDb() throws NotFoundException {
        Connection con = null;
        PreparedStatement pstmt = null;
        ResultSet rs = null;
        try {
            con = DbConnectionManager.getConnection();
            pstmt = con.prepareStatement(LOAD_REGISTRATION);
            pstmt.setLong(1, registrationID);
            rs = pstmt.executeQuery();
            if (!rs.next()) {
                throw new NotFoundException("Registration not found: " + registrationID);
            }
            this.jid = new JID(rs.getString(1));
            this.transportType = TransportType.valueOf(rs.getString(2));
            this.username = rs.getString(3);
            // The password is stored in encrypted form, so decrypt it.
            this.password = AuthFactory.decryptPassword(rs.getString(4));
            this.registrationDate = new Date(rs.getLong(5));
            long loginDate = rs.getLong(6);
            if (rs.wasNull()) {
                this.lastLogin = null;
            }
            else {
                this.lastLogin = new Date(loginDate);
            }
        }
        catch (SQLException sqle) {
            Log.error(sqle);
        }
        finally {
            DbConnectionManager.closeConnection(rs, pstmt, con);
        }
    }
}
