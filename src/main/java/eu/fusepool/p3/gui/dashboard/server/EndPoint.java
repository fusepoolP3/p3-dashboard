package eu.fusepool.p3.gui.dashboard.server;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.activation.MimeType;
import javax.activation.MimeTypeParseException;
import javax.ws.rs.Consumes;
import javax.ws.rs.FormParam;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;

/**
 *
 * @author Gabor
 */
@Path("")
public class EndPoint {

    @GET
    @Path("/test")
    @Produces(MediaType.APPLICATION_JSON)
    public String get() {
        return "test";
    }

    @POST
    @Path("/proxy")
    @Consumes(MediaType.APPLICATION_FORM_URLENCODED)
    @Produces(MediaType.TEXT_HTML)
    public Response process(@FormParam("widgetURI") String widgetURI, @FormParam("sourceURI") String sourceURI) {
        HttpURLConnection connection = null;

        try {
            URL url = new URL(sourceURI);
            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("GET");

            connection.setUseCaches(false);
            connection.setDoInput(true);

            final String fileName = connection.getHeaderField("Content-Disposition");
            final MimeType mimeType = new MimeType(connection.getContentType());
            final byte[] content = IOUtils.toByteArray(connection.getInputStream());

            url = new URL(widgetURI);

            connection = (HttpURLConnection) url.openConnection();

            connection.setRequestMethod("POST");
            if (!StringUtils.isEmpty(fileName)) {
                connection.setRequestProperty("Slug", fileName);
            }
            connection.setRequestProperty("Content-Type", mimeType.toString());
            connection.setRequestProperty("Content-Length", Integer.toString(content.length));

            connection.setUseCaches(false);
            connection.setDoInput(true);
            connection.setDoOutput(true);

            try (DataOutputStream outputStream = new DataOutputStream(connection.getOutputStream())) {
                outputStream.write(content);
                outputStream.flush();
            }

            String response;
            try (InputStream inputStream = connection.getInputStream()) {
                response = IOUtils.toString(inputStream, "UTF-8");
            }

            return Response.status(Response.Status.OK).entity(response).build();
        } catch (RuntimeException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        } catch (IOException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        } catch (MimeTypeParseException e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(e.getMessage()).build();
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
