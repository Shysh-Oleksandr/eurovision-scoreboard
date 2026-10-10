package app.douzepoints;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;

/**
 * Saves a generated file where Android users look for it: images to
 * Pictures/DouzePoints (the gallery), anything else to Download/DouzePoints.
 * Uses MediaStore, which needs no storage permission on Android 10+; older
 * versions report "unavailable" and the app falls back to the share sheet
 * (src/native/nativeShare.ts).
 */
@CapacitorPlugin(name = "MediaSaver")
public class MediaSaverPlugin extends Plugin {

    private static final String FOLDER = "DouzePoints";

    @PluginMethod
    public void save(PluginCall call) {
        String data = call.getString("data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/octet-stream");

        if (data == null || fileName == null) {
            call.reject("data and fileName are required");
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.unavailable("Saving to shared storage needs Android 10");
            return;
        }

        boolean isImage = mimeType.startsWith("image/");
        Uri collection = isImage
            ? MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            : MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);

        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
        values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
        values.put(
            MediaStore.MediaColumns.RELATIVE_PATH,
            (isImage ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS) + "/" + FOLDER
        );
        values.put(MediaStore.MediaColumns.IS_PENDING, 1);

        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = resolver.insert(collection, values);

        if (uri == null) {
            call.reject("Could not create the file");
            return;
        }

        try (OutputStream out = resolver.openOutputStream(uri)) {
            if (out == null) throw new IllegalStateException("No output stream");
            out.write(Base64.decode(data, Base64.DEFAULT));
        } catch (Exception e) {
            resolver.delete(uri, null, null);
            call.reject("Could not write the file", e);
            return;
        }

        values.clear();
        values.put(MediaStore.MediaColumns.IS_PENDING, 0);
        resolver.update(uri, values, null, null);

        JSObject result = new JSObject();
        result.put("uri", uri.toString());
        result.put("folder", (isImage ? Environment.DIRECTORY_PICTURES : Environment.DIRECTORY_DOWNLOADS) + "/" + FOLDER);
        call.resolve(result);
    }
}
