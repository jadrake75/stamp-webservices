﻿# stamp-webservices

## Build Status

![Build Status](https://drake-server.ddns.net/build/stamp-webservices.svg)

## Configuring the system
While many parameters can be passed on the command line to the server, it is recommended to utilize config/application.json to store 
the properties of the system.  An example file config/application-example.json is provided to give an idea of the flavor of configuration.

### Users file
By default if basic authentication is used, a file config/users.json is leveraged to obtain user information.  This file can be located anywhere and set using the --password_file argument on server startup.  The file is expected to be a simple JSON array of users defined as a (id,username,password).
 
## Initialize Database Tables
The database tables reflecting the schema of the application are available in the script "create-tables.sql".  You should be able to execute this
against a new schema and it will create all the tables, constraints and triggers necessary.


## Logging

The following are the logger names supports by stamp-webservices
  * server - server related messages (INFO default)
  * connection - MySQL related connection messages (INFO default)
  * sql - MySQL query related messages displaying the actual statements (INFO default)

The logging levels can be set for both the tests and server at execution time with a command line argument.  The format is as follows:

  * --[loggerName]_level=[all|error|warn|info|debug|trace]
  
As well, a small web-service is available to toggle this on the fly under the path /config/loggers/[loggerName]?level=debug

## Executing Tests

The tests will require mocha to be installed.  It is recommended to install mocha globally with the -g flag

  * npm install -g mocha

Some of the tests (especially the web-service tests) may take longer than the 2000ms maximum time that mocha imposes by default to execute a test and commit done.  The following settings have worked reasonable well on my development system:

  * mocha test --timeout 6000 --sql_level error

by changing the sql_level you can quickly toggle the tests to use a different logging level.

By default, the integration tests will look for a database in application.json called "test".  This can be overridden using the test_database parameter.  The parameters recognized by the integration tests include:

  * --port xxxx (default is 9002) - the port to execute the forked NodeJS server.
  * --hostname xxxx (default is localhost) - the hostname to connect to the server 
  * --test_database xxxx (default is test) - the database (in application.json) to use for registering the test NodeJS server.
  * --sql_level xxxx - the SQL tracing level

## Running the Server

The server uses a clustered domain to execute multiple threads bound to the same TCPIP port.  By default the server will start on thread per OS reported CPU.  This can be overridden at startup using the --cpu flag described below.

### Executing a single threaded server (useful for testing/debugging etc.)

To execute the single threaded server, run the following command:

  * node app/server/server.js [options]

### Executing the multi-threaded cluster server

  * node app/server/server-manager.js [options]

The following are the supported options:

  * --cpu x (only applies to server-manager) - the number of CPU threads to start
  * --port xxxx - The port to bind the HTTP server to
  * --basePath xxxx - The "web-app" name to use for the server (defaults to "stamp-webservices")
  * --xxx_logger yyy - set the logger xxx to level yyy
  * --database xxx - the named database defined in config/application.json
  * --db_password xxx - the password to use for the database connection if not defined in the application.json and prompt is undesired.
  * --authentication xxx - the authentication scheme to use (currently supported as "none" or "basic")
  * --password_file xxx - the authentication users file (for basic authentication) (defaults to "config/users.json")
  * --httpOnly - will run the server as HTTP even when HTTPS certificates are configurated

### Configuring HTTPS

Obtain a certificate for your application.  Edit the file config/application.json and add the section "Certificates" with
child key values of "CertificateFile" and "CertificateKeyFile" both pointing to the location of the .crt and .key files 
respectfully.  The server will automatically startup in HTTPS mode unless the flag "--httpOnly" has been set.

See application-example.json for the configuration format.


## Code Coverage

Istanbul should be installed globally via "npm install -g istanbul".
If mocha is installed locally you can execute the mocha tests with istanbul code coverage.

  * istanbul cover node_modules/mocha/bin/_mocha -- --ui bdd -R spec -t 6000

