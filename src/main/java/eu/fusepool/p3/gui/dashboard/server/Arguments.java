package eu.fusepool.p3.gui.dashboard.server;

import org.wymiwyg.commons.util.arguments.ArgumentsWithHelp;
import org.wymiwyg.commons.util.arguments.CommandLine;

/**
 *
 * @author Gabor
 */
public interface Arguments extends ArgumentsWithHelp {

    @CommandLine(longName = "port", shortName = {"P"}, required = false,
            defaultValue = "8200",
            description = "The port on which the proxy shall listen")
    public int getPort();
}
