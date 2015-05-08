P3 Dashboard
===============

Fusepool P3 dashboard running in Jetty.

###Install and run

Compile the source code and start the application with

    mvn clean install exec:java -Dexec.args="-P <port>"

`-P` sets the port (optional)

###Usage

In a browser go to [http://localhost:8200/](http://localhost:8200/).

You can optionally specify te URI of the platorm to ve used with the query parameter `platformURI`, e.g. http://localhost:8200/?platform=http://localhost:8181/ldp/platform
